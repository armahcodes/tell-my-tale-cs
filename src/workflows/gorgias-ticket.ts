/**
 * Gorgias Ticket Workflow
 * Durable workflow triggered when a new ticket or message arrives from Gorgias.
 *
 * Flow:
 *  1. Fetch full ticket + customer context
 *  2. Classify intent
 *  3. Generate AI response
 *  4. Post the response back to Gorgias as an internal note (for agent review)
 *  5. Optionally auto-reply if confidence is high enough
 *
 * Uses Workflow DevKit directives for durability and automatic retries.
 */

import { sleep, FatalError } from 'workflow';
import { gorgiasService } from '@/lib/gorgias/service';
import { isGorgiasConfigured } from '@/lib/gorgias/client';
import { getProductionAgent } from '@/lib/mastra/agents/production-agent';
import { createMemoryContext } from '@/lib/mastra/config/memory';
import { dbService } from '@/lib/db/service';
import { db } from '@/lib/db';
import { gorgiasCustomers, gorgiasTickets, conversations } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

// ============================================
// Types
// ============================================

export interface GorgiasTicketWorkflowInput {
  ticketId: number;
  customerEmail: string;
  customerName?: string;
  subject?: string;
  latestMessageText?: string;
  channel?: string;
  autoReply?: boolean; // If true, sends reply to customer. If false, internal note only.
}

export interface GorgiasTicketWorkflowResult {
  ticketId: number;
  intent: string;
  aiResponse: string;
  postedToGorgias: boolean;
  autoReplied: boolean;
}

// ============================================
// Steps
// ============================================

async function fetchCustomerContext(email: string): Promise<{
  totalTickets: number;
  openTickets: number;
  recentTickets: { id: number; subject: string | null; status: string; createdAt: Date | null }[];
  aiConversations: number;
  sentiment: string;
}> {
  "use step";

  if (!db) {
    return { totalTickets: 0, openTickets: 0, recentTickets: [], aiConversations: 0, sentiment: 'unknown' };
  }

  const [customer, tickets, convos] = await Promise.all([
    db.select().from(gorgiasCustomers).where(eq(gorgiasCustomers.email, email)).limit(1),
    db.select({
      id: gorgiasTickets.id,
      subject: gorgiasTickets.subject,
      status: gorgiasTickets.status,
      createdAt: gorgiasTickets.gorgiasCreatedAt,
    })
      .from(gorgiasTickets)
      .where(eq(gorgiasTickets.customerEmail, email))
      .orderBy(desc(gorgiasTickets.gorgiasCreatedAt))
      .limit(5),
    db.select()
      .from(conversations)
      .where(eq(conversations.customerEmail, email))
      .orderBy(desc(conversations.createdAt))
      .limit(3),
  ]);

  const c = customer[0];
  const latestConvo = convos[0];

  return {
    totalTickets: c?.ticketCount || tickets.length,
    openTickets: c?.openTicketCount || 0,
    recentTickets: tickets,
    aiConversations: convos.length,
    sentiment: latestConvo?.sentiment || 'neutral',
  };
}

async function classifyTicketIntent(input: {
  subject?: string;
  messageText?: string;
  customerContext: Awaited<ReturnType<typeof fetchCustomerContext>>;
}): Promise<{
  intent: string;
  confidence: number;
  suggestedPriority: string;
  shouldAutoReply: boolean;
}> {
  "use step";

  const text = `${input.subject || ''} ${input.messageText || ''}`.toLowerCase();

  // High-intent patterns that are safe for auto-reply
  if (text.includes('where is my order') || text.includes('tracking') || text.includes('order status')) {
    return { intent: 'order_status', confidence: 0.9, suggestedPriority: 'medium', shouldAutoReply: true };
  }
  if (text.includes('cancel') || text.includes('refund')) {
    return { intent: 'order_cancellation', confidence: 0.9, suggestedPriority: 'high', shouldAutoReply: false };
  }
  if (text.includes('return') || text.includes('exchange') || text.includes('wrong item')) {
    return { intent: 'return_replacement', confidence: 0.85, suggestedPriority: 'high', shouldAutoReply: false };
  }
  if (text.includes('damage') || text.includes('broken') || text.includes('defect')) {
    return { intent: 'damaged_product', confidence: 0.9, suggestedPriority: 'urgent', shouldAutoReply: false };
  }

  // Repeat customer with many tickets — flag for careful handling
  if (input.customerContext.totalTickets > 10) {
    return { intent: 'frequent_customer', confidence: 0.7, suggestedPriority: 'high', shouldAutoReply: false };
  }

  return { intent: 'general_inquiry', confidence: 0.5, suggestedPriority: 'medium', shouldAutoReply: false };
}

