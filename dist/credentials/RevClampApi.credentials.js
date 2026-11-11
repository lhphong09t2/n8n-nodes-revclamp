class RevClampApi {
  constructor() {
    this.name = 'revClampApi';
    this.displayName = 'RevClamp TalentPulse API';
    this.documentationUrl = 'https://revclamp.com/docs/onboarding';
    this.properties = [
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
    this.authenticate = {
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
    this.test = {
      request: {
        baseURL:
          '={{$credentials.baseUrl && $credentials.baseUrl.trim() ? $credentials.baseUrl.trim().replace(/\\/+$/, "") : "https://revclamp.com"}}',
        url: '/api/v1/b2b/ats-watchlist',
        method: 'GET',
      },
    };
  }
}

module.exports = { RevClampApi };
