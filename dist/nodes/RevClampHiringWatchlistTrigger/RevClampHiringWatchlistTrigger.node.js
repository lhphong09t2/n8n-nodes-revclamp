let NodeApiError;
try {
  ({ NodeApiError } = require('n8n-workflow'));
} catch {
  NodeApiError = class NodeApiError extends Error {
    constructor(node, errorResponse, options = {}) {
      const rawMsg =
        (options && options.message) ||
        (errorResponse &&
          typeof errorResponse === 'object' &&
          (errorResponse.message ||
            (errorResponse.response &&
              errorResponse.response.body &&
              (errorResponse.response.body.message || errorResponse.response.body.error)))) ||
        String(errorResponse || 'API request failed');
      super(String(rawMsg));
      this.name = 'NodeApiError';
      this.node = node;
      this.httpCode =
        String(
          (options && options.httpCode) ||
            (errorResponse &&
              (errorResponse.httpCode ||
                errorResponse.statusCode ||
                (errorResponse.response && errorResponse.response.statusCode))) ||
            ''
        ) || null;
      this.description =
        (options && options.description) ||
        (errorResponse &&
          errorResponse.response &&
          errorResponse.response.body &&
          (errorResponse.response.body.error || errorResponse.response.body.upgrade_url)) ||
        undefined;
      this.cause = errorResponse;
    }
  };
}

function computeNonSecretCredentialTag(rawKey) {
  const s = String(rawKey || '').trim();
  if (!s) return 'anon';
  let h1 = 0x811c9dc5;
  let h2 = 0x811c9dc5 ^ 0x9e3779b9;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 ^= c;
    h1 = Math.imul(h1, 0x01000193) >>> 0;
    h2 ^= c ^ (i & 0xff);
    h2 = Math.imul(h2, 0x85ebca6b) >>> 0;
  }
  return `k_${h1.toString(16).padStart(8, '0')}${h2.toString(16).padStart(8, '0')}`;
}

function resolveNormalizedBaseUrl(rawBaseUrl) {
  const trimmed = String(rawBaseUrl || '')
    .trim()
    .replace(/\/+$/, '');
  return trimmed || 'https://revclamp.com';
}

function matchesWatchlistEventFilter(ev, eventTypeFilter) {
  if (!ev || typeof ev !== 'object') return false;
  const evType = String(ev.transition_type || ev.transitionType || '').trim();
  const evAlias = String(ev.event_type || ev.eventType || evType).trim();
  if (!eventTypeFilter || eventTypeFilter === 'ALL') {
    return true;
  }
  return (
    evType === eventTypeFilter ||
    evAlias === eventTypeFilter ||
    (eventTypeFilter === 'JOB_COMP_CHANGED' && evType === 'COMPENSATION_UPDATED') ||
    (eventTypeFilter === 'COMPENSATION_UPDATED' && evType === 'JOB_COMP_CHANGED')
  );
}

function normalizeWatchlistEvent(ev) {
  const rawTransition = String(
    ev.transition_type || ev.transitionType || ev.event_type || ev.eventType || ''
  ).trim();
  const normalizedEventType =
    rawTransition === 'COMPENSATION_UPDATED' ? 'JOB_COMP_CHANGED' : rawTransition || 'JOB_OPENED';
  return {
    ...ev,
    event_type: normalizedEventType,
  };
}

function computeWatchlistEventId(ev) {
  const evType = String(ev.transition_type || ev.transitionType || ev.event_type || '').trim();
  return String(
    ev.event_id ||
      ev.eventId ||
      `${ev.board_key || ev.boardKey || 'board'}:${ev.poll_window_utc || ev.pollWindowUtc || ''}:${evType}:${ev.job_id || ev.jobId || ''}`
  );
}

