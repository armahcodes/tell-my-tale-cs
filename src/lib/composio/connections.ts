/**
 * Composio Connected Account Management
 * Handles OAuth flows, API key connections, and account lifecycle.
 *
 * Uses the session-based API for authorization:
 *   session.authorize('shopify', { callbackUrl }) → redirect URL
 *
 * Falls back to the direct connectedAccounts API for listing, refreshing, etc.
 */

import { getComposioClient, getComposioSession, clearComposioSessionCache } from './index';
import { clearComposioToolCache } from './tools';

export interface ConnectionRequest {
  userId: string;
  /** Toolkit slug to authorize (e.g., 'shopify', 'github', 'gmail') */
  toolkit: string;
  /** Legacy: authConfigId for the old API path */
  authConfigId?: string;
  callbackUrl?: string;
}

export interface ConnectionStatus {
  id: string;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'INITIATED' | 'EXPIRED' | 'FAILED';
  toolkit: string;
  createdAt?: string;
}

/**
 * Composio connection management service
 */
export const composioConnections = {
  /**
   * Initiate a new connection using session.authorize()
   * Returns a redirect URL for the user to authenticate
   */
  async initiate(request: ConnectionRequest): Promise<{
    redirectUrl: string;
    connectionId?: string;
    sessionId?: string;
  } | null> {
    const callbackUrl = request.callbackUrl ||
      `${process.env.TELLMYTALE_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/composio/callback`;

    // Try session-based authorize first (new API)
    try {
      const session = await getComposioSession(request.userId);
      if (session) {
        const result = await session.authorize(request.toolkit, { callbackUrl });
        const redirectUrl = (result as Record<string, unknown>).url as string
          || (result as Record<string, unknown>).redirectUrl as string
          || '';

        if (redirectUrl) {
          return {
            redirectUrl,
            sessionId: session.sessionId,
          };
        }
      }
    } catch (error) {
      console.warn('[Composio] Session authorize failed, trying direct API:', error);
    }

    // Fallback to direct connectedAccounts API
    if (request.authConfigId) {
      const composio = getComposioClient();
      if (!composio) return null;

      try {
        const connection = await composio.connectedAccounts.initiate(
          request.userId,
          request.authConfigId,
          { callbackUrl }
        );

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const conn = connection as any;
        return {
          redirectUrl: conn.redirectUrl || conn.redirect_url || '',
          connectionId: conn.id || '',
        };
      } catch (error) {
        console.error('[Composio] Direct initiate failed:', error);
      }
    }

    return null;
  },

  /**
   * Authorize a specific toolkit for a user (convenience method)
   * Uses session.authorize() under the hood
   */
  async authorizeToolkit(userId: string, toolkit: string, callbackUrl?: string): Promise<{
    redirectUrl: string;
    sessionId: string;
  } | null> {
    const session = await getComposioSession(userId);
    if (!session) return null;

    try {
      const url = callbackUrl ||
        `${process.env.TELLMYTALE_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/composio/callback`;

      const result = await session.authorize(toolkit, { callbackUrl: url });
      const redirectUrl = (result as Record<string, unknown>).url as string
        || (result as Record<string, unknown>).redirectUrl as string
        || '';

      return {
        redirectUrl,
        sessionId: session.sessionId,
      };
    } catch (error) {
      console.error(`[Composio] Failed to authorize ${toolkit}:`, error);
      return null;
    }
  },

  /**
   * List connected accounts for a user
   */
  async list(userId: string, status?: string): Promise<ConnectionStatus[]> {
    const composio = getComposioClient();
    if (!composio) return [];

    try {
      const query: Record<string, unknown> = { userIds: [userId] };
      if (status) query.statuses = [status];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const accounts = await composio.connectedAccounts.list(query as any);
      const accountList = Array.isArray(accounts) ? accounts : [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return accountList.map((acc: any) => ({
        id: String(acc.id || ''),
        status: (acc.status || 'PENDING') as ConnectionStatus['status'],
        toolkit: String(acc.toolkit?.slug || acc.toolkitSlug || 'unknown'),
        createdAt: acc.createdAt ? String(acc.createdAt) : undefined,
      }));
    } catch (error) {
      console.error('[Composio] Failed to list connections:', error);
      return [];
    }
  },

  /**
   * Get a specific connected account
   */
  async get(connectionId: string): Promise<ConnectionStatus | null> {
    const composio = getComposioClient();
    if (!composio) return null;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const account = await composio.connectedAccounts.get(connectionId) as any;
      return {
        id: String(account.id || ''),
        status: (account.status || 'PENDING') as ConnectionStatus['status'],
        toolkit: String(account.toolkit?.slug || account.toolkitSlug || 'unknown'),
        createdAt: account.createdAt ? String(account.createdAt) : undefined,
      };
    } catch (error) {
      console.error('[Composio] Failed to get connection:', error);
      return null;
    }
  },

  /**
   * Refresh a connected account's credentials
   */
  async refresh(connectionId: string): Promise<boolean> {
    const composio = getComposioClient();
    if (!composio) return false;

    try {
      await composio.connectedAccounts.refresh(connectionId);
      clearComposioToolCache();
      clearComposioSessionCache();
      return true;
    } catch (error) {
      console.error('[Composio] Failed to refresh connection:', error);
      return false;
    }
  },

  /**
   * Delete a connected account
   */
  async delete(connectionId: string): Promise<boolean> {
    const composio = getComposioClient();
    if (!composio) return false;

    try {
      await composio.connectedAccounts.delete(connectionId);
      clearComposioToolCache();
      clearComposioSessionCache();
      return true;
    } catch (error) {
      console.error('[Composio] Failed to delete connection:', error);
      return false;
    }
  },

  /**
   * Enable a previously disabled connection
   */
  async enable(connectionId: string): Promise<boolean> {
    const composio = getComposioClient();
    if (!composio) return false;

    try {
      await composio.connectedAccounts.enable(connectionId);
      clearComposioToolCache();
      return true;
    } catch (error) {
      console.error('[Composio] Failed to enable connection:', error);
      return false;
    }
  },

  /**
   * Disable a connection (without deleting)
   */
  async disable(connectionId: string): Promise<boolean> {
    const composio = getComposioClient();
    if (!composio) return false;

    try {
      await composio.connectedAccounts.disable(connectionId);
      clearComposioToolCache();
      return true;
    } catch (error) {
      console.error('[Composio] Failed to disable connection:', error);
      return false;
    }
  },
};
