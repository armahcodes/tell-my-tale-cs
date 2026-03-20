/**
 * Escalation Workflow (Human-in-the-Loop)
 * Durable workflow that creates a Gorgias escalation ticket, then
 * pauses until a human agent approves/resolves it via a hook.
 *
 * Flow:
 *  1. Create Gorgias escalation ticket
 *  2. Record escalation in local DB
 *  3. Pause — wait for agent action via hook
 *  4. Resume with agent's decision
 *  5. Update records and optionally follow up
 */

import { createHook, sleep, FatalError } from 'workflow';
import { gorgiasService } from '@/lib/gorgias/service';
import { isGorgiasConfigured } from '@/lib/gorgias/client';
import { dbService } from '@/lib/db/service';

// ============================================
// Types
// ============================================

export interface EscalationWorkflowInput {
  customerEmail: string;
  customerName?: string;
  reason: string;
  reasonDetails?: string;
  customerSummary: string;
  attemptedSolutions?: string[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  conversationId?: string;
  orderNumber?: string;
  orderId?: string;
  previousMessages?: { role: 'user' | 'assistant'; content: string }[];
}

export interface EscalationApproval {
  action: 'resolved' | 'reassigned' | 'closed';
  agentEmail: string;
  resolution?: string;
  note?: string;
}

export interface EscalationWorkflowResult {
  gorgiasTicketId: number | null;
  gorgiasTicketUrl: string | null;
  escalationId: string | null;
  status: 'resolved' | 'reassigned' | 'closed' | 'failed';
  resolution?: string;
  resolvedBy?: string;
}

// ============================================
// Steps
// ============================================

async function createGorgiasEscalation(input: EscalationWorkflowInput): Promise<{
  ticketId: number;
  ticketUrl: string;
} | null> {
  "use step";

  if (!isGorgiasConfigured()) {
    console.warn('[Escalation] Gorgias not configured, skipping ticket creation');
    return null;
  }

  const ticket = await gorgiasService.createEscalationTicket({
    customerEmail: input.customerEmail,
    customerName: input.customerName,
    reason: input.reason,
    reasonDetails: input.reasonDetails,
    customerSummary: input.customerSummary,
    attemptedSolutions: input.attemptedSolutions,
    priority: input.priority,
    conversationId: input.conversationId,
    orderNumber: input.orderNumber,
    orderId: input.orderId,
    previousMessages: input.previousMessages,
  });

  const ticketUrl = gorgiasService.getTicketUrl(ticket.id);
  return { ticketId: ticket.id, ticketUrl };
}

async function recordEscalation(input: {
  conversationId?: string;
  customerEmail: string;
  reason: string;
  priority: string;
  gorgiasTicketId: number | null;
  gorgiasTicketUrl: string | null;
}): Promise<string | null> {
  "use step";

  if (!dbService.isAvailable()) return null;

  const escalation = await dbService.escalations.create({
    conversationId: input.conversationId,
    customerEmail: input.customerEmail,
    reason: input.reason,
    priority: input.priority as 'low' | 'medium' | 'high' | 'urgent',
    gorgiasTicketId: input.gorgiasTicketId,
    gorgiasTicketUrl: input.gorgiasTicketUrl,
  });

  return escalation?.id || null;
}

async function resolveEscalation(input: {
  escalationId: string | null;
  gorgiasTicketId: number | null;
  action: string;
  resolution?: string;
  agentEmail: string;
}): Promise<void> {
  "use step";

  if (input.escalationId && dbService.isAvailable()) {
    await dbService.escalations.resolve(
      input.escalationId,
      input.resolution || `${input.action} by agent`,
      input.agentEmail,
    );
  }

  // Close the Gorgias ticket if the action is 'closed' or 'resolved'
  if (input.gorgiasTicketId && isGorgiasConfigured() && (input.action === 'closed' || input.action === 'resolved')) {
    await gorgiasService.closeTicket(input.gorgiasTicketId);
  }
}

async function postResolutionNote(
  gorgiasTicketId: number | null,
  resolution: string,
  agentEmail: string,
): Promise<void> {
  "use step";

  if (!gorgiasTicketId || !isGorgiasConfigured()) return;

  await gorgiasService.addInternalNote(
    gorgiasTicketId,
    `**Escalation resolved by ${agentEmail}**\n\n${resolution}`,
  );
}

// ============================================
// Main Workflow
// ============================================

export async function escalationWorkflow(
  input: EscalationWorkflowInput
): Promise<EscalationWorkflowResult> {
  "use workflow";

  // Step 1: Create Gorgias ticket
  const gorgias = await createGorgiasEscalation(input);

  // Step 2: Record in local DB
  const escalationId = await recordEscalation({
    conversationId: input.conversationId,
    customerEmail: input.customerEmail,
    reason: input.reason,
    priority: input.priority,
    gorgiasTicketId: gorgias?.ticketId || null,
    gorgiasTicketUrl: gorgias?.ticketUrl || null,
  });

  // Step 3: Wait for human agent action (pauses workflow — no compute consumed)
  const hookToken = gorgias?.ticketId
    ? `escalation:gorgias:${gorgias.ticketId}`
    : `escalation:${escalationId || Date.now()}`;

  using hook = createHook<EscalationApproval>({ token: hookToken });

  console.log(`[Escalation] Waiting for agent action on hook: ${hookToken}`);

  // Wait up to 7 days for agent response
  const timeoutPromise = sleep("7 days").then((): EscalationApproval => ({
    action: 'closed',
    agentEmail: 'system',
    resolution: 'Auto-closed after 7 days with no response',
  }));

  const hookPromise: Promise<EscalationApproval> = hook.then((v: EscalationApproval) => v);

  const approval = await Promise.race([hookPromise, timeoutPromise]);

  // Step 4: Process the agent's decision
  await resolveEscalation({
    escalationId,
    gorgiasTicketId: gorgias?.ticketId || null,
    action: approval.action,
    resolution: approval.resolution,
    agentEmail: approval.agentEmail,
  });

  // Step 5: Post resolution note to Gorgias
  if (approval.resolution) {
    await postResolutionNote(
      gorgias?.ticketId || null,
      approval.resolution,
      approval.agentEmail,
    );
  }

  return {
    gorgiasTicketId: gorgias?.ticketId || null,
    gorgiasTicketUrl: gorgias?.ticketUrl || null,
    escalationId,
    status: approval.action,
    resolution: approval.resolution,
    resolvedBy: approval.agentEmail,
  };
}