function buildManualFallbackSample(eventTypeFilter, boardKey) {
  const normalizedFilter =
    eventTypeFilter === 'JOB_COMP_CHANGED' || eventTypeFilter === 'COMPENSATION_UPDATED'
      ? 'JOB_COMP_CHANGED'
      : eventTypeFilter === 'JOB_CLOSED'
        ? 'JOB_CLOSED'
        : 'JOB_OPENED';
  const transitionType =
    normalizedFilter === 'JOB_COMP_CHANGED' ? 'COMPENSATION_UPDATED' : normalizedFilter;
  return {
    event_id: 'sample_manual_1',
    board_key: boardKey || 'GREENHOUSE:stripe',
    company_label: 'Stripe',
    ats_provider: 'GREENHOUSE',
    transition_type: transitionType,
    event_type: normalizedFilter,
    job_title: 'Staff Security Engineer',
    department: 'Engineering',
    location: 'San Francisco, CA',
    compensation_text: '$220,000 - $260,000 USD',
    apply_url: 'https://boards.greenhouse.io/stripe/jobs/101',
    poll_window_utc: '2026-11-10',
  };
}

function wrapTriggerApiError(nodeRef, error) {
  if (error && typeof error === 'object' && error.name === 'NodeApiError') {
    return error;
  }
  const payload =
    (error &&
      typeof error === 'object' &&
      ((error.response && (error.response.body || error.response.data)) ||
        error.error ||
        error.body)) ||
    null;
  const httpCodeRaw =
    error &&
    typeof error === 'object' &&
    (error.httpCode ||
      error.statusCode ||
      error.status ||
      (error.response && (error.response.statusCode || error.response.status)));
  const httpCode = httpCodeRaw ? String(httpCodeRaw) : undefined;
  const apiMessage =
    (payload && typeof payload === 'object' && (payload.message || payload.error)) ||
    (error instanceof Error ? error.message : String(error || 'API request failed'));
  const errorJson =
    error && typeof error === 'object'
      ? error
      : { message: String(error || 'API request failed') };
  return new NodeApiError(nodeRef, errorJson, {
    message: String(apiMessage),
    httpCode,
  });
}

class RevClampHiringWatchlistTrigger {
  constructor() {
    this.description = {
      displayName: 'RevClamp TalentPulse Watchlist Trigger',
      name: 'revClampHiringWatchlistTrigger',
      icon: 'file:revclamp.svg',
      group: ['trigger'],
      version: 1,
      subtitle: '={{$parameter["eventTypeFilter"]}}',
      description:
        'Starts an n8n workflow whenever a watched company opens a new role, updates compensation, or closes a job listing.',
      defaults: {
        name: 'RevClamp TalentPulse Watchlist Trigger',
      },
      polling: true,
      inputs: [],
      outputs: ['main'],
      credentials: [
        {
          name: 'revClampApi',
          required: true,
        },
      ],
      properties: [
        {
          displayName: 'Hiring Signal Type',
          name: 'eventTypeFilter',
          type: 'options',
          options: [
            {
              name: 'All Hiring Changes (Opened, Salary Updated & Closed)',
              value: 'ALL',
              description: 'Trigger on every verified career page update',
            },
            {
              name: 'New Job Openings Only',
              value: 'JOB_OPENED',
              description: 'Trigger only when a company posts a brand-new job opening',
            },
            {
              name: 'Salary & Compensation Updates Only',
              value: 'JOB_COMP_CHANGED',
              description: 'Trigger only when an existing role updates its published salary range',
            },
            {
              name: 'Closed Roles Only',
              value: 'JOB_CLOSED',
              description: 'Trigger only when a role is removed from the company career page',
            },
          ],
          default: 'ALL',
          description:
            'Choose which career page changes should start your workflow',
        },
        {
          displayName: 'Filter by Company Board Key (Optional)',
          name: 'boardKey',
          type: 'string',
          default: '',
          placeholder: 'e.g. GREENHOUSE:stripe or ASHBY:ramp',
          description:
            'Optional specific company board key to watch. Leave blank to receive updates across all companies in your watchlist.',
        },
        {
          displayName: 'Max Events Per Poll',
          name: 'limit',
          type: 'number',
          typeOptions: {
            minValue: 1,
            maxValue: 200,
          },
          default: 50,
          description:
            'Maximum number of hiring events to fetch in a single polling check',
        },
        {
          displayName: 'Emit Existing History on First Activation',
          name: 'emitExistingOnActivation',
          type: 'boolean',
          default: false,
          description:
            'Whether to emit existing historical hiring events on the first active poll instead of starting from the latest cursor',
        },
      ],
    };
  }

