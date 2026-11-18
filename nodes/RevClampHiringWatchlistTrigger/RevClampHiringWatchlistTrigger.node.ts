import {
  NodeApiError,
  NodeConnectionTypes,
  type IDataObject,
  type INode,
  type INodeExecutionData,
  type INodeType,
  type INodeTypeDescription,
  type IPollFunctions,
  type JsonObject,
} from 'n8n-workflow';

interface WatchlistEventRecord extends IDataObject {
  event_id?: string;
  eventId?: string;
  transition_type?: string;
  transitionType?: string;
  event_type?: string;
  eventType?: string;
  board_key?: string;
  boardKey?: string;
  poll_window_utc?: string;
  pollWindowUtc?: string;
  job_id?: string;
  jobId?: string;
  cursor?: string | number;
  event_seq?: string | number;
  eventSeq?: string | number;
}

interface WatchlistEventsApiResponse {
  tenant_id?: string;
  tenantId?: string;
  next_cursor?: string;
  high_water_cursor?: string | number;
  latest_cursor?: string | number;
  events?: WatchlistEventRecord[];
}

interface ErrorShape {
  name?: string;
  message?: string;
  httpCode?: string | number;
  statusCode?: string | number;
  status?: string | number;
  response?: {
    statusCode?: number;
    status?: number;
    body?: Record<string, unknown>;
    data?: Record<string, unknown>;
  };
  error?: Record<string, unknown>;
  body?: Record<string, unknown>;
}

