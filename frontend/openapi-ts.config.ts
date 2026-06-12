import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  input: '../contracts/generated/openapi.yaml',
  output: 'src/api/generated',
  plugins: [
    {
      name: '@hey-api/client-fetch',
      throwOnError: false,
    },
    '@hey-api/typescript',
    '@hey-api/sdk',
  ],
});
