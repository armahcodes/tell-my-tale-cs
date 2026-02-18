/**
 * Gorgias Webhook Handling
 * Verify and process webhooks from Gorgias
 * 
 * Documentation: https://developers.gorgias.com/docs/webhooks
 */

import { createHmac, timingSafeEqual } from 'crypto';
import type {
  GorgiasWebhookPayload,
  GorgiasWebhookEventType,
  GorgiasTicket,
  GorgiasMessage,
  GorgiasCustomer,
} from './types';

// Webhook secret from environment
const WEBHOOK_SECRET = process.env.GORGIAS_WEBHOOK_SECRET || '';

/**
 * Verify webhook signature from Gorgias
 * Gorgias uses HMAC-SHA256 for webhook signatures
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string | null
): boolean {
  if (!signature || !WEBHOOK_SECRET) {
    console.warn('Webhook signature verification skipped: missing signature or secret');
    return false;
  }

  try {
    const expectedSignature = createHmac('sha256', WEBHOOK_SECRET)
      .update(payload)
      .digest('hex');

    // Use timing-safe comparison to prevent timing attacks
    const signatureBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');

    if (signatureBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(signatureBuffer, expectedBuffer);
  } catch (error) {
    console.error('Webhook signature verification error:', error);
    return false;
  }
}

/**
 * Parse webhook payload from Gorgias
 */
export function parseWebhookPayload(body: string | object): GorgiasWebhookPayload {
  const payload = typeof body === 'string' ? JSON.parse(body) : body;
  
  return {
    event: payload.event as GorgiasWebhookEventType,
    timestamp: payload.timestamp || new Date().toISOString(),
    data: {
      ticket: payload.ticket || payload.data?.ticket,
      message: payload.message || payload.data?.message,
      customer: payload.customer || payload.data?.customer,
      previous: payload.previous || payload.data?.previous,
    },
  };
}

/**
 * Webhook event handlers type
 */
export interface WebhookHandlers {
  onTicketCreated?: (ticket: GorgiasTicket) => Promise<void>;
  onTicketUpdated?: (ticket: GorgiasTicket, previous?: Record<string, unknown>) => Promise<void>;
  onTicketMessageCreated?: (message: GorgiasMessage, ticket?: GorgiasTicket) => Promise<void>;
  onTicketAssigned?: (ticket: GorgiasTicket) => Promise<void>;
  onTicketUnassigned?: (ticket: GorgiasTicket) => Promise<void>;
  onCustomerCreated?: (customer: GorgiasCustomer) => Promise<void>;
  onCustomerUpdated?: (customer: GorgiasCustomer) => Promise<void>;
}

/**
 * Process a webhook event
 */
export async function processWebhookEvent(
  payload: GorgiasWebhookPayload,
  handlers: WebhookHandlers
): Promise<{ processed: boolean; event: GorgiasWebhookEventType }> {
  const { event, data } = payload;

  switch (event) {
    case 'ticket-created':
      if (data.ticket && handlers.onTicketCreated) {
        await handlers.onTicketCreated(data.ticket);
      }
      break;

    case 'ticket-updated':
      if (data.ticket && handlers.onTicketUpdated) {
        await handlers.onTicketUpdated(data.ticket, data.previous);
      }
      break;

    case 'ticket-message-created':
      if (data.message && handlers.onTicketMessageCreated) {
        await handlers.onTicketMessageCreated(data.message, data.ticket);
      }
      break;

    case 'ticket-assigned':
      if (data.ticket && handlers.onTicketAssigned) {
        await handlers.onTicketAssigned(data.ticket);
      }
      break;

    case 'ticket-unassigned':
      if (data.ticket && handlers.onTicketUnassigned) {
        await handlers.onTicketUnassigned(data.ticket);
      }
      break;

    case 'customer-created':
      if (data.customer && handlers.onCustomerCreated) {
        await handlers.onCustomerCreated(data.customer);
      }
      break;

    case 'customer-updated':
      if (data.customer && handlers.onCustomerUpdated) {
        await handlers.onCustomerUpdated(data.customer);
      }
      break;

    default:
      console.log(`Unhandled webhook event: ${event}`);
      return { processed: false, event };
  }

  return { processed: true, event };
}

/**
 * Extract relevant info from webhook for logging
 */
export function getWebhookEventSummary(payload: GorgiasWebhookPayload): string {
  const { event, data, timestamp } = payload;

  let summary = `[${timestamp}] ${event}`;

  if (data.ticket) {
    summary += ` - Ticket #${data.ticket.id} (${data.ticket.status})`;
    if (data.ticket.customer?.email) {
      summary += ` - Customer: ${data.ticket.customer.email}`;
    }
  }

  if (data.message) {
    summary += ` - Message #${data.message.id}`;
  }

  if (data.customer) {
    summary += ` - Customer #${data.customer.id} (${data.customer.email})`;
  }

  return summary;
}

/**
 * Check if webhook is from a TellMyTale-created ticket
 */
export function isFromTellMyTale(ticket: GorgiasTicket): boolean {
  return ticket.meta?.source === 'tellmytale_ai';
}

/**
 * Extract conversation ID from ticket metadata
 */
export function getConversationIdFromTicket(ticket: GorgiasTicket): string | undefined {
  return ticket.meta?.conversation_id as string | undefined;
}

/**
 * Extract order info from ticket metadata
 */
export function getOrderInfoFromTicket(ticket: GorgiasTicket): { orderId?: string; orderNumber?: string } {
  return {
    orderId: ticket.meta?.shopify_order_id as string | undefined,
    orderNumber: ticket.meta?.order_number as string | undefined,
  };
}
