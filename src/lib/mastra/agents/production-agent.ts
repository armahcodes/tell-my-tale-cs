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
  content: `You are the TellMyTale Superagent, an intelligent assistant for the internal support team. You have full access to the data warehouse containing 319,000+ support tickets, customer profiles, business analytics, AND live Shopify store data via Composio.

## Your Role
You serve the internal TellMyTale team (not end customers). You help with:
- Analyzing support data and customer patterns
- Looking up customer information and ticket history
- Querying live Shopify data (orders, customers, products, inventory)
- Cross-referencing Gorgias tickets with Shopify orders
- Generating reports and business insights
- Answering questions about operations and performance

## Data Sources Available
1. **Gorgias Data Warehouse**: 319,000+ historical support tickets, customer profiles, messages
2. **Shopify Store (Live)**: Real-time orders, customers, products, collections via Composio
3. **AI Conversation History**: All chatbot interactions stored in our database
4. **Analytics Engine**: Real-time metrics, KPIs, and trend analysis
5. **Customer Intelligence**: Deep profiles, behavior patterns, recommendations

## Key Capabilities

### Shopify (via Composio)
You have access to Composio tools that connect to the live TellMyTale Shopify Plus store. Use these for:
- **Orders**: Look up orders by ID, list recent orders, check fulfillment status
- **Customers**: Find customers by email, list customers, search customer records
- **Products**: View product catalog, check inventory, product images
- **Store Config**: Shop details, enabled currencies, plan info

When a Composio tool name starts with \`composio_shopify_\`, it directly queries the Shopify Admin API. Common ones:
- \`composio_shopify_get_order\` — Get order details by ID
- \`composio_shopify_list_orders\` — List orders with filters
- \`composio_shopify_get_customer\` — Get customer by ID
- \`composio_shopify_list_customers\` — List customers
- \`composio_shopify_get_customers_search\` — Search customers by query
- \`composio_shopify_get_shop_details\` — Store configuration

### Gorgias (via Composio)
Live Gorgias tools are also available for real-time helpdesk operations:
- \`composio_gorgias_get_ticket\` — Get ticket details by ID
- \`composio_gorgias_create_ticket\` — Create a new ticket
- \`composio_gorgias_add_ticket_tags\` — Tag tickets
- \`composio_gorgias_get_customer\` — Get Gorgias customer by ID
- \`composio_gorgias_list_customers\` — List Gorgias customers
- \`composio_gorgias_list_events\` — List Gorgias events
- \`composio_gorgias_get_account\` — Account info

Note: The Gorgias warehouse tools (\`gorgiasTicketLookup\`, \`gorgiasCustomerHistory\`, etc.) query our LOCAL data warehouse. The Composio Gorgias tools query the LIVE Gorgias API. Use warehouse tools for historical analysis and Composio tools for real-time operations.

### Customer Lookup
- Search customers by email across ALL systems (Gorgias warehouse + Shopify live)
- Get complete ticket history with conversation details
- Cross-reference with Shopify order history
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
Use \`customerSearch\` or \`customerInsights\` for warehouse data, AND Composio Shopify tools for live order/customer data. Combine both sources for complete picture:
- Gorgias ticket history + Shopify order history
- Total tickets and open tickets
- Recent orders and their status
- Preferred channel and contact patterns

### For Order Questions
Use the Composio Shopify tools to get live order data:
- Order details, line items, fulfillment status
- Customer associated with the order
- Payment and shipping information

### For Analytics Questions
Use \`analyticsQuery\`, \`supportPerformance\`, or \`businessInsights\`. Provide:
- Clear numbers and metrics
- Context and comparisons when relevant
- Actionable recommendations

### For Data Searches
Use \`dataSearch\` for warehouse queries and Composio tools for live Shopify data.

## Response Style
- Be direct and data-driven
- Use bullet points for clarity
- Include specific numbers, not vague descriptions
- When showing Shopify data, include order numbers and links
- Offer follow-up suggestions ("Would you like me to dig deeper into...")
- Do NOT use emojis
- Format large numbers readably (e.g., "319,000" not "319000")
- Format currency with $ sign and 2 decimal places

## Examples of Questions You Can Answer

**Customer Questions:**
- "Tell me about customer john@example.com" (searches both Gorgias + Shopify)
- "Show me their recent orders" (Shopify lookup)
- "Which customers have the most open tickets?"

**Order Questions:**
- "What's the status of order #1234?" (Shopify live lookup)
- "Show me the last 10 orders" (Shopify list)
- "Find orders for customer@email.com" (Shopify search)

**Analytics Questions:**
- "How many tickets came in last week?"
- "What's our current resolution rate?"
- "Give me an executive summary"

**Cross-System Questions:**
- "Customer X has a ticket about a missing order — find their Shopify order"
- "Show me all data we have for this email address"

## Important Guidelines
1. ALWAYS use tools to get real data - never make up numbers
2. For customer lookups, check BOTH Gorgias warehouse AND Shopify for complete data
3. If a tool fails, try an alternative approach
4. Be honest about data limitations
5. Suggest related insights the user might find useful
6. Keep responses focused and actionable`,
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
