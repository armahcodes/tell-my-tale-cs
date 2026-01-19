import { mastra } from '@/lib/mastra';
import { NextRequest } from 'next/server';
import { CoreMessage } from 'ai';
import { dbService } from '@/lib/db/service';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequestBody {
  messages: ChatMessage[];
  conversationId?: string;
  customerEmail?: string;
  customerName?: string;
  orderNumber?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: ChatRequestBody = await req.json();
    const { messages, conversationId, customerEmail, customerName, orderNumber } = body;

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Messages array is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if Vercel AI Gateway API key is configured
    const apiKey = process.env.AI_GATEWAY_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ 
          error: 'AI Gateway API key not configured',
          details: 'Set AI_GATEWAY_API_KEY in environment variables (Vercel AI Gateway key starting with vck_)'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const agent = mastra.getAgent('customerSuccess');
    
    if (!agent) {
      return new Response(
        JSON.stringify({ error: 'Agent not found' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create or get conversation if email is provided
    let currentConversationId = conversationId;
    
    if (customerEmail && !currentConversationId && dbService.isAvailable()) {
      // Create a new conversation
      const conversation = await dbService.conversations.create({
        customerEmail,
        customerName,
        orderNumber,
        channel: 'web_chat',
        status: 'active',
      });
      
      if (conversation) {
        currentConversationId = conversation.id;
        // Increment today's stats
        await dbService.stats.incrementConversationCount();
      }
    }

    // Save user message to database
    const lastUserMessage = messages[messages.length - 1];
    if (currentConversationId && lastUserMessage?.role === 'user' && dbService.isAvailable()) {
      await dbService.messages.create({
        conversationId: currentConversationId,
        role: 'user',
        content: lastUserMessage.content,
      });
    }

    // Format messages for the agent
    const formattedMessages: CoreMessage[] = messages.map((msg: ChatMessage) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));

    try {
      // Stream the response using Mastra agent
      const result = await agent.stream(formattedMessages);
      
      // Get the text stream from the result
      const textStream = result.textStream;
      const encoder = new TextEncoder();
      
      // Collect full response for database storage
      let fullResponse = '';
      
      // Create a web-compatible ReadableStream
      const webStream = new ReadableStream({
        async start(controller) {
          try {
            const reader = textStream.getReader();
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              if (value) {
                fullResponse += value;
                controller.enqueue(encoder.encode(value));
              }
            }
            controller.close();
            
            // Save assistant response to database after stream completes
            if (currentConversationId && fullResponse && dbService.isAvailable()) {
              await dbService.messages.create({
                conversationId: currentConversationId,
                role: 'assistant',
                content: fullResponse,
              });
            }
          } catch (error) {
            console.error('Stream error:', error);
            controller.error(error);
          }
        },
      });
      
      // Return the stream as a response with conversation ID in header
      const headers: HeadersInit = {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      };
      
      if (currentConversationId) {
        headers['X-Conversation-Id'] = currentConversationId;
      }
      
      return new Response(webStream, { headers });
    } catch (streamError) {
      console.error('Upstream LLM API error from openai (model: gpt-4o)', { 
        error: streamError,
        runId: crypto.randomUUID(),
        provider: 'openai',
        modelId: 'gpt-4o'
      });
      
      const errorMessage = streamError instanceof Error ? streamError.message : String(streamError);
      
      // Handle specific error types
      if (errorMessage.includes('API key') || errorMessage.includes('Unauthorized') || errorMessage.includes('401')) {
        return new Response(
          JSON.stringify({ 
            error: 'Invalid AI Gateway API key',
            details: 'Check that your AI_GATEWAY_API_KEY is valid in Vercel project settings'
          }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }
      
      if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
        return new Response(
          JSON.stringify({ 
            error: 'Rate limit exceeded',
            details: 'Too many requests. Please try again in a moment.'
          }),
          { status: 429, headers: { 'Content-Type': 'application/json' } }
        );
      }
      
      if (errorMessage.includes('TLS') || errorMessage.includes('ECONNRESET') || errorMessage.includes('network') || errorMessage.includes('socket')) {
        return new Response(
          JSON.stringify({ 
            error: 'Connection error',
            details: 'Could not connect to OpenAI. Please try again.'
          }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      }
      
      throw streamError;
    }
  } catch (error) {
    console.error('Chat API Error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'An error occurred while processing your request',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
