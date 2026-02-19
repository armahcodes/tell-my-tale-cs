/**
 * Template Retrieval Tools for AI Agent
 * Allows the agent to find and use pre-written response templates
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { 
  responseTemplates, 
  getTemplatesByCategory, 
  searchTemplates,
  fillTemplate,
  TEMPLATE_CATEGORIES,
} from '@/lib/data/response-templates';

/**
 * Search Response Templates
 * Find templates matching a query or scenario
 */
export const templateSearchTool = createTool({
  id: 'templateSearch',
  description: `Search for pre-written response templates. Use this when you need to find an appropriate template for a customer scenario like order cancellation, status updates, returns, or revisions. Returns matching templates with their content.`,
  inputSchema: z.object({
    query: z.string().describe('Search query - describe the scenario (e.g., "order cancellation within 24 hours", "shipped status", "quality issue")'),
    category: z.enum(['order_cancellation', 'order_status', 'returns_replacement', 'revisions', 'general']).optional().describe('Optional: Filter by category'),
  }),
  outputSchema: z.object({
    templates: z.array(z.object({
      id: z.string(),
      name: z.string(),
      category: z.string(),
      subcategory: z.string(),
      body: z.string(),
      variables: z.array(z.string()),
    })),
    count: z.number(),
  }),
  execute: async ({ query, category }) => {
    let results = searchTemplates(query);
    
    if (category) {
      results = results.filter(t => t.category === category);
    }
    
    // Limit to top 3 most relevant
    results = results.slice(0, 3);
    
    return {
      templates: results.map(t => ({
        id: t.id,
        name: t.name,
        category: t.category,
        subcategory: t.subcategory,
        body: t.body,
        variables: t.variables,
      })),
      count: results.length,
    };
  },
});

/**
 * Get Template by Category
 * Retrieve all templates for a specific category
 */
export const templatesByCategoryTool = createTool({
  id: 'templatesByCategory',
  description: `Get all response templates for a specific category. Use when you know the general type of issue (e.g., all cancellation templates, all order status templates).`,
  inputSchema: z.object({
    category: z.enum(['order_cancellation', 'order_status', 'returns_replacement', 'revisions', 'general']).describe('The template category'),
  }),
  outputSchema: z.object({
    templates: z.array(z.object({
      id: z.string(),
      name: z.string(),
      subcategory: z.string(),
      body: z.string(),
      variables: z.array(z.string()),
    })),
    count: z.number(),
  }),
  execute: async ({ category }) => {
    const templates = getTemplatesByCategory(category);
    
    return {
      templates: templates.map(t => ({
        id: t.id,
        name: t.name,
        subcategory: t.subcategory,
        body: t.body,
        variables: t.variables,
      })),
      count: templates.length,
    };
  },
});

/**
 * Apply Template with Variables
 * Fill in a template with customer-specific values
 */
export const applyTemplateTool = createTool({
  id: 'applyTemplate',
  description: `Fill in a response template with customer-specific values. Use after finding an appropriate template to personalize it with the customer's information.`,
  inputSchema: z.object({
    templateId: z.string().describe('The template ID to use'),
    values: z.record(z.string()).describe('Key-value pairs for template variables (e.g., { "customer_name": "John", "order_number": "12345" })'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    filledTemplate: z.string().optional(),
    originalTemplate: z.string().optional(),
    variablesUsed: z.array(z.string()).optional(),
    error: z.string().optional(),
  }),
  execute: async ({ templateId, values }) => {
    const template = responseTemplates.find(t => t.id === templateId);
    
    if (!template) {
      return {
        success: false,
        error: `Template not found: ${templateId}`,
      };
    }
    
    const filledTemplate = fillTemplate(template, values);
    
    return {
      success: true,
      filledTemplate,
      originalTemplate: template.body,
      variablesUsed: template.variables,
    };
  },
});

/**
 * Get Recommended Template
 * Automatically recommend the best template for a scenario
 */
export const recommendTemplateTool = createTool({
  id: 'recommendTemplate',
  description: `Get the best recommended template for a specific customer scenario. Automatically analyzes the situation and returns the most appropriate template. Use this for quick template selection.`,
  inputSchema: z.object({
    scenario: z.enum([
      'cancellation_within_24h',
      'cancellation_after_24h_not_pushed',
      'cancellation_in_production',
      'cancellation_shipped',
      'cancellation_duplicate',
      'status_pre_push',
      'status_in_production',
      'status_shipped',
      'status_delivered',
      'return_wrong_book',
      'return_dissatisfaction',
      'return_quality_issue',
      'return_wrong_address',
      'revision_pending',
      'revision_in_production',
      'general_greeting',
      'general_closing',
      'escalation',
    ]).describe('The specific scenario to get a template for'),
    customerName: z.string().optional().describe('Customer name to pre-fill'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    template: z.object({
      id: z.string(),
      name: z.string(),
      category: z.string(),
      body: z.string(),
      variables: z.array(z.string()),
    }).optional(),
    prefilledBody: z.string().optional(),
    error: z.string().optional(),
  }),
  execute: async ({ scenario, customerName }) => {
    // Map scenarios to template IDs
    const scenarioToTemplateMap: Record<string, string> = {
      'cancellation_within_24h': 'cancel-within-24h',
      'cancellation_after_24h_not_pushed': 'cancel-after-24h-not-pushed',
      'cancellation_in_production': 'cancel-in-production',
      'cancellation_shipped': 'cancel-shipped',
      'cancellation_duplicate': 'cancel-duplicate',
      'status_pre_push': 'status-pre-push',
      'status_in_production': 'status-in-production',
      'status_shipped': 'status-shipped',
      'status_delivered': 'status-delivered',
      'return_wrong_book': 'return-wrong-book',
      'return_dissatisfaction': 'return-dissatisfaction',
      'return_quality_issue': 'return-quality-issue',
      'return_wrong_address': 'return-wrong-address',
      'revision_pending': 'revision-pending',
      'revision_in_production': 'revision-in-production',
      'general_greeting': 'general-greeting',
      'general_closing': 'general-thank-you',
      'escalation': 'general-escalation',
    };
    
    const templateId = scenarioToTemplateMap[scenario];
    if (!templateId) {
      return {
        success: false,
        error: `Unknown scenario: ${scenario}`,
      };
    }
    
    const template = responseTemplates.find(t => t.id === templateId);
    if (!template) {
      return {
        success: false,
        error: `Template not found for scenario: ${scenario}`,
      };
    }
    
    // Pre-fill with customer name if provided
    let prefilledBody = template.body;
    if (customerName) {
      prefilledBody = prefilledBody.replace('[Customer Name]', customerName);
    }
    
    return {
      success: true,
      template: {
        id: template.id,
        name: template.name,
        category: template.category,
        body: template.body,
        variables: template.variables,
      },
      prefilledBody,
    };
  },
});

/**
 * List Available Categories
 * Get all template categories and their descriptions
 */
export const listCategoriesTool = createTool({
  id: 'listTemplateCategories',
  description: `List all available template categories. Use this to understand what types of templates are available before searching.`,
  inputSchema: z.object({}),
  outputSchema: z.object({
    categories: z.array(z.object({
      id: z.string(),
      name: z.string(),
      templateCount: z.number(),
    })),
  }),
  execute: async () => {
    const categories = Object.entries(TEMPLATE_CATEGORIES).map(([key, value]) => {
      const templates = getTemplatesByCategory(value);
      return {
        id: value,
        name: key.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
        templateCount: templates.length,
      };
    });
    
    return { categories };
  },
});
