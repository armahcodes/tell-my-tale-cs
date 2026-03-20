/**
 * Composio OAuth Callback Handler
 * Handles the redirect after a user completes OAuth authentication
 */

import { NextRequest } from 'next/server';

/**
 * GET /api/composio/callback
 * OAuth callback endpoint - redirects user back to dashboard
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const connectedAccountId = searchParams.get('connected_account_id');

  // Build redirect URL with connection result
  const dashboardUrl = new URL('/dashboard/settings', req.url);

  if (status === 'success' && connectedAccountId) {
    dashboardUrl.searchParams.set('composio_connected', 'true');
    dashboardUrl.searchParams.set('connection_id', connectedAccountId);
  } else {
    dashboardUrl.searchParams.set('composio_error', status || 'unknown');
  }

  return Response.redirect(dashboardUrl.toString());
}
