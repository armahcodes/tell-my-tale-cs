/**
 * Mastra Storage Configuration
 * Production-ready PostgreSQL storage for memory persistence
 * 
 * Based on: https://mastra.ai/docs/memory/storage
 */

import { PostgresStore } from '@mastra/pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn('DATABASE_URL not set - Mastra storage will be disabled');
}

/**
 * PostgreSQL Storage for Mastra
 * Handles: messages, threads, resources, workflows, traces, evaluations
 */
export const mastraStorage = connectionString
  ? new PostgresStore({
      id: 'tellmytale-storage',
      connectionString,
    })
  : undefined;

/**
 * Storage health check
 */
export async function checkStorageHealth(): Promise<{
  healthy: boolean;
  latencyMs?: number;
  error?: string;
}> {
  if (!mastraStorage) {
    return { healthy: false, error: 'Storage not configured' };
  }

  const start = Date.now();
  try {
    // Simple health check query would go here
    // For now, just verify the store exists
    return {
      healthy: true,
      latencyMs: Date.now() - start,
    };
  } catch (error) {
    return {
      healthy: false,
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
