/**
 * Composio Integration Module
 * Provides AI agents with access to 150+ external tool integrations
 * (Shopify, GitHub, Gmail, Slack, etc.) via Composio's unified platform.
 *
 * Uses the session-based API: composio.create(userId) → session.tools()
 * with VercelProvider for native Vercel AI SDK compatibility.
 */

import { Composio } from '@composio/core';
import { VercelProvider } from '@composio/vercel';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _composioClient: any = null;
let _vercelProvider: VercelProvider | null = null;

/**
 * Get or create the VercelProvider singleton
 */
export function getVercelProvider(): VercelProvider {
  if (!_vercelProvider) {
    _vercelProvider = new VercelProvider();
  }
  return _vercelProvider;
}

/**
 * Get or create the Composio client singleton (with VercelProvider)
 * Returns null if COMPOSIO_API_KEY is not configured
 */
export function getComposioClient(): Composio<VercelProvider> | null {
  if (!process.env.COMPOSIO_API_KEY) {
    return null;
  }

  if (!_composioClient) {
    _composioClient = new Composio({
      apiKey: process.env.COMPOSIO_API_KEY,
      baseURL: process.env.COMPOSIO_BASE_URL || undefined,
      provider: getVercelProvider(),
    } as ConstructorParameters<typeof Composio>[0]);
  }

  return _composioClient;
}

/**
 * Session type returned by composio.create()
 */
export interface ComposioSession {
  sessionId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tools: (options?: { toolkits?: string[] }) => Promise<any>;
  authorize: (toolkit: string, options?: { callbackUrl?: string }) => Promise<{ url?: string; redirectUrl?: string }>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  toolkits: () => Promise<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  experimental: any;
}

// Session cache: userId → session
const sessionCache = new Map<string, { session: ComposioSession; timestamp: number }>();
const SESSION_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Create or retrieve a cached Composio session for a user
 * This is the new session-based API: composio.create(externalUserId)
 */
export async function getComposioSession(userId: string = 'tellmytale-default'): Promise<ComposioSession | null> {
  const composio = getComposioClient();
  if (!composio) return null;

  // Check cache
  const cached = sessionCache.get(userId);
  if (cached && Date.now() - cached.timestamp < SESSION_TTL_MS) {
    return cached.session;
  }

  try {
    const session = await (composio as unknown as { create: (id: string) => Promise<ComposioSession> }).create(userId);

    // Cache the session
    sessionCache.set(userId, { session, timestamp: Date.now() });

    return session;
  } catch (error) {
    console.error('[Composio] Failed to create session:', error);
    return null;
  }
}

/**
 * Clear session cache (useful when connections change)
 */
export function clearComposioSessionCache(): void {
  sessionCache.clear();
}

/**
 * Check if Composio is configured and available
 */
export function isComposioAvailable(): boolean {
  return !!process.env.COMPOSIO_API_KEY;
}

// Re-export sub-modules
export { getComposioToolsForMastra, getComposioToolsForVercel, getComposioSessionTools } from './tools';
export { composioConnections } from './connections';
export { createMCPClient as createComposioMCPClient } from './mcp';
