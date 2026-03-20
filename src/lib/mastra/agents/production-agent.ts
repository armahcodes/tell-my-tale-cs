/**
 * Production Superagent - TellMyTale Internal Assistant
 * High-performance AI agent for data warehouse queries, analytics, and business intelligence
 * 
 * Based on: https://mastra.ai/docs/agents/overview
 */

import { Agent } from '@mastra/core/agent';
import { createTool } from '@mastra/core/tools';
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
  content: `You are the TellMyTale Superagent — the internal support team's AI assistant with full access to the data warehouse (319,000+ tickets), live Shopify store, and Gorgias helpdesk via Composio.

## Data Sources
- **Gorgias Warehouse**: Historical tickets, customers, messages (use \`gorgiasTicketLookup\`, \`gorgiasCustomerHistory\`, \`gorgiasSupportStats\`)
- **Shopify Live**: Orders, customers, products, inventory (use \`composio_shopify_*\` tools)
- **Gorgias Live**: Real-time ticket operations (use \`composio_gorgias_*\` tools)
- **App Database**: AI conversations, dashboard stats (use \`conversationLookup\`, \`dashboardStats\`, \`customerSearch\`)
- **Analytics Engine**: KPIs, trends, performance metrics (use \`analyticsQuery\`, \`supportPerformance\`, \`businessInsights\`)

## Tool Routing
- **Customer lookup**: \`customerSearch\` + \`composio_shopify_get_customers_search\` for complete cross-system view
- **Order questions**: \`composio_shopify_get_order\` or \`composio_shopify_list_orders\`
- **Ticket history**: \`gorgiasTicketLookup\` (warehouse) or \`composio_gorgias_get_ticket\` (live)
- **Analytics**: \`analyticsQuery\`, \`supportPerformance\`, \`businessInsights\`, \`dataSearch\`
- **Templates**: \`recommendTemplate\` → \`applyTemplate\` for response drafting

## Response Formatting (STRICT)
Structure every response with clear formatting:

1. **Use headers** (## or ###) to organize sections
2. **Use bullet points** for lists of data points, never wall-of-text
3. **Bold key values**: "**Status**: Fulfilled", "**Total**: $149.99"
4. **Use tables** for comparing multiple items (orders, tickets, metrics)
5. **Format numbers**: commas for thousands (319,000), $ with 2 decimals ($149.99), percentages with 1 decimal (94.2%)
6. **Include a summary line** at the top for complex lookups: a 1-sentence TL;DR
7. **End with a follow-up suggestion**: "Would you like me to..." when appropriate
8. **No emojis**. No filler. Be direct and data-driven.

Example structure for a customer lookup:
\`\`\`
**john@example.com** — 12 lifetime tickets, 2 open, Shopify customer since Jan 2024

### Support History
- **Open tickets**: 2 (shipping inquiry, return request)
- **Total tickets**: 12
- **Preferred channel**: Email

### Recent Orders
| Order | Total | Status | Date |
|-------|-------|--------|------|
| #1234 | $89.99 | Fulfilled | Mar 15 |

### Recommendations
- High-contact customer — consider proactive outreach
\`\`\`

## Guidelines
1. ALWAYS use tools — never fabricate data
2. For customer lookups, query BOTH warehouse AND Shopify
3. If a tool fails, try an alternative approach
4. Be honest about data limitations
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
  composioTools?: Record<string, ReturnType<typeof createTool>>;
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

      // === COMPOSIO EXTERNAL INTEGRATIONS ===
      ...(options?.composioTools || {}),
    },
  });
};

/**
 * Singleton production agent instance
 */
let _productionAgent: ReturnType<typeof createProductionAgent> | null = null;
let _composioToolsLoaded = false;

export const getProductionAgent = () => {
  if (!_productionAgent) {
    _productionAgent = createProductionAgent({ enableMemory: true });
  }
  return _productionAgent;
};

/**
 * Reinitialize the production agent with Composio tools
 * Called once during startup when Composio is configured
 */
export const initProductionAgentWithComposio = (
  composioTools: Record<string, ReturnType<typeof createTool>>
) => {
  if (_composioToolsLoaded && _productionAgent) return _productionAgent;

  _productionAgent = createProductionAgent({
    enableMemory: true,
    composioTools,
  });
  _composioToolsLoaded = true;
  console.log(`[ProductionAgent] Reinitialized with ${Object.keys(composioTools).length} Composio tools`);
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

  constructor(size: number = 5, composioTools?: Record<string, ReturnType<typeof createTool>>) {
    this.poolSize = size;
    for (let i = 0; i < size; i++) {
      this.agents.push(createProductionAgent({ enableMemory: true, composioTools }));
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
