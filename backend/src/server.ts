import { buildApp } from './app.js';
import { loadConfig } from './config.js';
import { createDatabase } from './db/client.js';
import { InMemoryBookingRepository } from './repositories/inMemoryBookingRepository.js';
import { DrizzleBookingRepository } from './repositories/drizzleBookingRepository.js';

const config = loadConfig();
const database = config.databaseUrl ? createDatabase(config.databaseUrl) : undefined;
const app = await buildApp({
  enableResponseValidation: config.nodeEnv !== 'production',
  repository: database
    ? new DrizzleBookingRepository(database.db)
    : new InMemoryBookingRepository(),
});

app.addHook('onClose', async () => {
  await database?.client.end();
});

try {
  await app.listen({ host: config.host, port: config.port });
} catch (error) {
  app.log.error(error);
  await app.close();
  process.exitCode = 1;
}
