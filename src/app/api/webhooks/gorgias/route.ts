/**
 * Gorgias Webhook Handler
 * Receives webhook events from Gorgias and triggers durable workflows.
 *
 * POST /api/webhooks/gorgias
 */

import { NextRequest, NextResponse } from 'next/server';
import { start } from 'workflow/api';
import { resumeHook } from 'workflow/api';
import {
  verifyWebhookSignature,
  parseWebhookPayload,
  getWebhookEventSummary,
  isFromTellMyTale,
  getConversationIdFromTicket,
  type GorgiasTicket,
  type GorgiasMessage,
  type GorgiasCustomer,
} from '@/lib/gorgias';
import { gorgiasTicketWorkflow, type GorgiasTicketWorkflowInput } from '@/workflows/gorgias-ticket';
import { dbService } from '@/lib/db/service';

/**
 * POST handler for Gorgias webhooks
 */
export async function POST(request: NextRequest) {
  try {
    // Get the raw body for signature verification
    const rawBody = await request.text();

    // Get signature from headers
    const signature = request.headers.get('X-Gorgias-Signature') ||
                      request.headers.get('x-gorgias-signature');

    // Verify webhook signature (if secret is configured)
    const webhookSecret = process.env.GORGIAS_WEBHOOK_SECRET;
    if (webhookSecret && !verifyWebhookSignature(rawBody, signature)) {
      console.error('[Gorgias Webhook] Invalid signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Parse the webhook payload
    const payload = parseWebhookPayload(rawBody);

    // Log the event
    console.log(`[Gorgias Webhook] ${getWebhookEventSummary(payload)}`);

    // Store the webhook event for audit trail
    let eventRecord;
    if (dbService.isAvailable()) {
      eventRecord = await dbService.gorgiasWebhookEvents.create({
        eventType: payload.event,
        resourceId: payload.data.ticket?.id || payload.data.customer?.id || payload.data.message?.id,
        resourceType: payload.data.ticket ? 'ticket' : payload.data.customer ? 'customer' : payload.data.message ? 'message' : undefined,
        payload: payload as unknown as Record<string, unknown>,
      });
    }

    try {
      let processed = false;

      switch (payload.event) {
        // ============================================
        // New ticket — trigger AI analysis workflow
        // ============================================
        case 'ticket-created': {
          const ticket = payload.data.ticket;
          if (ticket && !isFromTellMyTale(ticket)) {
            await triggerTicketWorkflow(ticket);
            processed = true;
          } else if (ticket) {
            console.log('[Gorgias Webhook] Ticket created by TellMyTale, skipping workflow');
          }
          break;
        }

        // ============================================
        // New message on ticket — re-analyze if from customer
        // ============================================
        case 'ticket-message-created': {
          const message = payload.data.message;
          const ticket = payload.data.ticket;
          if (message && ticket && !message.from_agent && !isFromTellMyTale(ticket)) {
            await triggerTicketWorkflow(ticket, message.body_text || message.stripped_text);
            processed = true;
          }

          // Sync agent responses back to local conversations
          if (message?.from_agent && ticket) {
            await syncAgentMessage(message, ticket);
          }
          break;
        }

        // ============================================
        // Ticket updated — sync status, resume escalation hooks
        // ============================================
        case 'ticket-updated': {
          const ticket = payload.data.ticket;
          if (ticket) {
            await handleTicketUpdated(ticket, payload.data.previous);
            processed = true;
          }
          break;
        }

        // ============================================
        // Ticket assigned — update local records
        // ============================================
        case 'ticket-assigned': {
          const ticket = payload.data.ticket;
          if (ticket) {
            await handleTicketAssigned(ticket);
            processed = true;
          }
          break;
        }

        case 'ticket-unassigned':
          console.log(`[Gorgias Webhook] Ticket #${payload.data.ticket?.id} unassigned`);
          processed = true;
          break;

        case 'customer-created':
        case 'customer-updated':
          console.log(`[Gorgias Webhook] Customer ${payload.event}: ${payload.data.customer?.email}`);
          processed = true;
          break;

        default:
          console.log(`[Gorgias Webhook] Unhandled event: ${payload.event}`);
      }

      // Mark event as processed
      if (eventRecord && dbService.isAvailable()) {
        await dbService.gorgiasWebhookEvents.markProcessed(eventRecord.id);
      }

      return NextResponse.json({ success: true, processed, event: payload.event });
    } catch (processingError) {
      console.error('[Gorgias Webhook] Processing error:', processingError);

      if (eventRecord && dbService.isAvailable()) {
        await dbService.gorgiasWebhookEvents.markProcessed(
          eventRecord.id,
          processingError instanceof Error ? processingError.message : 'Unknown error'
        );
      }

      // Return 200 to acknowledge receipt (prevents Gorgias retries)
      return NextResponse.json({ success: false, error: 'Processing failed, event logged' });
    }
  } catch (error) {
    console.error('[Gorgias Webhook] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ============================================
// Workflow Triggers
// ============================================

async function triggerTicketWorkflow(ticket: GorgiasTicket, messageText?: string) {
  const input: GorgiasTicketWorkflowInput = {
    ticketId: ticket.id,
    customerEmail: ticket.customer?.email || '',
    customerName: ticket.customer?.name,
    subject: ticket.subject || undefined,
    latestMessageText: messageText || ticket.excerpt || undefined,
    channel: ticket.channel,
    autoReply: false, // Internal notes only by default — enable per policy
  };

  try {
    await start(gorgiasTicketWorkflow, [input]);
    console.log(`[Gorgias Webhook] Started ticket workflow for #${ticket.id}`);
  } catch (error) {
    console.error(`[Gorgias Webhook] Failed to start ticket workflow for #${ticket.id}:`, error);
  }
}

// ============================================
// Event Handlers
// ============================================

async function handleTicketUpdated(ticket: GorgiasTicket, previous?: Record<string, unknown>) {
  console.log(`[Gorgias Webhook] Ticket updated: #${ticket.id} - Status: ${ticket.status}`);

  if (!dbService.isAvailable()) return;

  // Update local escalation record if it exists
  const escalation = await dbService.escalations.getByGorgiasTicketId(ticket.id);

  if (escalation) {
    await dbService.escalations.updateGorgiasStatus(ticket.id, ticket.status);

    // If ticket is closed, try to resume the escalation workflow hook
    if (ticket.status === 'closed' && ticket.closed_datetime) {
      await dbService.escalations.resolve(
        escalation.id,
        'Resolved in Gorgias',
        ticket.assignee_user?.email || 'Gorgias Agent'
      );

      // Resume the escalation workflow hook
      try {
        await resumeHook(`escalation:gorgias:${ticket.id}`, {
          action: 'resolved' as const,
          agentEmail: ticket.assignee_user?.email || 'unknown',
          resolution: 'Ticket closed in Gorgias',
        });
        console.log(`[Gorgias Webhook] Resumed escalation hook for ticket #${ticket.id}`);
      } catch {
        // Hook may not exist if escalation was created before workflow system
      }
    }
  }

  // Update linked conversation status
  const conversationId = getConversationIdFromTicket(ticket);
  if (conversationId && ticket.status === 'closed') {
    await dbService.conversations.updateStatus(conversationId, 'resolved');
  }
}

async function handleTicketAssigned(ticket: GorgiasTicket) {
  console.log(`[Gorgias Webhook] Ticket #${ticket.id} assigned to ${ticket.assignee_user?.email}`);

  if (!dbService.isAvailable()) return;

  const escalation = await dbService.escalations.getByGorgiasTicketId(ticket.id);
  if (escalation && ticket.assignee_user?.email) {
    await dbService.escalations.assign(escalation.id, ticket.assignee_user.email);
  }
}

async function syncAgentMessage(message: GorgiasMessage, ticket: GorgiasTicket) {
  if (!dbService.isAvailable()) return;

  const conversationId = getConversationIdFromTicket(ticket);
  if (conversationId) {
    await dbService.messages.create({
      conversationId,
      role: 'assistant',
      content: `[Agent Response via Gorgias] ${message.body_text || ''}`,
      toolsUsed: ['gorgias_response'],
    });
    console.log(`[Gorgias Webhook] Synced agent message to conversation: ${conversationId}`);
  }
}

/**
 * GET handler for webhook verification
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Gorgias webhook endpoint active',
    workflows: ['gorgias-ticket', 'escalation'],
  });
}
