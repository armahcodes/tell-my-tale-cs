/**
 * Production Superagent - TellMyTale Internal Assistant
 * High-performance AI agent for data warehouse queries, analytics, and business intelligence
 * 
 * Based on: https://mastra.ai/docs/agents/overview
 */

import { Agent } from '@mastra/core/agent';
import { gateway } from '@ai-sdk/gateway';
import { createAgentMemory } from '../config/memory';
import { orderLookupTool } from '../tools/order-lookup';
import { faqRetrievalTool } from '../tools/faq-retrieval';
import { productInfoTool } from '../tools/product-info';
import { escalationTool } from '../tools/escalation';
import { shippingTrackerTool } from '../tools/shipping-tracker';
import { 
  gorgiasTicketLookupTool, 
  gorgiasCustomerHistoryTool, 
  gorgiasTicketMessagesTool,
  gorgiasSupportStatsTool,
} from '../tools/gorgias-lookup';
import {
  conversationLookupTool,
  conversationMessagesTool,
  dashboardStatsTool,
  customerSearchTool,
} from '../tools/database-lookup';
import {
  templateSearchTool,
  templatesByCategoryTool,
  applyTemplateTool,
  recommendTemplateTool,
} from '../tools/template-retrieval';
import {
  analyticsQueryTool,
  customerInsightsTool,
  supportPerformanceTool,
  dataSearchTool,
  businessInsightsTool,
} from '../tools/analytics-tools';

/**
 * Superagent System Prompt
 * Designed for internal team use with full data warehouse access
 */
const SUPERAGENT_SYSTEM_PROMPT = {
  role: 'system' as const,
  content: `You are the TellMyTale Superagent, an intelligent assistant for the internal support team. You have full access to the data warehouse containing 319,000+ support tickets, customer profiles, and business analytics.

## Your Role
You serve the internal TellMyTale team (not end customers). You help with:
- Analyzing support data and customer patterns
- Looking up customer information and ticket history
- Generating reports and business insights
- Answering questions about operations and performance
- Helping team members find information quickly

## Data Sources Available
1. **Gorgias Data Warehouse**: 319,000+ historical support tickets, customer profiles, messages
2. **AI Conversation History**: All chatbot interactions stored in our database
3. **Analytics Engine**: Real-time metrics, KPIs, and trend analysis
4. **Customer Intelligence**: Deep profiles, behavior patterns, recommendations

## Key Capabilities

### Customer Lookup
- Search customers by email across ALL systems
- Get complete ticket history with conversation details
- Analyze customer behavior and contact patterns
- Identify high-contact or at-risk customers

### Analytics & Reporting
- Ticket volume by channel, status, date range
- Performance metrics (resolution rate, response time)
- Channel efficiency analysis
- Backlog monitoring and alerts

### Business Intelligence
- Executive summaries and KPIs
- Customer health scoring
- Operational efficiency metrics
- Growth and trend analysis

## How to Respond

### For Customer Lookups
Use \`customerSearch\` or \`customerInsights\` to get comprehensive customer data. Always provide:
- Total tickets and open tickets
- Contact history summary
- Preferred channel
- Any notable patterns

### For Analytics Questions
Use \`analyticsQuery\`, \`supportPerformance\`, or \`businessInsights\`. Provide:
- Clear numbers and metrics
- Context and comparisons when relevant
- Actionable recommendations

### For Data Searches
Use \`dataSearch\` for flexible queries across all sources. Summarize results clearly.

## Response Style
- Be direct and data-driven
- Use bullet points for clarity
- Include specific numbers, not vague descriptions
- Offer follow-up suggestions ("Would you like me to dig deeper into...")
- Do NOT use emojis
- Format large numbers readably (e.g., "319,000" not "319000")

## Examples of Questions You Can Answer

**Customer Questions:**
- "Tell me about customer john@example.com"
- "Which customers have the most open tickets?"
- "Show me this customer's complete history"

**Analytics Questions:**
- "How many tickets came in last week?"
- "What's our current resolution rate?"
- "Which channel gets the most volume?"
- "Give me an executive summary"

**Search Questions:**
- "Find all open tickets from email channel"
- "Search for customers named Sarah"
- "Show me recent escalations"

## Important Guidelines
1. ALWAYS use tools to get real data - never make up numbers
2. If a tool fails, try an alternative approach
3. Be honest about data limitations
4. Suggest related insights the user might find useful
5. Keep responses focused and actionable`,
  providerOptions: {
    anthropic: { cacheControl: { type: 'ephemeral' } },
  },
};

