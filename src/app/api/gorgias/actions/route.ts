/**
 * Gorgias Widget Action Endpoint
 * Handles POST actions triggered by sidebar widget buttons.
 *
 * POST /api/gorgias/actions?action=escalate&ticket_id=123&email=x@y.com
 * POST /api/gorgias/actions?action=ai-response&ticket_id=123&email=x@y.com
 * POST /api/gorgias/actions?action=sync-customer&ticket_id=123&email=x@y.com
 */

import { NextRequest, NextResponse } from 'next/server';
import { gorgiasService } from '@/lib/gorgias/service';
import { isGorgiasConfigured } from '@/lib/gorgias/client';
import { verifyWidgetSecret, getClientIp, createRateLimiter } from '@/lib/gorgias/middleware';
import { invalidateCache } from '@/lib/gorgias/widget-cache';
import { getAgentManager } from '@/lib/mastra/services/agent-manager';
import { escalationWorkflow, type EscalationWorkflowInput } from '@/workflows/escalation';

// Tighter rate limit for mutating actions: 30 req/min
const rateLimiter = createRateLimiter(30);

export async function POST(request: NextRequest) {
  // Auth
  if (!verifyWidgetSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Rate limit
  const ip = getClientIp(request);
  if (!rateLimiter.check(ip)) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }

  // Parse query params (populated by Gorgias template variables)
  const action = request.nextUrl.searchParams.get('action');
  const ticketId = Number(request.nextUrl.searchParams.get('ticket_id'));
  const email = request.nextUrl.searchParams.get('email');
  const customerId = request.nextUrl.searchParams.get('customer_id') || null;
  const performerId = request.nextUrl.searchParams.get('performer_id') || null;

  if (!action || !ticketId || !email) {
    return NextResponse.json(
      { error: 'Missing required params: action, ticket_id, email' },
      { status: 400 }
    );
  }

  if (!isGorgiasConfigured()) {
    return NextResponse.json(
      { error: 'Gorgias is not configured' },
      { status: 503 }
    );
  }

  switch (action) {
    case 'escalate':
      return handleEscalate(ticketId, email, performerId);
    case 'ai-response':
      return handleAiResponse(ticketId, email);
    case 'sync-customer':
      return handleSyncCustomer(ticketId, email, customerId);
    default:
      return NextResponse.json(
        { error: `Unknown action: ${action}` },
        { status: 400 }
      );
  }
}

// ============================================
// Action: Escalate Ticket
// ============================================

async function handleEscalate(
  ticketId: number,
  email: string,
  performerId: string | null
): Promise<NextResponse> {
  try {
    // Fetch ticket + messages for context
    const [ticket, messagesResponse] = await Promise.all([
      gorgiasService.getTicket(ticketId),
      gorgiasService.getMessages(ticketId, { per_page: 10 }),
    ]);

    const previousMessages = messagesResponse.data
      .sort((a, b) => new Date(a.created_datetime).getTime() - new Date(b.created_datetime).getTime())
      .map((m) => ({
        role: (m.from_agent ? 'assistant' : 'user') as 'user' | 'assistant',
        content: m.body_text || m.stripped_text || '',
      }))
      .filter((m) => m.content);

    // Start escalation workflow
    const workflowInput: EscalationWorkflowInput = {
      customerEmail: email,
      customerName: ticket.customer?.name,
      reason: 'agent_escalation',
      reasonDetails: `Escalated by agent (${performerId || 'unknown'}) from Gorgias ticket #${ticketId}`,
      customerSummary: `Customer ${email} — Ticket: ${ticket.subject || '(no subject)'}`,
      priority: (ticket.priority as EscalationWorkflowInput['priority']) || 'medium',
      previousMessages,
    };

    // Import start dynamically to avoid issues if workflow/api isn't available
    const { start } = await import('workflow/api');
    const run = await start(escalationWorkflow, [workflowInput]);

    // Set priority to urgent and add internal note
    await Promise.all([
      gorgiasService.setTicketPriority(ticketId, 'urgent'),
      gorgiasService.addInternalNote(
        ticketId,
        `Ticket escalated to management by agent (${performerId || 'unknown'}) via TellMyTale sidebar.`
      ),
    ]);

    return NextResponse.json({
      message: `Ticket #${ticketId} escalated successfully.`,
      runId: run.runId,
    });
  } catch (error) {
    console.error('[Gorgias Actions] Escalation failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Escalation failed' },
      { status: 500 }
    );
  }
}

