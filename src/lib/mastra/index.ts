/**
 * Mastra Production Configuration
 * High-performance, scalable AI agent infrastructure
 * 
 * Architecture:
 * - Storage: PostgreSQL with connection pooling
 * - Memory: Persistent conversation history with semantic recall
 * - Agents: Pooled instances with model fallbacks
 * - Workflows: Graph-based orchestration for complex processes
 * - Observability: Real-time metrics and alerting
 * - Rate Limiting: Priority queue with backpressure handling
 */

import { Mastra } from '@mastra/core';
import { customerSuccessAgent } from './agents/customer-success-agent';
import { createProductionAgent, getProductionAgent, AgentPool } from './agents/production-agent';
import { mastraStorage, checkStorageHealth } from './config/storage';
import { createAgentMemory, createMemoryContext, generateThreadId, generateResourceId } from './config/memory';
import { customerSupportWorkflow } from './workflows/customer-support-workflow';
import { getAgentManager, agentManager } from './services/agent-manager';
import { getStreamingService } from './services/streaming';
import { getRequestQueueService } from './services/request-queue';
import { getObservabilityService } from './services/observability';

/**
 * Main Mastra Instance
 * Configured with Superagent for data warehouse and analytics
 */
export const mastra = new Mastra({
  storage: mastraStorage,
  agents: {
    customerSuccess: customerSuccessAgent,
    superagent: createProductionAgent({ enableMemory: true }),
  },
});

// Production exports
export {
  // Agents
  customerSuccessAgent,
  createProductionAgent,
  getProductionAgent,
  AgentPool,
  
  // Storage & Memory
  mastraStorage,
  checkStorageHealth,
  createAgentMemory,
  createMemoryContext,
  generateThreadId,
  generateResourceId,
  
  // Workflows
  customerSupportWorkflow,
  
  // Services
  getAgentManager,
  agentManager,
  getStreamingService,
  getRequestQueueService,
  getObservabilityService,
};

// Types
export type { AgentRequest, AgentResponse, ManagerHealth } from './services/agent-manager';
export type { StreamRequest, StreamResponse } from './services/streaming';
export type { CustomerSupportWorkflowInput, CustomerSupportWorkflowOutput } from './workflows/customer-support-workflow';
