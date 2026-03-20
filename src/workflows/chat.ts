/**
 * Durable Chat Workflow
 * Turns the AI agent chat pipeline into a resumable, retryable workflow.
 *
 * Flow: classify intent → lookup customer → stream AI response → persist
 *
 * Uses Workflow DevKit directives:
 *  "use workflow" — marks the orchestrator as durable
 *  "use step"     — marks each unit of work as retryable
 */

import { FatalError } from 'workflow';
import { getProductionAgent, AgentPool } from '@/lib/mastra/agents/production-agent';
import { createMemoryContext } from '@/lib/mastra/config/memory';
import { dbService } from '@/lib/db/service';

// ============================================
// Types
// ============================================

export interface ChatWorkflowInput {
  messages: { role: 'user' | 'assistant'; content: string }[];
  conversationId?: string;
  customerEmail?: string;
  customerName?: string;
  orderNumber?: string;
  channel?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

export interface ChatWorkflowResult {
  conversationId: string;
  response: string;
  intent: string;
  priority: string;
  toolsUsed: string[];
}

// ============================================
// Steps
// ============================================

async function classifyIntent(message: string): Promise<{
  intent: string;
  confidence: number;
  priority: string;
  strategy: string;
}> {
  "use step";

  const lower = message.toLowerCase();

  if (lower.includes('cancel') || lower.includes('refund')) {
    return { intent: 'order_cancellation', confidence: 0.9, priority: 'high', strategy: 'agent_generation' };
  }
  if (lower.includes('status') || lower.includes('where is') || lower.includes('tracking')) {
    return { intent: 'order_status', confidence: 0.85, priority: 'medium', strategy: 'agent_generation' };
  }
  if (lower.includes('return') || lower.includes('replace') || lower.includes('wrong')) {
    return { intent: 'return_replacement', confidence: 0.85, priority: 'high', strategy: 'agent_generation' };
  }
  if (lower.includes('revision') || lower.includes('change') || lower.includes('edit') || lower.includes('modify')) {
    return { intent: 'revision_request', confidence: 0.8, priority: 'medium', strategy: 'agent_generation' };
  }
  if (lower.includes('ship') || lower.includes('deliver') || lower.includes('arrive')) {
    return { intent: 'shipping_inquiry', confidence: 0.8, priority: 'medium', strategy: 'agent_generation' };
  }
  if (lower.includes('upset') || lower.includes('angry') || lower.includes('disappointed') || message === message.toUpperCase()) {
    return { intent: 'complaint', confidence: 0.85, priority: 'urgent', strategy: 'agent_generation' };
  }
  if (lower.includes('manager') || lower.includes('human') || lower.includes('person')) {
    return { intent: 'escalation_needed', confidence: 0.95, priority: 'urgent', strategy: 'escalation' };
  }

  return { intent: 'general_inquiry', confidence: 0.5, priority: 'medium', strategy: 'agent_generation' };
}

async function ensureConversation(input: {
  conversationId?: string;
  customerEmail?: string;
  customerName?: string;
  orderNumber?: string;
  channel?: string;
}): Promise<string> {
  "use step";

  if (input.conversationId) return input.conversationId;

  if (input.customerEmail && dbService.isAvailable()) {
    const conversation = await dbService.conversations.create({
      customerEmail: input.customerEmail,
      customerName: input.customerName,
      orderNumber: input.orderNumber,
      channel: input.channel || 'web_chat',
      status: 'active',
    });
    if (conversation) {
      await dbService.stats.incrementConversationCount();
      return conversation.id;
    }
  }

  return `conv-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

async function saveUserMessage(conversationId: string, content: string): Promise<void> {
  "use step";

  if (!dbService.isAvailable()) return;
  await dbService.messages.create({
    conversationId,
    role: 'user',
    content,
  });
}

async function generateAgentResponse(input: {
  messages: { role: string; content: string }[];
  conversationId: string;
  customerEmail?: string;
  customerName?: string;
  orderNumber?: string;
  priority?: string;
}): Promise<{ text: string; toolsUsed: string[] }> {
  "use step";

  const userContext = input.customerEmail
    ? `[System Context: Customer: ${input.customerName || 'User'} (${input.customerEmail})${input.orderNumber ? `, Order: ${input.orderNumber}` : ''}${input.priority ? `, Priority: ${input.priority}` : ''}]`
    : '';

  const formattedMessages = [
    ...(userContext ? [{ role: 'system' as const, content: userContext }] : []),
    ...input.messages.map(m => ({ role: m.role as 'user' | 'assistant' | 'system', content: m.content })),
  ];

  const memoryContext = createMemoryContext({
    conversationId: input.conversationId,
    customerEmail: input.customerEmail,
  });

  const agent = getProductionAgent();
  const response = await agent.generate(
    formattedMessages as Parameters<typeof agent.generate>[0],
    {
      maxSteps: 10,
      memory: memoryContext,
    }
  );

  const toolsUsed = response.steps?.flatMap(s =>
    s.toolCalls?.map(tc => ('toolName' in tc ? tc.toolName as string : '')) || []
  ).filter(Boolean) || [];

  if (!response.text) {
    throw new FatalError('Agent returned empty response');
  }

  return { text: response.text, toolsUsed };
}

async function saveAssistantResponse(conversationId: string, content: string): Promise<void> {
  "use step";

  if (!dbService.isAvailable()) return;
  await dbService.messages.create({
    conversationId,
    role: 'assistant',
    content,
  });
}

// ============================================
// Main Workflow
// ============================================

export async function chatWorkflow(input: ChatWorkflowInput): Promise<ChatWorkflowResult> {
  "use workflow";

  const lastMessage = input.messages[input.messages.length - 1];
  if (!lastMessage || lastMessage.role !== 'user') {
    throw new FatalError('Last message must be from user');
  }

  // Step 1: Classify the intent
  const classification = await classifyIntent(lastMessage.content);

  // Step 2: Ensure we have a conversation record
  const conversationId = await ensureConversation({
    conversationId: input.conversationId,
    customerEmail: input.customerEmail,
    customerName: input.customerName,
    orderNumber: input.orderNumber,
    channel: input.channel,
  });

  // Step 3: Persist the user message
  await saveUserMessage(conversationId, lastMessage.content);

  // Step 4: Generate AI response (retryable — up to 3 attempts on LLM failures)
  const { text, toolsUsed } = await generateAgentResponse({
    messages: input.messages,
    conversationId,
    customerEmail: input.customerEmail,
    customerName: input.customerName,
    orderNumber: input.orderNumber,
    priority: classification.priority,
  });

  // Step 5: Persist the assistant response
  await saveAssistantResponse(conversationId, text);

  return {
    conversationId,
    response: text,
    intent: classification.intent,
    priority: classification.priority,
    toolsUsed,
  };
}