function computeNonSecretCredentialTag(rawKey: unknown): string {
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

function resolveNormalizedBaseUrl(rawBaseUrl: unknown): string {
  const trimmed = String(rawBaseUrl || '')
    .trim()
    .replace(/\/+$/, '');
  return trimmed || 'https://revclamp.com';
}

function matchesWatchlistEventFilter(ev: WatchlistEventRecord, eventTypeFilter: string): boolean {
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

function normalizeWatchlistEvent(ev: WatchlistEventRecord): WatchlistEventRecord {
  const rawTransition = String(
    ev.transition_type || ev.transitionType || ev.event_type || ev.eventType || '',
  ).trim();
  const normalizedEventType =
    rawTransition === 'COMPENSATION_UPDATED' ? 'JOB_COMP_CHANGED' : rawTransition || 'JOB_OPENED';
  return {
    ...ev,
    event_type: normalizedEventType,
  };
}

function computeWatchlistEventId(ev: WatchlistEventRecord): string {
  const evType = String(ev.transition_type || ev.transitionType || ev.event_type || '').trim();
  return String(
    ev.event_id ||
      ev.eventId ||
      `${ev.board_key || ev.boardKey || 'board'}:${ev.poll_window_utc || ev.pollWindowUtc || ''}:${evType}:${ev.job_id || ev.jobId || ''}`,
  );
}

function buildManualFallbackSample(eventTypeFilter: string, boardKey: string): WatchlistEventRecord {
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

function wrapTriggerApiError(nodeRef: INode, error: unknown): NodeApiError {
  if (error && typeof error === 'object' && (error as ErrorShape).name === 'NodeApiError') {
    return error as NodeApiError;
  }
  const errObj = error && typeof error === 'object' ? (error as ErrorShape) : null;
  const payload =
    (errObj &&
      ((errObj.response && (errObj.response.body || errObj.response.data)) ||
        errObj.error ||
        errObj.body)) ||
    null;
  const httpCodeRaw =
    errObj &&
    (errObj.httpCode ||
      errObj.statusCode ||
      errObj.status ||
      (errObj.response && (errObj.response.statusCode || errObj.response.status)));
  const httpCode = httpCodeRaw ? String(httpCodeRaw) : undefined;
  const apiMessage =
    (payload && typeof payload === 'object' && (payload.message || payload.error)) ||
    (error instanceof Error ? error.message : String(error || 'API request failed'));
  const errorJson: JsonObject = errObj
    ? (errObj as unknown as JsonObject)
    : { message: String(error || 'API request failed') };
  return new NodeApiError(nodeRef, errorJson, {
    message: String(apiMessage),
    httpCode,
  });
}

async function resolvePollBaseUrlAndCredTag(
  ctx: IPollFunctions,
): Promise<{ baseUrl: string; credTag: string }> {
  let baseUrl = 'https://revclamp.com';
  let credTag = 'anon';
  try {
    const creds = (await ctx.getCredentials('revClampApi')) as
      | { baseUrl?: unknown; apiKey?: unknown }
      | undefined;
    if (creds && creds.baseUrl) {
      baseUrl = resolveNormalizedBaseUrl(creds.baseUrl);
    }
    if (creds && creds.apiKey) {
      credTag = computeNonSecretCredentialTag(creds.apiKey);
    }
  } catch {
    baseUrl = 'https://revclamp.com';
  }
  return { baseUrl, credTag };
}

export class RevClampHiringWatchlistTrigger implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'RevClamp TalentPulse Watchlist Trigger',
    name: 'revClampHiringWatchlistTrigger',
    icon: { light: 'file:revclamp.svg', dark: 'file:revclamp.dark.svg' },
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
    outputs: [NodeConnectionTypes.Main],
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
        description: 'Choose which career page changes should start your workflow',
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
        description: 'Max number of results to return',
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

  async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
    const isManualMode = typeof this.getMode === 'function' && this.getMode() === 'manual';
    const webhookData = this.getWorkflowStaticData('node');
    const eventTypeFilter = String(
      this.getNodeParameter('eventTypeFilter', 'ALL') || 'ALL',
    ).trim();
    const boardKey = String(this.getNodeParameter('boardKey', '') || '').trim();
    const rawLimit = Number(this.getNodeParameter('limit', 50));
    const boundedLimit =
      Number.isFinite(rawLimit) && rawLimit > 0
        ? Math.max(1, Math.min(200, Math.floor(rawLimit)))
        : 50;
    const emitExistingOnActivation = Boolean(
      this.getNodeParameter('emitExistingOnActivation', false),
    );
    const nodeRef =
      typeof this.getNode === 'function'
        ? this.getNode()
        : ({
            name: 'RevClamp TalentPulse Watchlist Trigger',
            type: 'n8n-nodes-revclamp.revClampHiringWatchlistTrigger',
          } as unknown as INode);

    const { baseUrl, credTag } = await resolvePollBaseUrlAndCredTag(this);

    const baseFilterQs: IDataObject = {};
    if (eventTypeFilter && eventTypeFilter !== 'ALL') {
      baseFilterQs.transition_type =
        eventTypeFilter === 'JOB_COMP_CHANGED' ? 'COMPENSATION_UPDATED' : eventTypeFilter;
    }
    if (boardKey) {
      baseFilterQs.board_key = boardKey;
    }

    if (isManualMode) {
      let responseData: WatchlistEventsApiResponse;
      try {
        responseData = (await this.helpers.httpRequestWithAuthentication.call(
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
          },
        )) as WatchlistEventsApiResponse;
      } catch (error) {
        throw wrapTriggerApiError(nodeRef, error);
      }

      const rawEvents: WatchlistEventRecord[] =
        responseData && Array.isArray(responseData.events) ? responseData.events : [];
      const matchingNormalized: WatchlistEventRecord[] = [];
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
      let seedResponse: WatchlistEventsApiResponse;
      try {
        seedResponse = (await this.helpers.httpRequestWithAuthentication.call(
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
          },
        )) as WatchlistEventsApiResponse;
      } catch (error) {
        throw wrapTriggerApiError(nodeRef, error);
      }

      const seedTenantId = String(
        (seedResponse && (seedResponse.tenant_id || seedResponse.tenantId)) || '',
      ).trim();
      if (seedTenantId) {
        webhookData.lastTenantId = seedTenantId;
      }

      const seedEvents: WatchlistEventRecord[] =
        seedResponse && Array.isArray(seedResponse.events) ? seedResponse.events : [];
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

    const qs: IDataObject = {
      ...baseFilterQs,
      limit: boundedLimit,
      order: 'asc',
    };
    if (webhookData.lastCursor) {
      qs.after_cursor = String(webhookData.lastCursor);
    }

    let responseData: WatchlistEventsApiResponse;
    try {
      responseData = (await this.helpers.httpRequestWithAuthentication.call(
        this,
        'revClampApi',
        {
          method: 'GET',
          url: `${baseUrl}/api/v1/b2b/ats-watchlist/events`,
          qs,
          json: true,
        },
      )) as WatchlistEventsApiResponse;
    } catch (error) {
      throw wrapTriggerApiError(nodeRef, error);
    }

    const responseTenantId = String(
      (responseData && (responseData.tenant_id || responseData.tenantId)) || '',
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

    const rawEvents: WatchlistEventRecord[] =
      responseData && Array.isArray(responseData.events) ? responseData.events : [];
    const seenIds = Array.isArray(webhookData.seenEventIds)
      ? (webhookData.seenEventIds as string[]).slice(-500)
      : [];
    const seenSet = new Set(seenIds);

    const newEvents: WatchlistEventRecord[] = [];
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
