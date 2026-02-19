/**
 * Real-Time Agent Manager Service
 * Central orchestration layer for production agent operations
 * 
 * Features:
 * - Unified interface for all agent operations
 * - Workflow integration for complex processes
 * - Real-time health monitoring
 * - Graceful degradation
 */

import { getStreamingService, type StreamRequest, type StreamResponse } from './streaming';
import { getRequestQueueService } from './request-queue';
import { getObservabilityService } from './observability';
import { getProductionAgent } from '../agents/production-agent';
import { customerSupportWorkflow, type CustomerSupportWorkflowInput } from '../workflows/customer-support-workflow';
import { createMemoryContext } from '../config/memory';
import { mastraStorage } from '../config/storage';

export interface AgentRequest {
  message: string;
  conversationHistory?: { role: 'user' | 'assistant'; content: string }[];
  customerEmail?: string;
  customerName?: string;
  conversationId?: string;
  orderNumber?: string;
  channel?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  useWorkflow?: boolean;
}

export interface AgentResponse {
  success: boolean;
  requestId: string;
  conversationId: string;
  response?: string;
  stream?: ReadableStream<Uint8Array>;
  workflowResult?: {
    intent: string;
    strategy: string;
    priority: string;
  };
  error?: string;
  metrics?: {
    latencyMs: number;
    tokensUsed?: number;
    toolsUsed?: string[];
  };
}

export interface ManagerHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  components: {
    storage: { available: boolean; latencyMs?: number };
    agents: { available: boolean; poolSize: number };
    queue: { healthy: boolean; utilization: number };
    streaming: { activeStreams: number };
    observability: { status: string };
  };
  metrics: {
    requestsPerMinute: number;
    avgLatencyMs: number;
    errorRate: number;
    successRate: number;
  };
}

/**
 * Agent Manager Service
 * Unified interface for production agent operations
 */
export class AgentManagerService {
  private streamingService = getStreamingService();
  private queueService = getRequestQueueService();
  private observability = getObservabilityService();
  private initialized = false;

  /**
   * Initialize the manager
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('[AgentManager] Initializing...');

    // Verify storage connection
    if (mastraStorage) {
      console.log('[AgentManager] Storage configured');
    } else {
      console.warn('[AgentManager] Storage not configured - memory features disabled');
    }

    // Warm up agent pool
    const agent = getProductionAgent();
    console.log(`[AgentManager] Agent ready: ${agent.id}`);

    this.initialized = true;
    console.log('[AgentManager] Initialization complete');
  }

  /**
   * Process a streaming request
   */
  async processStream(request: AgentRequest): Promise<StreamResponse> {
    await this.ensureInitialized();

    // Run workflow analysis if enabled
    let workflowResult;
    if (request.useWorkflow) {
      workflowResult = await this.runWorkflowAnalysis(request);
    }

    // Create stream request
    const streamRequest: StreamRequest = {
      message: request.message,
      conversationHistory: request.conversationHistory,
      customerEmail: request.customerEmail,
      customerName: request.customerName,
      conversationId: request.conversationId,
      orderNumber: request.orderNumber,
      priority: workflowResult?.priority as StreamRequest['priority'] || request.priority,
    };

    return this.streamingService.createStream(streamRequest);
  }

