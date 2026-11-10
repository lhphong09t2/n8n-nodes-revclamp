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
      ],
    };
  }

  async poll() {
    const webhookData = this.getWorkflowStaticData('node');
    const eventTypeFilter = String(this.getNodeParameter('eventTypeFilter', 'ALL') || 'ALL').trim();
    const boardKey = String(this.getNodeParameter('boardKey', '') || '').trim();
    const limit = Number(this.getNodeParameter('limit', 50)) || 50;

    let baseUrl = 'https://revclamp.com';
    let credTag = 'anon';
    try {
      const creds = await this.getCredentials('revClampApi');
      if (creds && creds.baseUrl) {
        baseUrl = String(creds.baseUrl).replace(/\/+$/, '');
      }
      if (creds && creds.apiKey) {
        credTag = computeNonSecretCredentialTag(creds.apiKey);
      }
    } catch {
      baseUrl = 'https://revclamp.com';
    }

    const currentScopeKey = `${baseUrl}|${credTag}|${boardKey}|${eventTypeFilter}`;
    if (webhookData.scopeKey && webhookData.scopeKey !== currentScopeKey) {
      webhookData.lastCursor = '';
      webhookData.seenEventIds = [];
      webhookData.lastTenantId = '';
    }
    webhookData.scopeKey = currentScopeKey;

    const qs = {
      limit: Math.max(1, Math.min(200, limit)),
      order: 'asc',
    };
    if (webhookData.lastCursor) {
      qs.after_cursor = String(webhookData.lastCursor);
    }
    if (eventTypeFilter && eventTypeFilter !== 'ALL') {
      qs.transition_type =
        eventTypeFilter === 'JOB_COMP_CHANGED' ? 'COMPENSATION_UPDATED' : eventTypeFilter;
    }
    if (boardKey) {
      qs.board_key = boardKey;
    }

    const responseData = await this.helpers.httpRequestWithAuthentication.call(
      this,
      'revClampApi',
      {
        method: 'GET',
        url: `${baseUrl}/api/v1/b2b/ats-watchlist/events`,
        qs,
        json: true,
      }
    );

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
    }
    if (responseTenantId) {
      webhookData.lastTenantId = responseTenantId;
    }

    const rawEvents = Array.isArray(responseData && responseData.events)
      ? responseData.events
      : [];
    const seenIds = Array.isArray(webhookData.seenEventIds)
      ? webhookData.seenEventIds.slice(-500)
      : [];
    const seenSet = new Set(seenIds);

    const newEvents = [];
    for (const ev of rawEvents) {
      if (!ev || typeof ev !== 'object') continue;
      const evType = String(ev.transition_type || ev.transitionType || '').trim();
      const evAlias = String(ev.event_type || ev.eventType || evType).trim();
      if (eventTypeFilter && eventTypeFilter !== 'ALL') {
        const matchesFilter =
          evType === eventTypeFilter ||
          evAlias === eventTypeFilter ||
          (eventTypeFilter === 'JOB_COMP_CHANGED' && evType === 'COMPENSATION_UPDATED') ||
          (eventTypeFilter === 'COMPENSATION_UPDATED' && evType === 'JOB_COMP_CHANGED');
        if (!matchesFilter) {
          continue;
        }
      }
      const evId = String(
        ev.event_id ||
          ev.eventId ||
          `${ev.board_key || ev.boardKey || 'board'}:${ev.poll_window_utc || ev.pollWindowUtc || ''}:${evType}:${ev.job_id || ev.jobId || ''}`
      );
      if (seenSet.has(evId)) {
        continue;
      }
      seenSet.add(evId);
      seenIds.push(evId);
      newEvents.push({
        ...ev,
        event_type: evType === 'COMPENSATION_UPDATED' ? 'JOB_COMP_CHANGED' : evType,
      });
    }

    webhookData.seenEventIds = seenIds.slice(-500);
    if (responseData && responseData.next_cursor) {
      webhookData.lastCursor = String(responseData.next_cursor);
    } else if (rawEvents.length > 0) {
      const lastEv = rawEvents[rawEvents.length - 1];
      const candidateCursor =
        lastEv.cursor ||
        lastEv.event_seq ||
        lastEv.eventSeq ||
        webhookData.lastCursor ||
        '';
      if (candidateCursor !== '') {
        webhookData.lastCursor = String(candidateCursor);
      }
    }

    if (newEvents.length === 0) {
      if (typeof this.getMode === 'function' && this.getMode() === 'manual') {
        const manualSample =
          rawEvents.length > 0
            ? rawEvents.slice(0, 1)
            : [
                {
                  event_id: 'sample_manual_1',
                  company_label: 'Stripe',
                  ats_provider: 'GREENHOUSE',
                  transition_type: 'JOB_OPENED',
                  event_type: 'JOB_OPENED',
                  job_title: 'Staff Security Engineer',
                  department: 'Engineering',
                  location: 'San Francisco, CA',
                  compensation_text: '$220,000 - $260,000 USD',
                  apply_url: 'https://boards.greenhouse.io/stripe/jobs/101',
                  poll_window_utc: '2026-11-10',
                },
              ];
        return [this.helpers.returnJsonArray(manualSample)];
      }
      return null;
    }

    return [this.helpers.returnJsonArray(newEvents)];
  }
}

module.exports = { RevClampHiringWatchlistTrigger };
