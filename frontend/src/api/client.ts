import { client } from './generated/client.gen';

const developmentBaseUrl = 'http://localhost:4010';

export function configureApiClient() {
  client.setConfig({
    baseUrl: import.meta.env.VITE_API_BASE_URL || getDefaultBaseUrl(),
  });
}

function getDefaultBaseUrl(): string {
  return import.meta.env.DEV ? developmentBaseUrl : window.location.origin;
}
