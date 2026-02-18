/**
 * Gorgias Webhook Handler
 * Receives and processes webhook events from Gorgias
 * 
 * POST /api/webhooks/gorgias
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  verifyWebhookSignature,
  parseWebhookPayload,
  processWebhookEvent,
  getWebhookEventSummary,
  isFromTellMyTale,
  getConversationIdFromTicket,
  type WebhookHandlers,
  type GorgiasTicket,
  type GorgiasMessage,
  type GorgiasCustomer,
} from '@/lib/gorgias';
import { dbService } from '@/lib/db/service';

/**
 * Webhook event handlers
 */
const handlers: WebhookHandlers = {
  /**
   * Handle ticket created events
   * Used for tickets created in Gorgias directly (not from our escalation tool)
   */
  onTicketCreated: async (ticket: GorgiasTicket) => {
    console.log(`[Gorgias Webhook] Ticket created: #${ticket.id}`);
    
    // If the ticket was created from TellMyTale, we already have the record
    if (isFromTellMyTale(ticket)) {
      console.log('[Gorgias Webhook] Ticket was created by TellMyTale, skipping');
      return;
    }
    
    // For tickets created directly in Gorgias, we could optionally create
    // a corresponding conversation record if needed
    // This is optional based on your sync strategy
  },

  /**
   * Handle ticket updated events
   * Syncs status changes back to our escalation records
   */
  onTicketUpdated: async (ticket: GorgiasTicket, previous?: Record<string, unknown>) => {
    console.log(`[Gorgias Webhook] Ticket updated: #${ticket.id} - Status: ${ticket.status}`);
    
    // Update local escalation record if it exists
    const escalation = await dbService.escalations.getByGorgiasTicketId(ticket.id);
    
    if (escalation) {
      // Update the Gorgias status
      await dbService.escalations.updateGorgiasStatus(ticket.id, ticket.status);
      
      // If ticket is closed, also update resolution info
      if (ticket.status === 'closed' && ticket.closed_datetime) {
        await dbService.escalations.resolve(
          escalation.id,
          'Resolved in Gorgias',
          ticket.assignee_user?.email || 'Gorgias Agent'
        );
      }
      
      console.log(`[Gorgias Webhook] Updated local escalation: ${escalation.id}`);
    }
    
    // If this ticket is linked to a conversation, update conversation status
    const conversationId = getConversationIdFromTicket(ticket);
    if (conversationId) {
      if (ticket.status === 'closed') {
        await dbService.conversations.updateStatus(conversationId, 'resolved');
      }
    }
  },

  /**
   * Handle new message created on ticket
   */
  onTicketMessageCreated: async (message: GorgiasMessage, ticket?: GorgiasTicket) => {
    console.log(`[Gorgias Webhook] New message on ticket #${message.ticket_id}`);
    
    // If the message is from an agent, we could optionally sync it back
    // to our conversation history or take other actions
    if (message.from_agent && ticket) {
      const conversationId = getConversationIdFromTicket(ticket);
      
      if (conversationId) {
        // Optionally add agent response to our message history
        // This creates a record of agent responses in our system
        await dbService.messages.create({
          conversationId,
          role: 'assistant', // We could use 'agent' if we add that role
          content: `[Agent Response via Gorgias] ${message.body_text || ''}`,
          toolsUsed: ['gorgias_response'],
        });
        
        console.log(`[Gorgias Webhook] Synced agent message to conversation: ${conversationId}`);
      }
    }
  },

  /**
   * Handle ticket assigned events
   */
  onTicketAssigned: async (ticket: GorgiasTicket) => {
    console.log(`[Gorgias Webhook] Ticket #${ticket.id} assigned to ${ticket.assignee_user?.email}`);
    
    // Update local escalation if it exists
    const escalation = await dbService.escalations.getByGorgiasTicketId(ticket.id);
    
    if (escalation && ticket.assignee_user?.email) {
      await dbService.escalations.assign(escalation.id, ticket.assignee_user.email);
      console.log(`[Gorgias Webhook] Updated local escalation assignment: ${escalation.id}`);
    }
  },

  /**
   * Handle ticket unassigned events
   */
  onTicketUnassigned: async (ticket: GorgiasTicket) => {
    console.log(`[Gorgias Webhook] Ticket #${ticket.id} unassigned`);
    // Could update local escalation to remove assignment
  },

  /**
   * Handle customer created events
   */
  onCustomerCreated: async (customer: GorgiasCustomer) => {
    console.log(`[Gorgias Webhook] Customer created: ${customer.email}`);
    // Could sync customer data to our system if needed
  },

  /**
   * Handle customer updated events
   */
  onCustomerUpdated: async (customer: GorgiasCustomer) => {
    console.log(`[Gorgias Webhook] Customer updated: ${customer.email}`);
    // Could sync customer updates if needed
  },
};

/**
 * POST handler for Gorgias webhooks
 */
export async function POST(request: NextRequest) {
  try {
    // Get the raw body for signature verification
    const rawBody = await request.text();
    
    // Get signature from headers
    // Gorgias uses X-Gorgias-Signature header
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
    const eventRecord = await dbService.gorgiasWebhookEvents.create({
      eventType: payload.event,
      resourceId: payload.data.ticket?.id || payload.data.customer?.id || payload.data.message?.id,
      resourceType: payload.data.ticket ? 'ticket' : 
                    payload.data.customer ? 'customer' : 
                    payload.data.message ? 'message' : undefined,
      payload: payload as unknown as Record<string, unknown>,
    });
    
    // Process the webhook event
    try {
      const { processed, event } = await processWebhookEvent(payload, handlers);
      
      // Mark event as processed
      if (eventRecord) {
        await dbService.gorgiasWebhookEvents.markProcessed(eventRecord.id);
      }
      
      return NextResponse.json({
        success: true,
        processed,
        event,
      });
    } catch (processingError) {
      console.error('[Gorgias Webhook] Processing error:', processingError);
      
      // Mark event as failed
      if (eventRecord) {
        await dbService.gorgiasWebhookEvents.markProcessed(
          eventRecord.id,
          processingError instanceof Error ? processingError.message : 'Unknown error'
        );
      }
      
      // Still return 200 to acknowledge receipt (prevents retries)
      // The error is logged and can be handled later
      return NextResponse.json({
        success: false,
        error: 'Processing failed, event logged',
      });
    }
  } catch (error) {
    console.error('[Gorgias Webhook] Error:', error);
    
    // Return 500 only for truly unexpected errors
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET handler for webhook verification (some services use this)
 */
export async function GET(request: NextRequest) {
  // Return a simple confirmation that the endpoint exists
  return NextResponse.json({
    status: 'ok',
    message: 'Gorgias webhook endpoint active',
  });
}