  async poll() {
    const isManualMode = typeof this.getMode === 'function' && this.getMode() === 'manual';
    const webhookData = this.getWorkflowStaticData('node');
    const eventTypeFilter = String(this.getNodeParameter('eventTypeFilter', 'ALL') || 'ALL').trim();
    const boardKey = String(this.getNodeParameter('boardKey', '') || '').trim();
    const rawLimit = Number(this.getNodeParameter('limit', 50));
    const boundedLimit =
      Number.isFinite(rawLimit) && rawLimit > 0
        ? Math.max(1, Math.min(200, Math.floor(rawLimit)))
        : 50;
    const emitExistingOnActivation = Boolean(
      this.getNodeParameter('emitExistingOnActivation', false)
    );
    const nodeRef =
      typeof this.getNode === 'function'
        ? this.getNode()
        : {
            name: 'RevClamp TalentPulse Watchlist Trigger',
            type: 'n8n-nodes-revclamp.revClampHiringWatchlistTrigger',
          };

    let baseUrl = 'https://revclamp.com';
    let credTag = 'anon';
    try {
      const creds = await this.getCredentials('revClampApi');
      if (creds && creds.baseUrl) {
        baseUrl = resolveNormalizedBaseUrl(creds.baseUrl);
      }
      if (creds && creds.apiKey) {
        credTag = computeNonSecretCredentialTag(creds.apiKey);
      }
    } catch {
      baseUrl = 'https://revclamp.com';
    }

    const baseFilterQs = {};
    if (eventTypeFilter && eventTypeFilter !== 'ALL') {
      baseFilterQs.transition_type =
        eventTypeFilter === 'JOB_COMP_CHANGED' ? 'COMPENSATION_UPDATED' : eventTypeFilter;
    }
    if (boardKey) {
      baseFilterQs.board_key = boardKey;
    }

    if (isManualMode) {
      let responseData;
      try {
        responseData = await this.helpers.httpRequestWithAuthentication.call(
          this,
          'revClampApi',
          {
            method: 'GET',
            url: `${baseUrl}/api/v1/b2b/ats-watchlist/events`,
            qs: {
              ...baseFilterQs,
              limit: boundedLimit,
              order: 'desc',
            },
            json: true,
          }
        );
      } catch (error) {
        throw wrapTriggerApiError(nodeRef, error);
      }

      const rawEvents = Array.isArray(responseData && responseData.events)
        ? responseData.events
        : [];
      const matchingNormalized = [];
      for (const ev of rawEvents) {
        if (!matchesWatchlistEventFilter(ev, eventTypeFilter)) continue;
        matchingNormalized.push(normalizeWatchlistEvent(ev));
      }

      if (matchingNormalized.length > 0) {
        return [this.helpers.returnJsonArray(matchingNormalized.slice(0, boundedLimit))];
      }

      return [this.helpers.returnJsonArray([buildManualFallbackSample(eventTypeFilter, boardKey)])];
    }

    const currentScopeKey = `${baseUrl}|${credTag}|${boardKey}|${eventTypeFilter}`;
    if (webhookData.scopeKey && webhookData.scopeKey !== currentScopeKey) {
      webhookData.initialized = false;
      webhookData.lastCursor = '';
      webhookData.seenEventIds = [];
      webhookData.lastTenantId = '';
    }
    webhookData.scopeKey = currentScopeKey;

    if (webhookData.lastCursor && webhookData.initialized === undefined) {
      webhookData.initialized = true;
    }

    if (!webhookData.initialized && !emitExistingOnActivation) {
      let seedResponse;
      try {
        seedResponse = await this.helpers.httpRequestWithAuthentication.call(
          this,
          'revClampApi',
          {
            method: 'GET',
            url: `${baseUrl}/api/v1/b2b/ats-watchlist/events`,
            qs: {
              ...baseFilterQs,
              limit: 1,
              order: 'desc',
            },
            json: true,
          }
        );
      } catch (error) {
        throw wrapTriggerApiError(nodeRef, error);
      }

      const seedTenantId = String(
        (seedResponse && (seedResponse.tenant_id || seedResponse.tenantId)) || ''
      ).trim();
      if (seedTenantId) {
        webhookData.lastTenantId = seedTenantId;
      }

      const seedEvents = Array.isArray(seedResponse && seedResponse.events)
        ? seedResponse.events
        : [];
      const newestEv = seedEvents[0];
      const highWaterCursor =
        (newestEv && (newestEv.cursor ?? newestEv.event_seq ?? newestEv.eventSeq)) ??
        (seedResponse &&
          (seedResponse.high_water_cursor ??
            seedResponse.latest_cursor ??
            seedResponse.next_cursor)) ??
        '';
      webhookData.lastCursor = highWaterCursor !== '' ? String(highWaterCursor) : '';
      webhookData.seenEventIds =
        newestEv && typeof newestEv === 'object' ? [computeWatchlistEventId(newestEv)] : [];
      webhookData.initialized = true;
      return null;
    }

    const qs = {
      ...baseFilterQs,
      limit: boundedLimit,
      order: 'asc',
    };
    if (webhookData.lastCursor) {
      qs.after_cursor = String(webhookData.lastCursor);
    }

    let responseData;
    try {
      responseData = await this.helpers.httpRequestWithAuthentication.call(
        this,
        'revClampApi',
        {
          method: 'GET',
          url: `${baseUrl}/api/v1/b2b/ats-watchlist/events`,
          qs,
          json: true,
        }
      );
    } catch (error) {
      throw wrapTriggerApiError(nodeRef, error);
    }

    const responseTenantId = String(
      (responseData && (responseData.tenant_id || responseData.tenantId)) || ''
    ).trim();
    if (
      webhookData.lastTenantId &&
      responseTenantId &&
      webhookData.lastTenantId !== responseTenantId
    ) {
      webhookData.lastCursor = '';
      webhookData.seenEventIds = [];
      webhookData.lastTenantId = responseTenantId;
      if (!emitExistingOnActivation) {
        webhookData.initialized = false;
        return null;
      }
    }
    if (responseTenantId) {
      webhookData.lastTenantId = responseTenantId;
    }

    webhookData.initialized = true;

    const rawEvents = Array.isArray(responseData && responseData.events)
      ? responseData.events
      : [];
    const seenIds = Array.isArray(webhookData.seenEventIds)
      ? webhookData.seenEventIds.slice(-500)
      : [];
    const seenSet = new Set(seenIds);

    const newEvents = [];
    for (const ev of rawEvents) {
      if (!matchesWatchlistEventFilter(ev, eventTypeFilter)) continue;
      const evId = computeWatchlistEventId(ev);
      if (seenSet.has(evId)) {
        continue;
      }
      seenSet.add(evId);
      seenIds.push(evId);
      newEvents.push(normalizeWatchlistEvent(ev));
    }

    webhookData.seenEventIds = seenIds.slice(-500);
    if (responseData && responseData.next_cursor) {
      webhookData.lastCursor = String(responseData.next_cursor);
    } else if (rawEvents.length > 0) {
      const lastEv = rawEvents[rawEvents.length - 1];
      const candidateCursor =
        lastEv.cursor ??
        lastEv.event_seq ??
        lastEv.eventSeq ??
        webhookData.lastCursor ??
        '';
      if (candidateCursor !== '') {
        webhookData.lastCursor = String(candidateCursor);
      }
    }

    if (newEvents.length === 0) {
      return null;
    }

    return [this.helpers.returnJsonArray(newEvents)];
  }
}

module.exports = { RevClampHiringWatchlistTrigger };
