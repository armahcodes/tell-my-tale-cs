/**
 * Production Chat API
 * High-performance streaming endpoint with resilience and observability
 * 
 * Features:
 * - Automatic retry with exponential backoff
 * - Request queuing for high concurrency
 * - Real-time metrics collection
 * - Graceful degradation
 */

import { NextRequest } from 'next/server';
import { dbService } from '@/lib/db/service';
import { auth } from '@/lib/auth/auth';
import { headers } from 'next/headers';
import { agentManager, getObservabilityService } from '@/lib/mastra';

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
  channel?: string;
  category?: string;
  useWorkflow?: boolean;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

export async function POST(req: NextRequest) {
  const observability = getObservabilityService();
  
  try {
    // Get authenticated session (optional - allows both authenticated and guest users)
    let session = null;
    try {
      session = await auth.api.getSession({
        headers: await headers(),
      });
    } catch {
      // Session check failed, continue as guest
    }

    const body: ChatRequestBody = await req.json();
    const { messages, conversationId, orderNumber, channel, useWorkflow, priority } = body;
    
    // Use authenticated user info if available, otherwise use provided info
    const customerEmail = session?.user?.email || body.customerEmail;
    const customerName = session?.user?.name || body.customerName;
    const isAuthenticated = !!session?.user;

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Messages array is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if Vercel AI Gateway API key is configured
    const apiKey = process.env.VERCEL_API_KEY || process.env.AI_GATEWAY_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ 
          error: 'AI Gateway API key not configured',
          details: 'Set VERCEL_API_KEY in environment variables'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create or get conversation if email is provided
    let currentConversationId = conversationId;
    
    if (customerEmail && !currentConversationId && dbService.isAvailable()) {
      const conversation = await dbService.conversations.create({
        customerEmail,
        customerName,
        orderNumber,
        channel: channel || (isAuthenticated ? 'authenticated_chat' : 'web_chat'),
        status: 'active',
      });
      
      if (conversation) {
        currentConversationId = conversation.id;
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

    // Build conversation history for agent
    const conversationHistory = messages.slice(0, -1).map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    try {
      // Use the production agent manager for streaming
      const streamResponse = await agentManager.processStream({
        message: lastUserMessage.content,
        conversationHistory,
        customerEmail,
        customerName,
        conversationId: currentConversationId,
        orderNumber,
        channel: channel || (isAuthenticated ? 'authenticated_chat' : 'web_chat'),
        priority: priority || (isAuthenticated ? 'high' : 'medium'),
        useWorkflow: useWorkflow ?? true, // Enable workflow by default
      });

      // Create wrapper stream to save response to database
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      let fullResponse = '';

      const wrappedStream = new ReadableStream({
        async start(controller) {
          try {
            const reader = streamResponse.stream.getReader();
            
            while (true) {
              const { done, value } = await reader.read();
              
              if (done) {
                break;
              }
              
              if (value) {
                const text = decoder.decode(value, { stream: true });
                fullResponse += text;
                controller.enqueue(value);
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
            console.error('[Chat API] Stream error:', error);
            controller.error(error);
          }
        },
      });
      
      // Build response headers
      const responseHeaders: HeadersInit = {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Request-Id': streamResponse.requestId,
        'X-Agent-Name': streamResponse.agentName,
      };
      
      if (streamResponse.conversationId) {
        responseHeaders['X-Conversation-Id'] = streamResponse.conversationId;
      }
      
      return new Response(wrappedStream, { headers: responseHeaders });
      
    } catch (streamError) {
      console.error('[Chat API] Streaming error:', {
        error: streamError,
        runId: crypto.randomUUID(),
      });
      
      const errorMessage = streamError instanceof Error ? streamError.message : String(streamError);
      
      // Handle specific error types
      if (errorMessage.includes('API key') || errorMessage.includes('Unauthorized') || errorMessage.includes('401')) {
        return new Response(
          JSON.stringify({ 
            error: 'Invalid AI Gateway API key',
            details: 'Check that your API keys are valid'
          }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }
      
      if (errorMessage.includes('Rate limit') || errorMessage.includes('rate limit') || errorMessage.includes('429')) {
        return new Response(
          JSON.stringify({ 
            error: 'Rate limit exceeded',
            details: 'Too many requests. Please try again in a moment.'
          }),
          { status: 429, headers: { 'Content-Type': 'application/json' } }
        );
      }
      
      if (errorMessage.includes('TLS') || errorMessage.includes('ECONNRESET') || errorMessage.includes('network') || errorMessage.includes('socket') || errorMessage.includes('timeout')) {
        return new Response(
          JSON.stringify({ 
            error: 'Connection error',
            details: 'Could not connect to AI service. Please try again.'
          }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      }
      
      throw streamError;
    }
  } catch (error) {
    console.error('[Chat API] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'An error occurred while processing your request',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Health check endpoint
 */
export async function GET() {
  try {
    const health = await agentManager.getHealth();
    const metrics = agentManager.getMetrics();
    
    return new Response(
      JSON.stringify({
        status: health.status,
        components: health.components,
        metrics: {
          requestsPerMinute: metrics.system.requestsPerMinute,
          avgLatencyMs: Math.round(metrics.system.avgLatencyMs),
          p95LatencyMs: Math.round(metrics.system.p95LatencyMs),
          successRate: `${(metrics.system.successRate * 100).toFixed(1)}%`,
          activeStreams: metrics.streaming.activeStreams,
          queuedRequests: metrics.queue.currentQueueSize,
        },
        alerts: metrics.alerts.length,
      }),
      {
        status: health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
