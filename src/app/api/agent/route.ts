import { NextRequest } from 'next/server';
import { CoreMessage } from 'ai';
import { streamAgentResponse } from '@/lib/ai/agent';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface AgentRequestBody {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export async function POST(req: NextRequest) {
  try {
    const body: AgentRequestBody = await req.json();
    const { messages, model, maxTokens, temperature } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Messages array is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check for Vercel AI Gateway API key
    if (!process.env.AI_GATEWAY_API_KEY) {
      return new Response(
        JSON.stringify({ 
          error: 'AI Gateway API key not configured',
          details: 'Set AI_GATEWAY_API_KEY in environment variables'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Format messages
    const formattedMessages: CoreMessage[] = messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    // Stream the response
    const result = await streamAgentResponse(formattedMessages, {
      model,
      maxTokens,
      temperature,
    });

    // Return as data stream response
    return result.toDataStreamResponse();

  } catch (error) {
    console.error('Agent API Error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Handle specific error types
    if (errorMessage.includes('API key') || errorMessage.includes('Unauthorized')) {
      return new Response(
        JSON.stringify({ error: 'Invalid API key' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    if (errorMessage.includes('rate limit')) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again.' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'An error occurred', details: errorMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
