/**
 * Agent Orchestration System
 * Handles routing, agent selection, and conversation management
 */

import { Agent } from '@mastra/core/agent';
import { db } from '@/lib/db';
import { aiAgents, agentActivityLogs } from '@/lib/db/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import { customerSuccessAgent } from '../agents/customer-success-agent';

export interface OrchestratorConfig {
  defaultAgentId?: string;
  enableFallback?: boolean;
  logActivity?: boolean;
}

export interface RoutingContext {
  channel?: string;
  category?: string;
  keywords?: string[];
  customerTags?: string[];
  customerEmail?: string;
  message?: string;
  conversationId?: string;
}

export interface AgentConfig {
  id: string;
  name: string;
  model: string;
  fallbackModels: string[];
  temperature: number;
  maxTokens: number;
  systemPrompt: string | null;
  personality: string;
  responseLength: string;
  capabilities: string[];
  allowedTools: string[];
  routingPriority: number;
  routingConditions: {
    channels?: string[];
    categories?: string[];
    keywords?: string[];
    customerTags?: string[];
  } | null;
  isPrimary: boolean;
  isActive: boolean;
}

export class AgentOrchestrator {
  private config: OrchestratorConfig;
  private agentCache: Map<string, Agent> = new Map();
  private defaultAgent: Agent;

  constructor(config: OrchestratorConfig = {}) {
    this.config = {
      enableFallback: true,
      logActivity: true,
      ...config,
    };
    this.defaultAgent = customerSuccessAgent;
  }

  /**
   * Select the best agent for a given context
   */
  async selectAgent(context: RoutingContext): Promise<{ agent: Agent; agentConfig: AgentConfig | null }> {
    if (!db) {
      return { agent: this.defaultAgent, agentConfig: null };
    }

    try {
      // Get all active agents
      const agents = await db.select()
        .from(aiAgents)
        .where(eq(aiAgents.isActive, true))
        .orderBy(desc(aiAgents.isPrimary), aiAgents.routingPriority);

      if (!agents.length) {
        return { agent: this.defaultAgent, agentConfig: null };
      }

      // Find the best matching agent
      for (const agentConfig of agents) {
        const conditions = agentConfig.routingConditions as AgentConfig['routingConditions'];
        
        if (!conditions) {
          // No conditions = matches all
          if (agentConfig.isPrimary) {
            return { agent: this.getOrCreateAgent(agentConfig as AgentConfig), agentConfig: agentConfig as AgentConfig };
          }
          continue;
        }

        let matches = true;

        // Check channel match
        if (conditions.channels?.length && context.channel) {
          matches = matches && conditions.channels.includes(context.channel);
        }

        // Check category match
        if (conditions.categories?.length && context.category) {
          matches = matches && conditions.categories.includes(context.category);
        }

        // Check keyword match
        if (conditions.keywords?.length && context.message) {
          const messageLower = context.message.toLowerCase();
          matches = matches && conditions.keywords.some(kw => messageLower.includes(kw.toLowerCase()));
        }

        // Check customer tag match
        if (conditions.customerTags?.length && context.customerTags?.length) {
          matches = matches && conditions.customerTags.some(tag => context.customerTags!.includes(tag));
        }

        if (matches) {
          return { agent: this.getOrCreateAgent(agentConfig as AgentConfig), agentConfig: agentConfig as AgentConfig };
        }
      }

      // Return primary agent or first active agent
      const primaryAgent = agents.find(a => a.isPrimary) || agents[0];
      return { agent: this.getOrCreateAgent(primaryAgent as AgentConfig), agentConfig: primaryAgent as AgentConfig };
    } catch (error) {
      console.error('Error selecting agent:', error);
      return { agent: this.defaultAgent, agentConfig: null };
    }
  }

  /**
   * Get or create an agent instance from config
   */
  private getOrCreateAgent(config: AgentConfig): Agent {
    const cacheKey = config.id;
    
    // Check cache
    const cached = this.agentCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // For now, we use the default agent but could create dynamic agents
    // In the future, this could create agents with different configurations
    const agent = this.defaultAgent;
    
    this.agentCache.set(cacheKey, agent);
    return agent;
  }

