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
        default: '',
        description:
          'Your private RevClamp Workspace Key (rg_live_...). Leave blank when using Demo Mode.',
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
          Authorization: '=Bearer {{$credentials.apiKey}}',
          'X-RevClamp-Key': '={{$credentials.apiKey}}',
        },
      },
    };
    this.test = {
      request: {
        baseURL: '={{$credentials.baseUrl}}',
        url: '/api/v1/b2b/ats-watchlist',
        method: 'GET',
      },
    };
  }
}

module.exports = { RevClampApi };
