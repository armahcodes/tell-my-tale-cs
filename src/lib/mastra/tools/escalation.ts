import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { gorgiasService, isGorgiasConfigured } from '@/lib/gorgias';
import { dbService } from '@/lib/db/service';

export const escalationTool = createTool({
  id: 'escalation',
  description: 'Escalate a conversation to a human customer success agent. Use this when the customer requests human assistance, when the issue is outside your capabilities, when high frustration is detected, or after 3 failed resolution attempts.',
  inputSchema: z.object({
    reason: z.enum([
      'customer_requested',
      'high_frustration',
      'outside_capabilities',
      'failed_resolution_attempts',
      'sensitive_situation',
      'refund_request',
      'legal_media_inquiry',
      'quality_complaint',
      'other'
    ]).describe('The reason for escalation'),
    reasonDetails: z.string().describe('Detailed explanation of why escalation is needed'),
    customerSummary: z.string().describe('Brief summary of the customer\'s issue'),
    attemptedSolutions: z.array(z.string()).optional().describe('List of solutions already attempted'),
    customerEmail: z.string().email().describe('Customer email address for the ticket'),
    customerName: z.string().optional().describe('Customer name if known'),
    orderNumber: z.string().optional().describe('Related order number if applicable'),
    orderId: z.string().optional().describe('Related Shopify order ID if applicable'),
    conversationId: z.string().optional().describe('ID of the conversation being escalated'),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).describe('Recommended priority level'),
    sentimentScore: z.number().min(-1).max(1).optional().describe('Customer sentiment score from -1 (very negative) to 1 (very positive)'),
    conversationHistory: z.array(z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string(),
    })).optional().describe('Previous messages in the conversation'),
  }),
  outputSchema: z.object({
    escalationId: z.string(),
    gorgiasTicketId: z.number().optional(),
    gorgiasTicketUrl: z.string().optional(),
    status: z.enum(['created', 'queued', 'assigned']),
    estimatedWaitTime: z.string(),
    message: z.string(),
    nextSteps: z.array(z.string()),
  }),
  execute: async (inputData) => {
    const { 
      reason, 
      reasonDetails, 
      customerSummary, 
      attemptedSolutions, 
      customerEmail,
      customerName,
      orderNumber, 
      orderId,
      conversationId,
      priority, 
      sentimentScore,
      conversationHistory,
    } = inputData;
    
    // Determine estimated wait time based on priority
    const waitTimes: Record<string, string> = {
      urgent: '< 5 minutes',
      high: '5-10 minutes',
      medium: '10-20 minutes',
      low: '20-30 minutes',
    };

    // Generate local escalation ID
    const localEscalationId = `ESC-${Date.now().toString(36).toUpperCase()}`;
    
    let gorgiasTicketId: number | undefined;
    let gorgiasTicketUrl: string | undefined;

    // Try to create Gorgias ticket if configured
    if (isGorgiasConfigured()) {
      try {
        console.log('[Escalation] Creating Gorgias ticket...');
        
        const gorgiasTicket = await gorgiasService.createEscalationTicket({
          customerEmail,
          customerName,
          reason: formatReasonForDisplay(reason),
          reasonDetails,
          customerSummary,
          attemptedSolutions,
          priority,
          conversationId,
          orderNumber,
          orderId,
          previousMessages: conversationHistory,
        });

        gorgiasTicketId = gorgiasTicket.id;
        gorgiasTicketUrl = gorgiasService.getTicketUrl(gorgiasTicket.id);

        console.log('[Escalation] Gorgias ticket created:', {
          ticketId: gorgiasTicketId,
          url: gorgiasTicketUrl,
        });
      } catch (error) {
        console.error('[Escalation] Failed to create Gorgias ticket:', error);
        // Continue without Gorgias ticket - fallback to local only
      }
    } else {
      console.log('[Escalation] Gorgias not configured, creating local ticket only');
    }

    // Create local escalation record in database
    try {
      const escalationRecord = await dbService.escalations.create({
        conversationId: conversationId || undefined,
        status: 'pending',
        priority,
        reason: formatReasonForDisplay(reason),
        reasonDetails,
        customerSummary,
        attemptedSolutions,
        customerEmail,
        customerName,
        orderNumber,
        sentimentScore,
        gorgiasTicketId,
        gorgiasTicketUrl,
        gorgiasStatus: gorgiasTicketId ? 'open' : undefined,
        lastSyncedAt: gorgiasTicketId ? new Date() : undefined,
      });

      if (escalationRecord) {
        console.log('[Escalation] Local record created:', escalationRecord.id);
      }
    } catch (error) {
      console.error('[Escalation] Failed to create local record:', error);
      // Continue - the Gorgias ticket was already created
    }

    // Log the escalation
    console.log('[Escalation] Ticket created:', {
      localId: localEscalationId,
      gorgiasTicketId,
      reason,
      priority,
      customerEmail,
      orderNumber,
      timestamp: new Date().toISOString(),
    });

    // Build next steps
    const nextSteps = [
      'Your request has been flagged for priority handling',
      'A customer success specialist will review your case',
      'You\'ll receive a response via your preferred contact method',
    ];

    if (priority === 'urgent' || priority === 'high') {
      nextSteps.unshift('A senior team member has been notified');
    }

    // Build response message
    let message = '';
    
    switch (reason) {
      case 'customer_requested':
        message = 'I completely understand you\'d like to speak with a team member directly. I\'ve created a priority ticket for you.';
        break;
      case 'high_frustration':
        message = 'I can see this has been frustrating, and I want to make sure you get the best possible help. I\'m connecting you with one of our senior team members.';
        break;
      case 'refund_request':
        message = 'I\'ve escalated your refund request to our team who can process this for you right away.';
        break;
      case 'quality_complaint':
        message = 'I\'m so sorry about the quality issue. I\'ve flagged this as a priority and our team will personally look into this for you.';
        break;
      default:
        message = 'I\'ve escalated your request to our customer success team who will be able to assist you further.';
    }

    // Add ticket reference to message if we have a Gorgias ticket
    if (gorgiasTicketId) {
      message += ` Your ticket number is #${gorgiasTicketId}.`;
    }

    return {
      escalationId: localEscalationId,
      gorgiasTicketId,
      gorgiasTicketUrl,
      status: (priority === 'urgent' ? 'assigned' : 'queued') as 'created' | 'queued' | 'assigned',
      estimatedWaitTime: waitTimes[priority],
      message,
      nextSteps,
    };
  },
});

/**
 * Format the reason enum for display
 */
function formatReasonForDisplay(reason: string): string {
  const reasonMap: Record<string, string> = {
    customer_requested: 'Customer Requested Human',
    high_frustration: 'High Customer Frustration',
    outside_capabilities: 'Outside AI Capabilities',
    failed_resolution_attempts: 'Multiple Resolution Attempts Failed',
    sensitive_situation: 'Sensitive Situation',
    refund_request: 'Refund Request',
    legal_media_inquiry: 'Legal/Media Inquiry',
    quality_complaint: 'Quality Complaint',
    other: 'Other',
  };
  return reasonMap[reason] || reason;
}
