/**
 * Gorgias Setup API Route
 * Admin endpoint to register/remove TellMyTale inside Gorgias.
 *
 * POST /api/gorgias/setup  — Install integration + widget
 * GET  /api/gorgias/setup  — Check current status
 * DELETE /api/gorgias/setup — Remove integration + widget
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  setupGorgiasApp,
  teardownGorgiasApp,
  getSetupStatus,
} from '@/lib/gorgias/setup';
import { isGorgiasConfigured } from '@/lib/gorgias';

/**
 * GET — Check whether TellMyTale is installed in Gorgias
 */
export async function GET() {
  if (!isGorgiasConfigured()) {
    return NextResponse.json({
      configured: false,
      message: 'Gorgias credentials not set. Configure GORGIAS_DOMAIN, GORGIAS_EMAIL, and GORGIAS_API_KEY.',
    }, { status: 400 });
  }

  try {
    const status = await getSetupStatus();
    return NextResponse.json(status);
  } catch (error) {
    console.error('[Gorgias Setup] Status check failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to check status' },
      { status: 500 }
    );
  }
}

/**
 * POST — Install TellMyTale integration + widget in Gorgias
 */
export async function POST() {
  if (!isGorgiasConfigured()) {
    return NextResponse.json({
      error: 'Gorgias credentials not set. Configure GORGIAS_DOMAIN, GORGIAS_EMAIL, and GORGIAS_API_KEY.',
    }, { status: 400 });
  }

  if (!process.env.TELLMYTALE_BASE_URL) {
    return NextResponse.json({
      error: 'TELLMYTALE_BASE_URL environment variable is required for setup.',
    }, { status: 400 });
  }

  try {
    const result = await setupGorgiasApp();
    return NextResponse.json({
      success: true,
      message: 'TellMyTale installed in Gorgias successfully',
      integrationId: result.integration.id,
      widgetId: result.widget.id,
    }, { status: 201 });
  } catch (error) {
    console.error('[Gorgias Setup] Installation failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Setup failed' },
      { status: 500 }
    );
  }
}

/**
 * DELETE — Remove TellMyTale integration + widget from Gorgias
 */
export async function DELETE() {
  if (!isGorgiasConfigured()) {
    return NextResponse.json({
      error: 'Gorgias credentials not set.',
    }, { status: 400 });
  }

  try {
    const result = await teardownGorgiasApp();
    if (!result.removed) {
      return NextResponse.json({
        success: false,
        message: 'No TellMyTale integration found in Gorgias',
      });
    }

    return NextResponse.json({
      success: true,
      message: 'TellMyTale removed from Gorgias',
      integrationId: result.integrationId,
      widgetIds: result.widgetIds,
    });
  } catch (error) {
    console.error('[Gorgias Setup] Removal failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Teardown failed' },
      { status: 500 }
    );
  }
}
