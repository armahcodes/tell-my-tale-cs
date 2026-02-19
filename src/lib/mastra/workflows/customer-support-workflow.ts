/**
 * Customer Support Workflow
 * Simplified workflow for intent classification and routing
 */

import { z } from 'zod';

// Workflow input schema
const workflowInputSchema = z.object({
  message: z.string(),
  customerEmail: z.string().optional(),
  customerName: z.string().optional(),
  orderNumber: z.string().optional(),
  channel: z.string().optional(),
});

// Workflow output schema
const workflowOutputSchema = z.object({
  intent: z.string(),
  strategy: z.string(),
  priority: z.string(),
  templateCategory: z.string().optional(),
  requiresHumanReview: z.boolean(),
  contextSummary: z.string(),
});

export type CustomerSupportWorkflowInput = z.infer<typeof workflowInputSchema>;
export type CustomerSupportWorkflowOutput = z.infer<typeof workflowOutputSchema>;

// Intent types
type Intent = 
  | 'order_cancellation'
  | 'order_status'
  | 'return_replacement'
  | 'revision_request'
  | 'shipping_inquiry'
  | 'product_question'
  | 'complaint'
  | 'general_inquiry'
  | 'escalation_needed';

type Strategy = 'template_response' | 'agent_generation' | 'escalation' | 'hybrid';
type Priority = 'low' | 'medium' | 'high' | 'urgent';

/**
 * Classify the intent of a customer message
 */
function classifyIntent(message: string): { intent: Intent; confidence: number } {
  const messageLower = message.toLowerCase();
  
  // Order cancellation keywords
  if (messageLower.includes('cancel') || messageLower.includes('refund')) {
    return { intent: 'order_cancellation', confidence: 0.9 };
  }
  
  // Order status keywords
  if (messageLower.includes('status') || messageLower.includes('where is') || messageLower.includes('tracking')) {
    return { intent: 'order_status', confidence: 0.85 };
  }
  
  // Return/replacement keywords
  if (messageLower.includes('return') || messageLower.includes('replace') || messageLower.includes('wrong')) {
    return { intent: 'return_replacement', confidence: 0.85 };
  }
  
  // Revision keywords
  if (messageLower.includes('revision') || messageLower.includes('change') || messageLower.includes('edit') || messageLower.includes('modify')) {
    return { intent: 'revision_request', confidence: 0.8 };
  }
  
  // Shipping keywords
  if (messageLower.includes('ship') || messageLower.includes('deliver') || messageLower.includes('arrive')) {
    return { intent: 'shipping_inquiry', confidence: 0.8 };
  }
  
  // Product questions
  if (messageLower.includes('how') || messageLower.includes('what') || messageLower.includes('customize')) {
    return { intent: 'product_question', confidence: 0.7 };
  }
  
  // Complaint detection
  if (messageLower.includes('upset') || messageLower.includes('angry') || messageLower.includes('disappointed') || message === message.toUpperCase()) {
    return { intent: 'complaint', confidence: 0.85 };
  }
  
  // Escalation detection
  if (messageLower.includes('manager') || messageLower.includes('human') || messageLower.includes('person')) {
    return { intent: 'escalation_needed', confidence: 0.95 };
  }

  return { intent: 'general_inquiry', confidence: 0.5 };
}

/**
 * Extract order number from message
 */
function extractOrderNumber(message: string): string | undefined {
  const match = message.match(/\b(\d{5,})\b/);
  return match ? match[1] : undefined;
}

/**
 * Get template category for intent
 */
function getTemplateCategory(intent: Intent): string {
  const mapping: Record<Intent, string> = {
    order_cancellation: 'order_cancellation',
    order_status: 'order_status',
    return_replacement: 'returns_replacement',
    revision_request: 'revisions',
    shipping_inquiry: 'order_status',
    product_question: 'general',
    complaint: 'general',
    general_inquiry: 'general',
    escalation_needed: 'general',
  };
  return mapping[intent];
}

/**
 * Select response strategy based on classification
 */
function selectStrategy(
  intent: Intent,
  confidence: number,
  isVipCustomer: boolean
): { strategy: Strategy; priority: Priority; requiresHumanReview: boolean } {
  // High-confidence intents use templates
  if (confidence >= 0.8 && !['complaint', 'escalation_needed'].includes(intent)) {
    return {
      strategy: 'template_response',
      priority: isVipCustomer ? 'high' : 'medium',
      requiresHumanReview: false,
    };
  }

  // Complaints and escalations need special handling
  if (intent === 'escalation_needed') {
    return {
      strategy: 'escalation',
      priority: 'urgent',
      requiresHumanReview: true,
    };
  }

  if (intent === 'complaint') {
    return {
      strategy: 'hybrid',
      priority: 'high',
      requiresHumanReview: isVipCustomer,
    };
  }

  // Lower confidence uses agent generation
  return {
    strategy: 'agent_generation',
    priority: 'medium',
    requiresHumanReview: false,
  };
}

/**
 * Customer Support Workflow
 * Synchronous workflow for fast intent classification and routing
 */
export const customerSupportWorkflow = {
  id: 'customer-support-workflow',
  inputSchema: workflowInputSchema,
  outputSchema: workflowOutputSchema,

  /**
   * Create a workflow run
   */
  createRun: () => ({
    /**
     * Execute the workflow
     */
    start: async (options: { inputData: CustomerSupportWorkflowInput }): Promise<{
      status: 'success' | 'failed';
      result: CustomerSupportWorkflowOutput;
    }> => {
      const { inputData } = options;

      try {
        // Step 1: Classify intent
        const { intent, confidence } = classifyIntent(inputData.message);

        // Step 2: Extract entities
        const orderNumber = inputData.orderNumber || extractOrderNumber(inputData.message);

        // Step 3: Determine if VIP (for now, assume not)
        const isVipCustomer = false;

        // Step 4: Select strategy
        const { strategy, priority, requiresHumanReview } = selectStrategy(
          intent,
          confidence,
          isVipCustomer
        );

        // Step 5: Get template category
        const templateCategory = getTemplateCategory(intent);

        // Build context summary
        const contextParts = [
          `Intent: ${intent} (${Math.round(confidence * 100)}% confidence)`,
          `Strategy: ${strategy}`,
          inputData.customerEmail ? `Customer: ${inputData.customerEmail}` : 'Guest user',
          orderNumber ? `Order: ${orderNumber}` : null,
          inputData.channel ? `Channel: ${inputData.channel}` : null,
        ].filter(Boolean);

        return {
          status: 'success',
          result: {
            intent,
            strategy,
            priority,
            templateCategory: strategy === 'template_response' ? templateCategory : undefined,
            requiresHumanReview,
            contextSummary: contextParts.join(', '),
          },
        };
      } catch (error) {
        console.error('[Workflow] Error:', error);
        return {
          status: 'failed',
          result: {
            intent: 'general_inquiry',
            strategy: 'agent_generation',
            priority: 'medium',
            requiresHumanReview: false,
            contextSummary: 'Workflow failed, using default routing',
          },
        };
      }
    },
  }),
};