  /**
   * Process a generate request (non-streaming)
   */
  async processGenerate(request: AgentRequest): Promise<AgentResponse> {
    await this.ensureInitialized();

    const requestId = `gen-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const conversationId = request.conversationId || `conv-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const startTime = Date.now();

    // Start metrics
    const metrics = this.observability.startRequest(
      'production-customer-success',
      'gpt-4o',
      request.customerEmail
    );

    try {
      // Run workflow analysis if enabled
      let workflowResult;
      if (request.useWorkflow) {
        workflowResult = await this.runWorkflowAnalysis(request);
      }

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

      // Get agent and generate
      const agent = getProductionAgent();
      const response = await agent.generate(
        formattedMessages as Parameters<typeof agent.generate>[0],
        {
          maxSteps: 10,
          memory: memoryContext,
        }
      );

      const latencyMs = Date.now() - startTime;
      const toolsUsed = response.steps?.flatMap(s => 
        s.toolCalls?.map(tc => ('toolName' in tc ? tc.toolName : '')) || []
      ).filter(Boolean) || [];

      // Complete metrics
      this.observability.completeRequest(metrics, {
        success: true,
        tokensUsed: response.usage?.totalTokens,
        toolsUsed: toolsUsed as string[],
        intent: workflowResult?.intent,
      });

      return {
        success: true,
        requestId,
        conversationId,
        response: response.text || 'I apologize, but I was unable to generate a response.',
        workflowResult: workflowResult ? {
          intent: workflowResult.intent,
          strategy: workflowResult.strategy,
          priority: workflowResult.priority,
        } : undefined,
        metrics: {
          latencyMs,
          tokensUsed: response.usage?.totalTokens,
          toolsUsed: toolsUsed as string[],
        },
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;

      // Complete metrics with error
      this.observability.completeRequest(metrics, {
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        requestId,
        conversationId,
        error: error instanceof Error ? error.message : 'Unknown error',
        metrics: { latencyMs },
      };
    }
  }

  /**
   * Run workflow analysis for intent classification
   */
  private async runWorkflowAnalysis(request: AgentRequest): Promise<{
    intent: string;
    strategy: string;
    priority: string;
  } | undefined> {
    try {
      const workflowInput: CustomerSupportWorkflowInput = {
        message: request.message,
        customerEmail: request.customerEmail,
        customerName: request.customerName,
        orderNumber: request.orderNumber,
        channel: request.channel,
      };

      const run = customerSupportWorkflow.createRun();
      const result = await run.start({ inputData: workflowInput });

      if (result.status === 'success' && result.result) {
        return {
          intent: result.result.intent,
          strategy: result.result.strategy,
          priority: result.result.priority,
        };
      }
    } catch (error) {
      console.error('[AgentManager] Workflow analysis failed:', error);
    }

    return undefined;
  }

  /**
   * Get manager health status
   */
  async getHealth(): Promise<ManagerHealth> {
    const observabilityHealth = this.observability.getHealth();
    const queueHealth = this.queueService.getHealth();
    const streamingHealth = this.streamingService.getHealth();
    const systemMetrics = this.observability.getSystemMetrics();

    // Check storage
    const storageAvailable = !!mastraStorage;

    // Determine overall status
    let status: ManagerHealth['status'] = 'healthy';
    if (!storageAvailable || observabilityHealth.status === 'unhealthy') {
      status = 'unhealthy';
    } else if (observabilityHealth.status === 'degraded' || !queueHealth.healthy) {
      status = 'degraded';
    }

    return {
      status,
      components: {
        storage: { available: storageAvailable },
        agents: {
          available: true,
          poolSize: streamingHealth.agentPoolStatus.poolSize,
        },
        queue: {
          healthy: queueHealth.healthy,
          utilization: queueHealth.queueUtilization,
        },
        streaming: {
          activeStreams: streamingHealth.activeStreams,
        },
        observability: {
          status: observabilityHealth.status,
        },
      },
      metrics: {
        requestsPerMinute: systemMetrics.requestsPerMinute,
        avgLatencyMs: systemMetrics.avgLatencyMs,
        errorRate: systemMetrics.errorRate,
        successRate: systemMetrics.successRate,
      },
    };
  }

  /**
   * Get detailed metrics
   */
  getMetrics() {
    return {
      system: this.observability.getSystemMetrics(),
      queue: this.queueService.getMetrics(),
      streaming: this.streamingService.getHealth(),
      alerts: this.observability.getActiveAlerts(),
    };
  }

  /**
   * Cancel an active stream
   */
  cancelStream(requestId: string): boolean {
    return this.streamingService.cancelStream(requestId);
  }

  /**
   * Ensure manager is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }
}

// Singleton instance
let _agentManager: AgentManagerService | null = null;

export const getAgentManager = (): AgentManagerService => {
  if (!_agentManager) {
    _agentManager = new AgentManagerService();
  }
  return _agentManager;
};

// Export for direct usage
export const agentManager = getAgentManager();
