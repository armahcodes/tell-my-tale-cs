/**
 * Database Client for TellMyTale
 * Using Neon Serverless with Drizzle ORM
 */

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// Get database URL from environment
const getDatabaseUrl = () => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.warn('DATABASE_URL not set. Database features will not work.');
    return null;
  }
  return url;
};

// Create Neon SQL client
const createSqlClient = () => {
  const url = getDatabaseUrl();
  if (!url) return null;
  return neon(url);
};

// Create Drizzle client
const createDbClient = () => {
  const sql = createSqlClient();
  if (!sql) return null;
  return drizzle(sql, { schema });
};

// Export the database client
export const db = createDbClient();

// Export schema and types
export * from './schema';

// Helper to check if database is available
export const isDatabaseAvailable = () => db !== null;

// Type for the database client
export type DbClient = NonNullable<typeof db>;