async function generateTicketResponse(input: {
  ticketId: number;
  subject?: string;
  messageText?: string;
  customerEmail: string;
  customerName?: string;
  intent: string;
  priority: string;
  customerContext: Awaited<ReturnType<typeof fetchCustomerContext>>;
}): Promise<string> {
  "use step";

  const contextLines = [
    `[System Context: Gorgias Ticket #${input.ticketId}]`,
    `[Customer: ${input.customerName || input.customerEmail} (${input.customerEmail})]`,
    `[Intent: ${input.intent} | Priority: ${input.priority}]`,
    `[Customer History: ${input.customerContext.totalTickets} total tickets, ${input.customerContext.openTickets} open, sentiment: ${input.customerContext.sentiment}]`,
    input.customerContext.aiConversations > 0
      ? `[AI Conversations: ${input.customerContext.aiConversations} previous]`
      : '',
  ].filter(Boolean).join('\n');

  const userMessage = [
    input.subject ? `Subject: ${input.subject}` : '',
    input.messageText || '',
  ].filter(Boolean).join('\n\n');

  const agent = getProductionAgent();
  const response = await agent.generate(
    [
      { role: 'system', content: contextLines },
      { role: 'user', content: userMessage },
    ] as Parameters<typeof agent.generate>[0],
    { maxSteps: 8 }
  );

  return response.text || 'Unable to generate a response for this ticket.';
}

async function postInternalNote(ticketId: number, note: string, intent: string): Promise<boolean> {
  "use step";

  if (!isGorgiasConfigured()) return false;

  const formattedNote = [
    `**TellMyTale AI Analysis**`,
    `Intent: ${intent}`,
    `---`,
    note,
  ].join('\n\n');

  await gorgiasService.addInternalNote(ticketId, formattedNote);
  return true;
}

async function postAutoReply(ticketId: number, reply: string, customerEmail: string): Promise<boolean> {
  "use step";

  if (!isGorgiasConfigured()) return false;

  await gorgiasService.addMessage(ticketId, {
    channel: 'api',
    via: 'api',
    body_text: reply,
    from_agent: true,
    public: true,
    sender: {
      name: 'TellMyTale AI',
    },
    receiver: {
      email: customerEmail,
    },
  });

  return true;
}

// ============================================
// Main Workflow
// ============================================

export async function gorgiasTicketWorkflow(
  input: GorgiasTicketWorkflowInput
): Promise<GorgiasTicketWorkflowResult> {
  "use workflow";

  if (!input.ticketId) {
    throw new FatalError('ticketId is required');
  }

  // Step 1: Fetch customer context from local warehouse
  const customerContext = await fetchCustomerContext(input.customerEmail);

  // Step 2: Classify the ticket
  const classification = await classifyTicketIntent({
    subject: input.subject,
    messageText: input.latestMessageText,
    customerContext,
  });

  // Step 3: Generate AI response
  const aiResponse = await generateTicketResponse({
    ticketId: input.ticketId,
    subject: input.subject,
    messageText: input.latestMessageText,
    customerEmail: input.customerEmail,
    customerName: input.customerName,
    intent: classification.intent,
    priority: classification.suggestedPriority,
    customerContext,
  });

  // Step 4: Always post as internal note for agent review
  const posted = await postInternalNote(input.ticketId, aiResponse, classification.intent);

  // Step 5: Auto-reply only if enabled AND confidence is high enough
  let autoReplied = false;
  if (input.autoReply && classification.shouldAutoReply && classification.confidence >= 0.85) {
    autoReplied = await postAutoReply(input.ticketId, aiResponse, input.customerEmail);
  }

  return {
    ticketId: input.ticketId,
    intent: classification.intent,
    aiResponse,
    postedToGorgias: posted,
    autoReplied,
  };
}
