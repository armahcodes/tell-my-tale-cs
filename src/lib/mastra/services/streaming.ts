/**
 * Optimized Streaming Service
 * High-performance streaming with backoff, retry, and resilience
 * 
 * Based on: https://mastra.ai/docs/server/mastra-client
 */

import { getProductionAgent, AgentPool } from '../agents/production-agent';
import { getObservabilityService, type AgentMetrics } from './observability';
import { createMemoryContext } from '../config/memory';

export interface StreamConfig {
  maxRetries: number;
  initialBackoffMs: number;
  maxBackoffMs: number;
  backoffMultiplier: number;
  timeoutMs: number;
  enableMetrics: boolean;
}

export interface StreamRequest {
  message: string;
  conversationHistory?: { role: 'user' | 'assistant'; content: string }[];
  customerEmail?: string;
  customerName?: string;
  conversationId?: string;
  orderNumber?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

export interface StreamResponse {
  stream: ReadableStream<Uint8Array>;
  requestId: string;
  conversationId: string;
  agentName: string;
}

const DEFAULT_CONFIG: StreamConfig = {
  maxRetries: 3,
  initialBackoffMs: 1000,
  maxBackoffMs: 30000,
  backoffMultiplier: 2,
  timeoutMs: 60000,
  enableMetrics: true,
};

/**
 * Streaming Service
 * Handles agent streaming with resilience and observability
 */
export class StreamingService {
  private config: StreamConfig;
  private agentPool: AgentPool;
  private observability = getObservabilityService();
  private activeStreams: Map<string, AbortController> = new Map();

  constructor(config: Partial<StreamConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.agentPool = new AgentPool(5); // 5 agent instances for high concurrency
  }

  /**
   * Create a streaming response with retry and backoff
   */
  async createStream(request: StreamRequest): Promise<StreamResponse> {
    const requestId = `stream-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const conversationId = request.conversationId || `conv-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    
    // Start metrics tracking
    let metrics: AgentMetrics | undefined;
    if (this.config.enableMetrics) {
      metrics = this.observability.startRequest(
        'production-customer-success',
        'gpt-4o',
        request.customerEmail
      );
    }

    // Create abort controller for this stream
    const abortController = new AbortController();
    this.activeStreams.set(requestId, abortController);

    // Build context
    const userContext = request.customerEmail
      ? `[System Context: Customer: ${request.customerName || 'User'} (${request.customerEmail})${request.orderNumber ? `, Order: ${request.orderNumber}` : ''}]`
      : '';

    // Format messages
    const formattedMessages = [
      ...(userContext ? [{ role: 'system' as const, content: userContext }] : []),
      ...(request.conversationHistory || []),
      { role: 'user' as const, content: request.message },
    ];

    // Create memory context
    const memoryContext = createMemoryContext({
      conversationId,
      customerEmail: request.customerEmail,
    });

    // Get agent from pool
    const agent = this.agentPool.getAgent();

    // Create stream with retry logic
    const stream = this.createRetryableStream(
      async () => {
        const result = await agent.stream(
          formattedMessages as Parameters<typeof agent.stream>[0],
          {
            maxSteps: 10,
            memory: memoryContext,
            onStepFinish: ({ toolCalls }) => {
              if (metrics && toolCalls) {
                for (const tc of toolCalls) {
                  if ('toolName' in tc) {
                    this.observability.recordToolUsage(metrics, tc.toolName as string);
                  }
                }
              }
            },
          }
        );
        return result.textStream;
      },
      requestId,
      metrics
    );

    return {
      stream,
      requestId,
      conversationId,
      agentName: 'TellMyTale Customer Success',
    };
  }

  /**
   * Create a stream with retry and exponential backoff
   */
  private createRetryableStream(
    streamFactory: () => Promise<AsyncIterable<string>>,
    requestId: string,
    metrics?: AgentMetrics
  ): ReadableStream<Uint8Array> {
    const encoder = new TextEncoder();
    let retryCount = 0;
    let fullResponse = '';
    const toolsUsed: string[] = [];

    return new ReadableStream<Uint8Array>({
      start: async (controller) => {
        const attemptStream = async (): Promise<void> => {
          try {
            const textStream = await streamFactory();
            const reader = textStream[Symbol.asyncIterator]();

            while (true) {
              const { done, value } = await reader.next();
              
              if (done) {
                break;
              }

              if (value) {
                fullResponse += value;
                controller.enqueue(encoder.encode(value));
              }
            }

            // Success - complete metrics
            if (metrics) {
              this.observability.completeRequest(metrics, {
                success: true,
                tokensUsed: estimateTokens(fullResponse),
                toolsUsed: metrics.toolsUsed,
              });
            }

            controller.close();
          } catch (error) {
            // Check if aborted
            if (this.activeStreams.get(requestId)?.signal.aborted) {
              if (metrics) {
                this.observability.completeRequest(metrics, {
                  success: false,
                  errorMessage: 'Request cancelled',
                });
              }
              controller.error(new Error('Stream cancelled'));
              return;
            }

            // Retry logic
            if (retryCount < this.config.maxRetries && isRetryableError(error)) {
              retryCount++;
              const backoffMs = Math.min(
                this.config.initialBackoffMs * Math.pow(this.config.backoffMultiplier, retryCount - 1),
                this.config.maxBackoffMs
              );

              console.log(`[Stream] Retry ${retryCount}/${this.config.maxRetries} after ${backoffMs}ms`);
              
              await sleep(backoffMs);
              return attemptStream();
            }

            // Max retries exceeded or non-retryable error
            if (metrics) {
              this.observability.completeRequest(metrics, {
                success: false,
                errorMessage: error instanceof Error ? error.message : 'Unknown error',
                toolsUsed: metrics.toolsUsed,
              });
            }

            controller.error(error);
          } finally {
            this.activeStreams.delete(requestId);
          }
        };

        attemptStream();
      },
      cancel: () => {
        const controller = this.activeStreams.get(requestId);
        if (controller) {
          controller.abort();
        }
      },
    });
  }

  /**
   * Cancel an active stream
   */
  cancelStream(requestId: string): boolean {
    const controller = this.activeStreams.get(requestId);
    if (controller) {
      controller.abort();
      this.activeStreams.delete(requestId);
      return true;
    }
    return false;
  }

  /**
   * Get active stream count
   */
  getActiveStreamCount(): number {
    return this.activeStreams.size;
  }

  /**
   * Get service health
   */
  getHealth() {
    return {
      activeStreams: this.activeStreams.size,
      agentPoolStatus: this.agentPool.getStatus(),
    };
  }
}

// Helper functions
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    // Retry on transient errors
    return (
      message.includes('rate limit') ||
      message.includes('timeout') ||
      message.includes('network') ||
      message.includes('connection') ||
      message.includes('econnreset') ||
      message.includes('socket') ||
      message.includes('503') ||
      message.includes('502') ||
      message.includes('429')
    );
  }
  return false;
}

function estimateTokens(text: string): number {
  // Rough estimate: ~4 characters per token
  return Math.ceil(text.length / 4);
}

// Singleton instance
let _streamingService: StreamingService | null = null;

export const getStreamingService = (): StreamingService => {
  if (!_streamingService) {
    _streamingService = new StreamingService();
  }
  return _streamingService;
};
