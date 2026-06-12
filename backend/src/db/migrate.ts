import { readdir, readFile } from 'node:fs/promises';

import postgres from 'postgres';

import { loadConfig } from '../config.js';

const migrationsUrl = new URL('../../drizzle/', import.meta.url);
const config = loadConfig();

if (!config.databaseUrl) {
  console.log('DATABASE_URL is not set; skipping database migration.');
  process.exit(0);
}

const sql = postgres(config.databaseUrl, { max: 1 });

try {
  const migrationFiles = (await readdir(migrationsUrl))
    .filter((fileName) => fileName.endsWith('.sql'))
    .sort();

  for (const migrationFile of migrationFiles) {
    const migration = await readFile(new URL(migrationFile, migrationsUrl), 'utf8');
    await sql.unsafe(migration);
    console.log(`Applied migration ${migrationFile}.`);
  }

  console.log('Database migration completed.');
} finally {
  await sql.end();
}
