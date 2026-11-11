let NodeApiError;
let NodeOperationError;
try {
  ({ NodeApiError, NodeOperationError } = require('n8n-workflow'));
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
      this.context =
        options && options.itemIndex !== undefined ? { itemIndex: options.itemIndex } : {};
      this.cause = errorResponse;
    }
  };
  NodeOperationError = class NodeOperationError extends Error {
    constructor(node, error, options = {}) {
      const msg = error instanceof Error ? error.message : String(error || 'Operation error');
      super(msg);
      this.name = 'NodeOperationError';
      this.node = node;
      this.description =
        options && options.description ? String(options.description) : undefined;
      this.context =
        options && options.itemIndex !== undefined ? { itemIndex: options.itemIndex } : {};
    }
  };
}

function resolveNormalizedBaseUrl(rawBaseUrl) {
  const trimmed = String(rawBaseUrl || '')
    .trim()
    .replace(/\/+$/, '');
  return trimmed || 'https://revclamp.com';
}

function isHttpUrlInput(value) {
  return /^https?:\/\//i.test(String(value || '').trim());
}

function wrapExecutionError(nodeRef, error, itemIndex) {
  if (
    error &&
    typeof error === 'object' &&
    (error.name === 'NodeOperationError' || error.name === 'NodeApiError')
  ) {
    if (itemIndex !== undefined) {
      if (!error.context || typeof error.context !== 'object') {
        error.context = {};
      }
      if (error.context.itemIndex === undefined) {
        error.context.itemIndex = itemIndex;
      }
    }
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
  const apiErrorCode =
    payload && typeof payload === 'object' && payload.error ? String(payload.error) : undefined;
  const upgradeUrl =
    payload && typeof payload === 'object' && payload.upgrade_url
      ? String(payload.upgrade_url)
      : undefined;
  const apiMessage =
    (payload && typeof payload === 'object' && (payload.message || payload.error)) ||
    (error instanceof Error ? error.message : String(error || 'API request failed'));

  const descriptionParts = [];
  if (apiErrorCode && apiErrorCode !== apiMessage) {
    descriptionParts.push(`Code: ${apiErrorCode}`);
  }
  if (upgradeUrl) {
    descriptionParts.push(`Upgrade: ${upgradeUrl}`);
  }

  const errorJson =
    error && typeof error === 'object'
      ? error
      : { message: String(error || 'API request failed') };

  return new NodeApiError(nodeRef, errorJson, {
    message: String(apiMessage),
    description: descriptionParts.length > 0 ? descriptionParts.join(' | ') : undefined,
    httpCode,
    itemIndex,
  });
}

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
          required: true,
          displayOptions: {
            show: {
              resource: ['watchlist'],
              operation: ['enrollBoard', 'listBoards', 'syncWatchlist'],
            },
          },
        },
        {
          name: 'revClampApi',
          required: true,
          displayOptions: {
            show: {
              resource: ['watchlist'],
              operation: ['previewDiff'],
              demoMode: [false],
            },
          },
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
              operation: ['previewDiff'],
              demoMode: [false],
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
              operation: ['enrollBoard'],
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
    const nodeRef =
      typeof this.getNode === 'function'
        ? this.getNode()
        : {
            name: 'RevClamp TalentPulse Watchlist',
            type: 'n8n-nodes-revclamp.revClampHiringWatchlist',
          };

    let baseUrl = 'https://revclamp.com';
    try {
      const creds = await this.getCredentials('revClampApi');
      if (creds && creds.baseUrl) {
        baseUrl = resolveNormalizedBaseUrl(creds.baseUrl);
      }
    } catch {
      baseUrl = 'https://revclamp.com';
    }

    for (let i = 0; i < length; i++) {
      try {
        const operation = this.getNodeParameter('operation', i, 'previewDiff');

        if (operation === 'previewDiff') {
          const demoMode = Boolean(this.getNodeParameter('demoMode', i, true));
          const atsProvider = String(this.getNodeParameter('atsProvider', i, '') || '').trim();
          const boardSlug = String(this.getNodeParameter('boardSlug', i, '') || '').trim();
          const departmentFilter = String(
            this.getNodeParameter('departmentFilter', i, '') || ''
          ).trim();
          const keywordFilter = String(this.getNodeParameter('keywordFilter', i, '') || '').trim();
          const remoteOnly = Boolean(this.getNodeParameter('remoteOnly', i, false));

          const body = {
            product_context: 'watchlist',
          };
          if (demoMode) {
            body.demo = true;
            body.preset = this.getNodeParameter('preset', i, 'devtools_outbound_diff');
          } else {
            const companyDomain = String(
              this.getNodeParameter('companyDomain', i, '') || ''
            ).trim();
            if (!companyDomain && !(atsProvider && boardSlug)) {
              throw new NodeOperationError(
                nodeRef,
                'Provide a Company Domain / Career Page URL or both ATS Platform and Board Slug when Demo Mode is disabled.',
                { itemIndex: i }
              );
            }
            if (companyDomain) {
              if (isHttpUrlInput(companyDomain)) {
                body.board_url = companyDomain;
              } else {
                body.domain = companyDomain;
              }
            }
            if (atsProvider) body.ats_provider = atsProvider;
            if (boardSlug) body.board_slug = boardSlug;
          }
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
          const departmentFilter = String(
            this.getNodeParameter('departmentFilter', i, '') || ''
          ).trim();
          const keywordFilter = String(this.getNodeParameter('keywordFilter', i, '') || '').trim();
          const remoteOnly = Boolean(this.getNodeParameter('remoteOnly', i, false));
          const alertEmail = String(this.getNodeParameter('alertEmail', i, '') || '').trim();
          const deliveryWebhookUrl = String(
            this.getNodeParameter('deliveryWebhookUrl', i, '') || ''
          ).trim();

          if (!companyDomain && !(atsProvider && boardSlug)) {
            throw new NodeOperationError(
              nodeRef,
              'Provide a Company Domain / Career Page URL or both ATS Platform and Board Slug to enroll a career page.',
              { itemIndex: i }
            );
          }

          const body = {
            operation: 'upsert',
            product_context: 'watchlist',
          };
          if (companyDomain) {
            if (isHttpUrlInput(companyDomain)) {
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
          const syncFilter = String(
            this.getNodeParameter('syncCompanyFilter', i, '') || ''
          ).trim();
          const body = {
            operation: 'sync',
            product_context: 'watchlist',
          };
          if (syncFilter) {
            if (isHttpUrlInput(syncFilter)) {
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

        throw new NodeOperationError(
          nodeRef,
          `Unsupported operation: ${String(operation)}`,
          { itemIndex: i }
        );
      } catch (error) {
        const wrappedError = wrapExecutionError(nodeRef, error, i);
        if (this.continueOnFail && this.continueOnFail()) {
          const errorJson = {
            ok: false,
            error: wrappedError.message,
            itemIndex: i,
          };
          if (wrappedError.httpCode) {
            errorJson.httpCode = wrappedError.httpCode;
          }
          if (wrappedError.description) {
            errorJson.description = wrappedError.description;
          }
          returnData.push({
            json: errorJson,
            error: wrappedError,
            pairedItem: { item: i },
          });
          continue;
        }
        throw wrappedError;
      }
    }

    return [returnData];
  }
}

module.exports = { RevClampHiringWatchlist };
