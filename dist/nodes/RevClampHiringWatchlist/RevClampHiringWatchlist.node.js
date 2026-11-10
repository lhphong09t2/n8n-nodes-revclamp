class RevClampHiringWatchlist {
  constructor() {
    this.description = {
      displayName: 'RevClamp TalentPulse Watchlist',
      name: 'revClampHiringWatchlist',
      icon: 'file:revclamp.svg',
      group: ['transform'],
      version: 1,
      subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
      description:
        'Track company career pages (Greenhouse, Ashby, Lever, SmartRecruiters, Workday) for new job openings, salary changes, and closed roles.',
      defaults: {
        name: 'RevClamp TalentPulse Watchlist',
      },
      inputs: ['main'],
      outputs: ['main'],
      usableAsTool: true,
      credentials: [
        {
          name: 'revClampApi',
          required: false,
        },
      ],
      properties: [
        {
          displayName: 'Resource',
          name: 'resource',
          type: 'options',
          noDataExpression: true,
          options: [
            {
              name: 'Watchlist',
              value: 'watchlist',
              description: 'Monitor company career pages and job openings across 5 ATS platforms',
            },
          ],
          default: 'watchlist',
        },
        {
          displayName: 'Operation',
          name: 'operation',
          type: 'options',
          noDataExpression: true,
          displayOptions: {
            show: {
              resource: ['watchlist'],
            },
          },
          options: [
            {
              name: 'Preview Daily Hiring Changes',
              value: 'previewDiff',
              description:
                'Preview new roles, salary range updates, and closed roles for a company career page',
              action: 'Preview daily hiring changes for a company',
            },
            {
              name: 'Add Company Career Page to Watchlist',
              value: 'enrollBoard',
              description:
                'Start tracking a company career page and receive alerts in Slack, email, or your CRM',
              action: 'Add a company career page to your watchlist',
            },
            {
              name: 'List Watched Companies',
              value: 'listBoards',
              description:
                'List all company career pages currently monitored in your workspace',
              action: 'List all watched companies in your workspace',
            },
            {
              name: 'Check Watched Companies Now',
              value: 'syncWatchlist',
              description:
                'Run an immediate check across your watched companies and emit any new hiring changes',
              action: 'Check watched companies for new job updates now',
            },
          ],
          default: 'previewDiff',
        },
        {
          displayName: 'Try Instant Demo Mode (No API Key Needed)',
          name: 'demoMode',
          type: 'boolean',
          default: true,
          description:
            'Whether to run a realistic sample preview immediately without needing an API key',
          displayOptions: {
            show: {
              resource: ['watchlist'],
              operation: ['previewDiff'],
            },
          },
        },
        {
          displayName: 'Sample Scenario',
          name: 'preset',
          type: 'options',
          options: [
            {
              name: 'DevTools Outbound SDR Signals (New Engineering & Sales Roles)',
              value: 'devtools_outbound_diff',
            },
            {
              name: 'Executive Recruiting Agency (VP & Staff Role Changes)',
              value: 'recruiting_agency_exec_diff',
            },
            {
              name: 'Maintenance Safety Check (Paused Alert Protection)',
              value: 'degraded_upstream_fail_closed',
            },
          ],
          default: 'devtools_outbound_diff',
          description:
            'Choose a realistic recruiting or outbound sales scenario to preview',
          displayOptions: {
            show: {
              resource: ['watchlist'],
              operation: ['previewDiff'],
              demoMode: [true],
            },
          },
        },
        {
          displayName: 'Company Domain or Career Page URL',
          name: 'companyDomain',
          type: 'string',
          default: 'stripe.com',
          placeholder: 'e.g. stripe.com or https://jobs.ashbyhq.com/ramp',
          description:
            'Paste the company domain (such as stripe.com or openai.com) or a direct Greenhouse, Ashby, Lever, SmartRecruiters, or Workday career page link',
          displayOptions: {
            show: {
              resource: ['watchlist'],
              operation: ['previewDiff', 'enrollBoard'],
            },
          },
        },
        {
          displayName: 'Filter to One Company (Optional)',
          name: 'syncCompanyFilter',
          type: 'string',
          default: '',
          placeholder: 'Leave blank to check all watched companies',
          description:
            'Optional domain or career page URL to check just one company. Leave blank to check all watched companies in your workspace.',
          displayOptions: {
            show: {
              resource: ['watchlist'],
              operation: ['syncWatchlist'],
            },
          },
        },
        {
          displayName: 'ATS Platform (Optional)',
          name: 'atsProvider',
          type: 'options',
          options: [
            {
              name: 'Auto-Detect from Domain or URL',
              value: '',
            },
            {
              name: 'Greenhouse',
              value: 'GREENHOUSE',
            },
            {
              name: 'Ashby',
              value: 'ASHBY',
            },
            {
              name: 'Lever',
              value: 'LEVER',
            },
            {
              name: 'SmartRecruiters',
              value: 'SMARTRECRUITERS',
            },
            {
              name: 'Workday',
              value: 'WORKDAY',
            },
          ],
          default: '',
          description:
            'Leave on Auto-Detect for known domains or direct ATS links, or pick the ATS platform explicitly',
          displayOptions: {
            show: {
              resource: ['watchlist'],
              operation: ['previewDiff', 'enrollBoard'],
            },
          },
        },
        {
          displayName: 'ATS Board Slug (Optional)',
          name: 'boardSlug',
          type: 'string',
          default: '',
          placeholder: 'e.g. stripe, ramp, openai',
          description:
            'Optional board identifier when specifying the ATS platform manually',
          displayOptions: {
            show: {
              resource: ['watchlist'],
              operation: ['previewDiff', 'enrollBoard'],
            },
          },
        },
        {
          displayName: 'Department Filter (Optional)',
          name: 'departmentFilter',
          type: 'string',
          default: '',
          placeholder: 'e.g. Engineering, Sales, Security',
          description:
            'Only alert on roles matching these departments (comma-separated). Leave blank to track all departments.',
          displayOptions: {
            show: {
              resource: ['watchlist'],
              operation: ['previewDiff', 'enrollBoard'],
            },
          },
        },
        {
          displayName: 'Job Title Keyword Filter (Optional)',
          name: 'keywordFilter',
          type: 'string',
          default: '',
          placeholder: 'e.g. Staff, Founding, Account Executive, AI',
          description:
            'Only alert when the job title includes one of these keywords (comma-separated)',
          displayOptions: {
            show: {
              resource: ['watchlist'],
              operation: ['previewDiff', 'enrollBoard'],
            },
          },
        },
        {
          displayName: 'Remote Roles Only',
          name: 'remoteOnly',
          type: 'boolean',
          default: false,
          description:
            'Whether to filter only for remote-eligible job openings',
          displayOptions: {
            show: {
              resource: ['watchlist'],
              operation: ['previewDiff', 'enrollBoard'],
            },
          },
        },
        {
          displayName: 'Alert Email for Daily Digest (Optional)',
          name: 'alertEmail',
          type: 'string',
          default: '',
          placeholder: 'e.g. recruiting-alerts@yourcompany.com',
          description:
            'Send a clean daily morning email summary whenever new roles open or compensation changes',
          displayOptions: {
            show: {
              resource: ['watchlist'],
              operation: ['enrollBoard'],
            },
          },
        },
        {
          displayName: 'Outbound Webhook or Slack URL (Optional)',
          name: 'deliveryWebhookUrl',
          type: 'string',
          default: '',
          placeholder: 'e.g. https://hooks.slack.com/services/...',
          description:
            'Optional HTTPS webhook URL to receive instant notifications when hiring changes are detected',
          displayOptions: {
            show: {
              resource: ['watchlist'],
              operation: ['enrollBoard'],
            },
          },
        },
      ],
    };
  }

  async execute() {
    const items = this.getInputData();
    const returnData = [];
    const length = items.length || 1;

    let baseUrl = 'https://revclamp.com';
    try {
      const creds = await this.getCredentials('revClampApi');
      if (creds && creds.baseUrl) {
        baseUrl = String(creds.baseUrl).replace(/\/+$/, '');
      }
    } catch {
      baseUrl = 'https://revclamp.com';
    }

    for (let i = 0; i < length; i++) {
      try {
        const operation = this.getNodeParameter('operation', i, 'previewDiff');

        if (operation === 'previewDiff') {
          const demoMode = this.getNodeParameter('demoMode', i, true);
          const companyDomain = String(this.getNodeParameter('companyDomain', i, '') || '').trim();
          const atsProvider = String(this.getNodeParameter('atsProvider', i, '') || '').trim();
          const boardSlug = String(this.getNodeParameter('boardSlug', i, '') || '').trim();
          const departmentFilter = String(this.getNodeParameter('departmentFilter', i, '') || '').trim();
          const keywordFilter = String(this.getNodeParameter('keywordFilter', i, '') || '').trim();
          const remoteOnly = Boolean(this.getNodeParameter('remoteOnly', i, false));

          const body = {
            product_context: 'watchlist',
          };
          if (demoMode) {
            body.demo = true;
            body.preset = this.getNodeParameter('preset', i, 'devtools_outbound_diff');
          }
          if (companyDomain) {
            if (companyDomain.startsWith('http://') || companyDomain.startsWith('https://')) {
              body.board_url = companyDomain;
            } else {
              body.domain = companyDomain;
            }
          }
          if (atsProvider) body.ats_provider = atsProvider;
          if (boardSlug) body.board_slug = boardSlug;
          if (departmentFilter) body.department_filter = departmentFilter;
          if (keywordFilter) body.keyword_filter = keywordFilter;
          if (remoteOnly) body.remote_only = true;

          const requestOptions = {
            method: 'POST',
            url: `${baseUrl}/api/v1/b2b/ats-watchlist/preview-diff`,
            body,
            json: true,
          };

          const responseData = demoMode
            ? await this.helpers.httpRequest.call(this, requestOptions)
            : await this.helpers.httpRequestWithAuthentication.call(
                this,
                'revClampApi',
                requestOptions
              );

          returnData.push({
            json: responseData,
            pairedItem: { item: i },
          });
          continue;
        }

        if (operation === 'enrollBoard') {
          const companyDomain = String(this.getNodeParameter('companyDomain', i, '') || '').trim();
          const atsProvider = String(this.getNodeParameter('atsProvider', i, '') || '').trim();
          const boardSlug = String(this.getNodeParameter('boardSlug', i, '') || '').trim();
          const departmentFilter = String(this.getNodeParameter('departmentFilter', i, '') || '').trim();
          const keywordFilter = String(this.getNodeParameter('keywordFilter', i, '') || '').trim();
          const remoteOnly = Boolean(this.getNodeParameter('remoteOnly', i, false));
          const alertEmail = String(this.getNodeParameter('alertEmail', i, '') || '').trim();
          const deliveryWebhookUrl = String(this.getNodeParameter('deliveryWebhookUrl', i, '') || '').trim();

          const body = {
            operation: 'upsert',
            product_context: 'watchlist',
          };
          if (companyDomain.startsWith('http://') || companyDomain.startsWith('https://')) {
            body.board_url = companyDomain;
          } else {
            body.domain = companyDomain;
          }
          if (atsProvider) body.ats_provider = atsProvider;
          if (boardSlug) body.board_slug = boardSlug;
          if (departmentFilter) body.department_filter = departmentFilter;
          if (keywordFilter) body.keyword_filter = keywordFilter;
          if (remoteOnly) body.remote_only = true;
          if (alertEmail) {
            body.alert_email = alertEmail;
            body.delivery_email_enabled = true;
          }
          if (deliveryWebhookUrl) {
            body.delivery_webhook_url = deliveryWebhookUrl;
          }

          const responseData = await this.helpers.httpRequestWithAuthentication.call(
            this,
            'revClampApi',
            {
              method: 'POST',
              url: `${baseUrl}/api/v1/b2b/ats-watchlist`,
              body,
              json: true,
            }
          );

          returnData.push({
            json: responseData,
            pairedItem: { item: i },
          });
          continue;
        }

        if (operation === 'listBoards') {
          const responseData = await this.helpers.httpRequestWithAuthentication.call(
            this,
            'revClampApi',
            {
              method: 'GET',
              url: `${baseUrl}/api/v1/b2b/ats-watchlist`,
              json: true,
            }
          );

          returnData.push({
            json: responseData,
            pairedItem: { item: i },
          });
          continue;
        }

        if (operation === 'syncWatchlist') {
          const syncFilter = String(this.getNodeParameter('syncCompanyFilter', i, '') || '').trim();
          const body = {
            operation: 'sync',
            product_context: 'watchlist',
          };
          if (syncFilter) {
            if (syncFilter.startsWith('http://') || syncFilter.startsWith('https://')) {
              body.board_url = syncFilter;
            } else {
              body.domain = syncFilter;
            }
          }

          const responseData = await this.helpers.httpRequestWithAuthentication.call(
            this,
            'revClampApi',
            {
              method: 'POST',
              url: `${baseUrl}/api/v1/b2b/ats-watchlist/sync`,
              body,
              json: true,
            }
          );

          returnData.push({
            json: responseData,
            pairedItem: { item: i },
          });
          continue;
        }

        throw new Error(`Unsupported operation: ${String(operation)}`);
      } catch (error) {
        if (this.continueOnFail && this.continueOnFail()) {
          returnData.push({
            json: {
              ok: false,
              error: error instanceof Error ? error.message : String(error),
            },
            pairedItem: { item: i },
          });
          continue;
        }
        throw error;
      }
    }

    return [returnData];
  }
}

module.exports = { RevClampHiringWatchlist };
