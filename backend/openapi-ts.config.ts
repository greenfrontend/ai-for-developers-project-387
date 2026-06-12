import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  input: '../contracts/generated/openapi.yaml',
  output: 'src/api/generated',
  plugins: ['@hey-api/typescript', 'fastify'],
});
