/**
 * Composio Connected Accounts API
 * Manages OAuth connections and API key integrations
 *
 * POST with { toolkit: 'shopify' } → session.authorize() → redirect URL
 * POST with { authConfigId: '...' } → legacy direct connection
 */

import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { headers } from 'next/headers';
import { composioConnections } from '@/lib/composio';

/**
 * GET /api/composio/connections
 * List connected accounts for the authenticated user
 */
export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const connections = await composioConnections.list(session.user.id);
    return Response.json({ connections });
  } catch (error) {
    console.error('[Composio API] List connections error:', error);
    return Response.json(
      { error: 'Failed to list connections' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/composio/connections
 * Initiate a new connection
 *
 * Body: { toolkit: string } (preferred — uses session.authorize())
 * Body: { authConfigId: string } (legacy — uses connectedAccounts.initiate())
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { toolkit, authConfigId } = body;

    if (!toolkit && !authConfigId) {
      return Response.json(
        { error: 'toolkit or authConfigId is required' },
        { status: 400 }
      );
    }

    const result = await composioConnections.initiate({
      userId: session.user.id,
      toolkit: toolkit || 'unknown',
      authConfigId,
    });

    if (!result) {
      return Response.json(
        { error: 'Composio is not configured or connection initiation failed' },
        { status: 500 }
      );
    }

    return Response.json(result);
  } catch (error) {
    console.error('[Composio API] Initiate connection error:', error);
    return Response.json(
      { error: 'Failed to initiate connection' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/composio/connections
 * Delete a connected account
 *
 * Body: { connectionId: string }
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { connectionId } = await req.json();
    if (!connectionId) {
      return Response.json(
        { error: 'connectionId is required' },
        { status: 400 }
      );
    }

    const success = await composioConnections.delete(connectionId);
    return Response.json({ success });
  } catch (error) {
    console.error('[Composio API] Delete connection error:', error);
    return Response.json(
      { error: 'Failed to delete connection' },
      { status: 500 }
    );
  }
}