// ============================================
// Action: AI Suggested Reply
// ============================================

async function handleAiResponse(
  ticketId: number,
  email: string
): Promise<NextResponse> {
  try {
    // Fetch ticket + messages for context
    const [ticket, messagesResponse] = await Promise.all([
      gorgiasService.getTicket(ticketId),
      gorgiasService.getMessages(ticketId, { per_page: 15 }),
    ]);

    const conversationHistory = messagesResponse.data
      .sort((a, b) => new Date(a.created_datetime).getTime() - new Date(b.created_datetime).getTime())
      .map((m) => ({
        role: (m.from_agent ? 'assistant' : 'user') as 'user' | 'assistant',
        content: m.body_text || m.stripped_text || '',
      }))
      .filter((m) => m.content);

    // Generate AI response
    const agentManager = getAgentManager();
    const result = await agentManager.processGenerate({
      message: `Based on this support ticket conversation, draft a helpful reply to the customer. Ticket subject: "${ticket.subject || '(no subject)'}"`,
      conversationHistory,
      customerEmail: email,
      customerName: ticket.customer?.name,
    });

    if (!result.success || !result.response) {
      return NextResponse.json(
        { error: result.error || 'AI generation failed' },
        { status: 500 }
      );
    }

    // Post as internal note (NOT customer-facing)
    await gorgiasService.addInternalNote(
      ticketId,
      `**AI Suggested Reply (TellMyTale)**\n\n${result.response}\n\n---\n_Generated in ${result.metrics?.latencyMs || 0}ms | Tools: ${result.metrics?.toolsUsed?.join(', ') || 'none'}_`
    );

    return NextResponse.json({
      message: 'AI response posted as internal note.',
      preview: result.response.slice(0, 200) + (result.response.length > 200 ? '...' : ''),
    });
  } catch (error) {
    console.error('[Gorgias Actions] AI response failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'AI response failed' },
      { status: 500 }
    );
  }
}

// ============================================
// Action: Sync Customer Data
// ============================================

async function handleSyncCustomer(
  ticketId: number,
  email: string,
  customerId: string | null
): Promise<NextResponse> {
  try {
    const details: string[] = [];

    // Re-sync customer from Gorgias API to local warehouse
    if (customerId) {
      try {
        const customer = await gorgiasService.getCustomer(Number(customerId));
        await gorgiasService.findOrCreateCustomer(email, {
          name: customer.name,
          firstname: customer.firstname,
          lastname: customer.lastname,
        });
        details.push('Customer profile refreshed');
      } catch (e) {
        details.push(`Customer sync: ${e instanceof Error ? e.message : 'error'}`);
      }
    } else {
      // Try finding the customer by email in Gorgias
      try {
        await gorgiasService.findOrCreateCustomer(email);
        details.push('Customer profile synced by email');
      } catch (e) {
        details.push(`Customer lookup: ${e instanceof Error ? e.message : 'error'}`);
      }
    }

    // Invalidate widget cache so next load fetches fresh data
    invalidateCache(email);
    details.push('Widget cache invalidated');

    // Add internal note confirming sync
    await gorgiasService.addInternalNote(
      ticketId,
      `Customer data sync completed via TellMyTale sidebar:\n- ${details.join('\n- ')}`
    );

    return NextResponse.json({
      message: 'Customer data synced successfully.',
      details,
    });
  } catch (error) {
    console.error('[Gorgias Actions] Customer sync failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Sync failed' },
      { status: 500 }
    );
  }
}