/**
 * Production Agent Configuration
 * 
 * Features:
 * - Model fallback chain for reliability
 * - Memory for conversation persistence
 * - Optimized tool set
 * - Performance monitoring ready
 */
export const createProductionAgent = (options?: {
  enableMemory?: boolean;
  maxSteps?: number;
}) => {
  const memory = options?.enableMemory !== false ? createAgentMemory({
    lastMessages: 30,
    generateTitle: true,
  }) : undefined;

  return new Agent({
    id: 'tellmytale-superagent',
    name: 'TellMyTale Superagent',
    
    // Superagent system prompt for internal team use
    instructions: SUPERAGENT_SYSTEM_PROMPT,
    
    // Model configuration using Vercel AI Gateway
    model: gateway('openai/gpt-4o'),

    // Memory for conversation persistence
    memory,

    // Comprehensive tool set for data warehouse access
    tools: {
      // === ANALYTICS & BUSINESS INTELLIGENCE ===
      analyticsQuery: analyticsQueryTool,
      customerInsights: customerInsightsTool,
      supportPerformance: supportPerformanceTool,
      dataSearch: dataSearchTool,
      businessInsights: businessInsightsTool,
      
      // === GORGIAS DATA WAREHOUSE ===
      gorgiasTicketLookup: gorgiasTicketLookupTool,
      gorgiasCustomerHistory: gorgiasCustomerHistoryTool,
      gorgiasTicketMessages: gorgiasTicketMessagesTool,
      gorgiasSupportStats: gorgiasSupportStatsTool,
      
      // === APP DATABASE ===
      conversationLookup: conversationLookupTool,
      conversationMessages: conversationMessagesTool,
      dashboardStats: dashboardStatsTool,
      customerSearch: customerSearchTool,
      
      // === CUSTOMER SERVICE TOOLS ===
      orderLookup: orderLookupTool,
      faqRetrieval: faqRetrievalTool,
      productInfo: productInfoTool,
      escalation: escalationTool,
      shippingTracker: shippingTrackerTool,
      
      // === RESPONSE TEMPLATES ===
      templateSearch: templateSearchTool,
      templatesByCategory: templatesByCategoryTool,
      applyTemplate: applyTemplateTool,
      recommendTemplate: recommendTemplateTool,
    },
  });
};

/**
 * Singleton production agent instance
 */
let _productionAgent: ReturnType<typeof createProductionAgent> | null = null;

export const getProductionAgent = () => {
  if (!_productionAgent) {
    _productionAgent = createProductionAgent({ enableMemory: true });
  }
  return _productionAgent;
};

/**
 * Agent pool for high concurrency
 * Creates multiple agent instances for parallel processing
 */
export class AgentPool {
  private agents: ReturnType<typeof createProductionAgent>[] = [];
  private currentIndex = 0;
  private readonly poolSize: number;

  constructor(size: number = 5) {
    this.poolSize = size;
    for (let i = 0; i < size; i++) {
      this.agents.push(createProductionAgent({ enableMemory: true }));
    }
  }

  /**
   * Get next agent using round-robin selection
   */
  getAgent(): ReturnType<typeof createProductionAgent> {
    const agent = this.agents[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.poolSize;
    return agent;
  }

  /**
   * Get pool status
   */
  getStatus() {
    return {
      poolSize: this.poolSize,
      currentIndex: this.currentIndex,
    };
  }
}
