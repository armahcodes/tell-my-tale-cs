/**
 * Escalation Workflow API
 *
 * POST /api/workflows/escalation          — Start a new escalation workflow
 * POST /api/workflows/escalation?action=resolve — Resume an escalation hook (agent action)
 */

import { NextRequest, NextResponse } from 'next/server';
import { start, resumeHook } from 'workflow/api';
import { escalationWorkflow, type EscalationWorkflowInput, type EscalationApproval } from '@/workflows/escalation';

/**
 * POST — Start a new escalation or resolve an existing one
 */
export async function POST(request: NextRequest) {
  const action = request.nextUrl.searchParams.get('action');

  // ============================================
  // Resume an existing escalation (agent action)
  // ============================================
  if (action === 'resolve') {
    try {
      const body = await request.json();
      const { ticketId, escalationId, approved, resolution, agentEmail, note } = body;

      if (!ticketId && !escalationId) {
        return NextResponse.json(
          { error: 'ticketId or escalationId is required' },
          { status: 400 }
        );
      }

      // Build the hook token to match what the workflow created
      const hookToken = ticketId
        ? `escalation:gorgias:${ticketId}`
        : `escalation:${escalationId}`;

      const approval: EscalationApproval = {
        action: approved === false ? 'closed' : 'resolved',
        agentEmail: agentEmail || 'unknown',
        resolution: resolution || note || undefined,
        note: note || undefined,
      };

      await resumeHook(hookToken, approval);

      return NextResponse.json({
        success: true,
        message: `Escalation ${approval.action}`,
        hookToken,
      });
    } catch (error) {
      console.error('[Escalation API] Resume error:', error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Failed to resume escalation' },
        { status: 500 }
      );
    }
  }

  // ============================================
  // Start a new escalation workflow
  // ============================================
  try {
    const body: EscalationWorkflowInput = await request.json();

    if (!body.customerEmail || !body.reason) {
      return NextResponse.json(
        { error: 'customerEmail and reason are required' },
        { status: 400 }
      );
    }

    const run = await start(escalationWorkflow, [body]);

    return NextResponse.json({
      success: true,
      message: 'Escalation workflow started',
      runId: run.runId,
    }, { status: 201 });
  } catch (error) {
    console.error('[Escalation API] Start error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start escalation' },
      { status: 500 }
    );
  }
}
