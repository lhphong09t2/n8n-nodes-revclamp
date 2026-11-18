import type {
  IAuthenticateGeneric,
  ICredentialTestRequest,
  ICredentialType,
  INodeProperties,
  Icon,
} from 'n8n-workflow';

export class RevClampApi implements ICredentialType {
  name = 'revClampApi';

  displayName = 'RevClamp TalentPulse API';

  documentationUrl = 'https://revclamp.com/docs/onboarding';

  icon: Icon = { light: 'file:revclamp.svg', dark: 'file:revclamp.dark.svg' };

  properties: INodeProperties[] = [
    {
      displayName: 'Workspace API Key',
      name: 'apiKey',
      type: 'string',
      typeOptions: {
        password: true,
      },
      required: true,
      default: '',
      description:
        'Your private RevClamp Workspace Key (rg_live_...). Not required when running Preview Daily Hiring Changes in Demo Mode.',
    },
    {
      displayName: 'API Base URL',
      name: 'baseUrl',
      type: 'string',
      default: 'https://revclamp.com',
      description: 'RevClamp API base URL',
    },
  ];

  authenticate: IAuthenticateGeneric = {
    type: 'generic',
    properties: {
      headers: {
        Authorization:
          '={{$credentials.apiKey && $credentials.apiKey.trim() ? "Bearer " + $credentials.apiKey.trim() : undefined}}',
        'X-RevClamp-Key':
          '={{$credentials.apiKey && $credentials.apiKey.trim() ? $credentials.apiKey.trim() : undefined}}',
      },
    },
  };

  test: ICredentialTestRequest = {
    request: {
      baseURL:
        '={{$credentials.baseUrl && $credentials.baseUrl.trim() ? $credentials.baseUrl.trim().replace(/\\/+$/, "") : "https://revclamp.com"}}',
      url: '/api/v1/b2b/ats-watchlist',
      method: 'GET',
    },
  };
}
