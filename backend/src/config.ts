import { config as loadDotenv } from 'dotenv';

loadDotenv({ path: new URL('../.env', import.meta.url) });

export type Config = {
  databaseUrl: string | undefined;
  host: string;
  nodeEnv: string;
  port: number;
};

const defaultDatabaseUrl = 'postgres://booking:booking@localhost:5432/booking';

export function loadConfig(): Config {
  const port = Number(process.env.PORT ?? 4010);
  const nodeEnv = process.env.NODE_ENV ?? 'development';

  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }

  return {
    databaseUrl: process.env.DATABASE_URL ?? (nodeEnv === 'production' ? undefined : defaultDatabaseUrl),
    host: process.env.HOST ?? '0.0.0.0',
    nodeEnv,
    port,
  };
}
