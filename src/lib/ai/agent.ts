import { streamText, generateText, CoreMessage } from 'ai';
import { createGateway } from '@ai-sdk/gateway';
import { agentTools } from './tools';

// Configure Vercel AI Gateway
const gateway = createGateway({
  baseURL: 'https://ai-gateway.vercel.sh/v1/ai',
  apiKey: process.env.AI_GATEWAY_API_KEY ?? '',
});

const SYSTEM_PROMPT = `You are an AI-powered Customer Success Agent for TellMyTale, a company that creates personalized children's books. You have access to powerful tools that let you query the Gorgias support ticket data warehouse and Shopify orders.

## Your Role
You help the support team by:
1. Looking up customer information and ticket history
2. Finding relevant past conversations and resolutions
3. Providing order status and shipping information
4. Analyzing support trends and patterns
5. Giving context on customer interactions

## Available Tools
- **ticketLookup**: Search tickets by email, ID, keyword, or status
- **customerLookup**: Find customer profiles and their ticket history
- **ticketMessages**: Get full conversation history for any ticket
- **warehouseStats**: Get overview statistics of the support data
- **orderLookup**: Look up Shopify order details
- **searchTicketsByDate**: Find tickets within a date range

## Guidelines
1. Always use tools to get accurate data - never make up information
2. When looking up a customer, also check their ticket history for context
3. Summarize ticket conversations clearly, highlighting the key issue and resolution
4. If you find relevant past tickets, mention them as they may help with similar issues
5. Be concise but thorough in your responses
6. Format data clearly using bullet points or tables when appropriate

## Communication Style
- Professional but friendly
- Data-driven - always cite specific tickets/orders
- Proactive - offer relevant related information
- Clear - structure complex information well`;

export interface AgentOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

/**
 * Stream a response from the AI agent
 */
export async function streamAgentResponse(
  messages: CoreMessage[],
  options: AgentOptions = {}
) {
  const { model = 'openai/gpt-4o', maxTokens = 2048, temperature = 0.7 } = options;

  return streamText({
    model: gateway(model),
    system: SYSTEM_PROMPT,
    messages,
    tools: agentTools,
    maxTokens,
    temperature,
    maxSteps: 10, // Allow up to 10 tool calls
  });
}

/**
 * Generate a complete response from the AI agent (non-streaming)
 */
export async function generateAgentResponse(
  messages: CoreMessage[],
  options: AgentOptions = {}
) {
  const { model = 'openai/gpt-4o', maxTokens = 2048, temperature = 0.7 } = options;

  return generateText({
    model: gateway(model),
    system: SYSTEM_PROMPT,
    messages,
    tools: agentTools,
    maxTokens,
    temperature,
    maxSteps: 10,
  });
}

/**
 * Simple chat function for quick queries
 */
export async function chat(userMessage: string, options: AgentOptions = {}) {
  const messages: CoreMessage[] = [{ role: 'user', content: userMessage }];
  const result = await generateAgentResponse(messages, options);
  return result.text;
}

export { agentTools };