  /**
   * Process a message through the orchestrator
   * Uses the default agent's generate method with proper message formatting
   */
  async processMessage(
    message: string,
    context: RoutingContext,
    conversationHistory: { role: 'user' | 'assistant'; content: string }[] = []
  ): Promise<{
    response: string;
    agentId: string | null;
    agentName: string;
    toolsUsed: string[];
    responseTimeMs: number;
  }> {
    const startTime = Date.now();
    
    // Select the appropriate agent
    const { agent, agentConfig } = await this.selectAgent({
      ...context,
      message,
    });

    try {
      // Format messages for Mastra agent
      const formattedMessages = [
        ...conversationHistory,
        { role: 'user' as const, content: message },
      ];

      // Generate response - cast to satisfy Mastra's MessageListInput type
      const response = await agent.generate(
        formattedMessages as Parameters<typeof agent.generate>[0],
        {
          maxSteps: 10,
        }
      );

      const responseTimeMs = Date.now() - startTime;
      const toolsUsed: string[] = [];
      
      // Extract tool names from steps if available
      if (response.steps) {
        for (const step of response.steps) {
          if (step.toolCalls) {
            for (const tc of step.toolCalls) {
              if ('toolName' in tc && typeof tc.toolName === 'string') {
                toolsUsed.push(tc.toolName);
              }
            }
          }
        }
      }

      // Log activity
      if (this.config.logActivity && db && agentConfig) {
        await this.logActivity({
          agentId: agentConfig.id,
          conversationId: context.conversationId,
          activityType: 'response',
          details: {
            message: message.substring(0, 200),
            toolsUsed,
            tokensUsed: response.usage?.totalTokens,
          },
          responseTimeMs,
          tokensUsed: response.usage?.totalTokens,
          success: true,
        });
      }

      return {
        response: response.text || 'I apologize, but I was unable to generate a response. Please try again.',
        agentId: agentConfig?.id || null,
        agentName: agentConfig?.name || 'TellMyTale Customer Success',
        toolsUsed: [...new Set(toolsUsed)],
        responseTimeMs,
      };
    } catch (error) {
      const responseTimeMs = Date.now() - startTime;
      
      // Log error
      if (this.config.logActivity && db && agentConfig) {
        await this.logActivity({
          agentId: agentConfig.id,
          conversationId: context.conversationId,
          activityType: 'response',
          details: { error: error instanceof Error ? error.message : 'Unknown error' },
          responseTimeMs,
          success: false,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      throw error;
    }
  }

  /**
   * Get the selected agent for a context (for external streaming)
   */
  async getAgentForContext(context: RoutingContext): Promise<{
    agent: Agent;
    agentId: string | null;
    agentName: string;
  }> {
    const { agent, agentConfig } = await this.selectAgent(context);
    return {
      agent,
      agentId: agentConfig?.id || null,
      agentName: agentConfig?.name || 'TellMyTale Customer Success',
    };
  }

  /**
   * Log agent activity
   */
  private async logActivity(data: {
    agentId: string;
    conversationId?: string;
    activityType: string;
    details?: Record<string, unknown>;
    responseTimeMs?: number;
    tokensUsed?: number;
    success: boolean;
    errorMessage?: string;
  }): Promise<void> {
    if (!db) return;

    try {
      await db.insert(agentActivityLogs).values({
        agentId: data.agentId,
        conversationId: data.conversationId || null,
        activityType: data.activityType,
        details: data.details || {},
        responseTimeMs: data.responseTimeMs || null,
        tokensUsed: data.tokensUsed || null,
        success: data.success,
        errorMessage: data.errorMessage || null,
      });

      // Update agent stats
      await db.update(aiAgents)
        .set({
          totalConversations: sql`${aiAgents.totalConversations} + 1`,
          ...(data.success ? { resolvedConversations: sql`${aiAgents.resolvedConversations} + 1` } : {}),
        })
        .where(eq(aiAgents.id, data.agentId));
    } catch (error) {
      console.error('Error logging agent activity:', error);
    }
  }

  /**
   * Get agent performance metrics
   */
  async getAgentMetrics(agentId: string): Promise<{
    totalConversations: number;
    resolvedConversations: number;
    resolutionRate: number;
    avgResponseTimeMs: number;
    recentSuccessRate: number;
  } | null> {
    if (!db) return null;

    try {
      const [agentData] = await db.select()
        .from(aiAgents)
        .where(eq(aiAgents.id, agentId))
        .limit(1);

      if (!agentData) return null;

      // Get recent activity logs
      const recentLogs = await db.select()
        .from(agentActivityLogs)
        .where(eq(agentActivityLogs.agentId, agentId))
        .orderBy(desc(agentActivityLogs.createdAt))
        .limit(100);

      const successCount = recentLogs.filter(l => l.success).length;
      const avgResponseTime = recentLogs
        .filter(l => l.responseTimeMs)
        .reduce((sum, l) => sum + (l.responseTimeMs || 0), 0) / (recentLogs.length || 1);

      return {
        totalConversations: agentData.totalConversations || 0,
        resolvedConversations: agentData.resolvedConversations || 0,
        resolutionRate: agentData.totalConversations 
          ? ((agentData.resolvedConversations || 0) / agentData.totalConversations) * 100 
          : 0,
        avgResponseTimeMs: Math.round(avgResponseTime),
        recentSuccessRate: recentLogs.length 
          ? (successCount / recentLogs.length) * 100 
          : 100,
      };
    } catch (error) {
      console.error('Error getting agent metrics:', error);
      return null;
    }
  }

  /**
   * Clear the agent cache
   */
  clearCache(): void {
    this.agentCache.clear();
  }
}

// Export singleton instance
export const orchestrator = new AgentOrchestrator();
