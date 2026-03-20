/**
 * Gorgias Integration & Widget Setup
 * Programmatically registers TellMyTale as an HTTP integration
 * and creates the sidebar widget in Gorgias.
 *
 * Docs: https://developers.gorgias.com/docs/create-integrations-and-widgets-programmatically
 */

import { gorgiasPost, gorgiasGet, gorgiasDelete, isGorgiasConfigured } from './client';

// ============================================
// Types
// ============================================

interface GorgiasIntegration {
  id: number;
  name: string;
  type: string;
  description: string | null;
  uri: string;
  deactivated_datetime: string | null;
  http?: {
    url: string;
    method: string;
    headers: Record<string, string>;
    triggers: Record<string, boolean>;
    request_content_type: string;
    response_content_type: string;
  };
}

interface GorgiasWidget {
  id: number;
  context: string;
  type: string;
  integration_id: number | null;
  order: number;
  template: WidgetTemplate;
}

interface WidgetTemplate {
  type: string;
  widgets: WidgetNode[];
}

interface WidgetNode {
  type: string;
  path?: string;
  title?: string;
  order?: number;
  meta?: {
    displayCard?: boolean;
    link?: string;
    limit?: number;
    orderBy?: 'asc' | 'desc';
    custom?: {
      links?: { url: string; label: string }[];
      buttons?: { label: string; action: Record<string, unknown> }[];
    };
  };
  widgets?: WidgetNode[];
}

// ============================================
// Integration Setup
// ============================================

/**
 * Create the HTTP integration in Gorgias that points to our widget endpoint.
 * Gorgias will call this endpoint whenever a ticket is opened/updated.
 */
export async function createIntegration(): Promise<GorgiasIntegration> {
  const baseUrl = process.env.TELLMYTALE_BASE_URL;
  if (!baseUrl) {
    throw new Error('TELLMYTALE_BASE_URL environment variable is required');
  }

  const widgetSecret = process.env.GORGIAS_WIDGET_SECRET || '';
  const headers: Record<string, string> = {
    'Accept': 'application/json',
  };
  if (widgetSecret) {
    headers['X-TellMyTale-Key'] = widgetSecret;
  }

  return gorgiasPost<GorgiasIntegration>('/integrations', {
    name: 'TellMyTale AI',
    description: 'AI-powered customer support context and insights from TellMyTale',
    type: 'http',
    http: {
      url: `${baseUrl}/api/gorgias/widget?email={{ticket.customer.email}}`,
      method: 'GET',
      headers,
      triggers: {
        'ticket-created': true,
        'ticket-updated': true,
        'ticket-message-created': true,
      },
      request_content_type: 'application/json',
      response_content_type: 'application/json',
    },
  });
}

/**
 * Create the sidebar widget that renders integration data in the ticket view.
 */
export async function createWidget(integrationId: number): Promise<GorgiasWidget> {
  const gorgiasBaseUrl = process.env.GORGIAS_DOMAIN
    ? `https://${process.env.GORGIAS_DOMAIN}.gorgias.com`
    : '';
  const dashboardUrl = process.env.TELLMYTALE_BASE_URL || '';

  const template: WidgetTemplate = {
    type: 'wrapper',
    widgets: [
      // Card 1: Customer Overview
      {
        type: 'card',
        path: '',
        title: 'TellMyTale AI',
        order: 0,
        meta: {
          displayCard: true,
          ...(dashboardUrl ? { link: `${dashboardUrl}/dashboard/customers?search={{ticket.customer.email}}` } : {}),
        },
        widgets: [
          {
            type: 'text',
            path: 'customer_name',
            title: 'Customer',
          },
          {
            type: 'text',
            path: 'lifetime_tickets',
            title: 'Lifetime Tickets',
          },
          {
            type: 'text',
            path: 'open_tickets',
            title: 'Open Tickets',
          },
          {
            type: 'text',
            path: 'customer_since',
            title: 'Customer Since',
          },
          {
            type: 'text',
            path: 'shopify_customer_id',
            title: 'Shopify ID',
          },
        ],
      },

      // Card 2: AI Assistant Status
      {
        type: 'card',
        path: '',
        title: 'AI Assistant',
        order: 1,
        meta: { displayCard: true },
        widgets: [
          {
            type: 'text',
            path: 'ai_active_conversations',
            title: 'Active Conversations',
          },
          {
            type: 'text',
            path: 'ai_latest_sentiment',
            title: 'Sentiment',
          },
          {
            type: 'boolean',
            path: 'ai_has_escalation',
            title: 'Pending Escalation',
          },
          {
            type: 'text',
            path: 'ai_total_conversations',
            title: 'Total AI Conversations',
          },
        ],
      },

      // Card 3: Support Metrics
      {
        type: 'card',
        path: '',
        title: 'Support Metrics',
        order: 2,
        meta: { displayCard: true },
        widgets: [
          {
            type: 'text',
            path: 'avg_response_time',
            title: 'Avg Response Time',
          },
          {
            type: 'text',
            path: 'avg_resolution_time',
            title: 'Avg Resolution Time',
          },
        ],
      },

      // Card 4: Recent Tickets (list)
      {
        type: 'card',
        path: '',
        title: 'Recent Tickets',
        order: 3,
        meta: { displayCard: true },
        widgets: [
          {
            type: 'list',
            path: 'recent_tickets',
            title: 'Tickets',
            meta: { limit: 5 },
            widgets: [
              {
                type: 'text',
                path: 'subject',
                title: 'Subject',
              },
              {
                type: 'text',
                path: 'status',
                title: 'Status',
              },
              {
                type: 'text',
                path: 'priority',
                title: 'Priority',
              },
              {
                type: 'text',
                path: 'created_at',
                title: 'Created',
              },
            ],
          },
        ],
      },

      // Card 5: Shopify Orders (live data)
      {
        type: 'card',
        path: '',
        title: 'Shopify Orders',
        order: 4,
        meta: { displayCard: true },
        widgets: [
          {
            type: 'text',
            path: 'shopify_orders_count',
            title: 'Recent Orders',
          },
          {
            type: 'list',
            path: 'recent_orders',
            title: 'Orders',
            meta: { limit: 5 },
            widgets: [
              {
                type: 'text',
                path: 'name',
                title: 'Order',
              },
              {
                type: 'text',
                path: 'total',
                title: 'Total',
              },
              {
                type: 'text',
                path: 'fulfillment',
                title: 'Fulfillment',
              },
              {
                type: 'text',
                path: 'date',
                title: 'Date',
              },
            ],
          },
        ],
      },

      // Card 6: Quick Actions
      {
        type: 'card',
        path: '',
        title: 'Quick Actions',
        order: 5,
        meta: {
          displayCard: true,
          custom: {
            links: [
              ...(dashboardUrl
                ? [{
                    url: `${dashboardUrl}/dashboard/customers?search={{ticket.customer.email}}`,
                    label: 'View in TellMyTale',
                  }]
                : []),
            ],
          },
        },
        widgets: [],
      },
    ],
  };

  return gorgiasPost<GorgiasWidget>('/widgets', {
    context: 'ticket',
    type: 'http',
    integration_id: integrationId,
    order: 0,
    template,
  });
}

// ============================================
// Full Setup / Teardown
// ============================================

/**
 * Set up both the HTTP integration and widget in Gorgias.
 * Returns the created integration and widget IDs.
 */
export async function setupGorgiasApp(): Promise<{
  integration: GorgiasIntegration;
  widget: GorgiasWidget;
}> {
  if (!isGorgiasConfigured()) {
    throw new Error('Gorgias is not configured. Set GORGIAS_DOMAIN, GORGIAS_EMAIL, and GORGIAS_API_KEY.');
  }

  // Check for existing TellMyTale integration
  const existing = await findExistingIntegration();
  if (existing) {
    throw new Error(
      `TellMyTale integration already exists (ID: ${existing.id}). ` +
      'Remove it first with teardownGorgiasApp() or DELETE /api/gorgias/setup.'
    );
  }

  const integration = await createIntegration();
  console.log(`[Gorgias Setup] Integration created: ID ${integration.id}`);

  const widget = await createWidget(integration.id);
  console.log(`[Gorgias Setup] Widget created: ID ${widget.id}`);

  return { integration, widget };
}

/**
 * Find an existing TellMyTale integration in Gorgias.
 */
export async function findExistingIntegration(): Promise<GorgiasIntegration | null> {
  const response = await gorgiasGet<{ data: GorgiasIntegration[] }>('/integrations', {
    per_page: 100,
  });

  return response.data.find(
    (i) => i.name === 'TellMyTale AI' && i.type === 'http' && !i.deactivated_datetime
  ) || null;
}

/**
 * Get all widgets for a given integration.
 */
async function getWidgetsForIntegration(integrationId: number): Promise<GorgiasWidget[]> {
  const response = await gorgiasGet<{ data: GorgiasWidget[] }>('/widgets');
  return response.data.filter((w) => w.integration_id === integrationId);
}

/**
 * Remove the TellMyTale integration and its widgets from Gorgias.
 */
export async function teardownGorgiasApp(): Promise<{ removed: boolean; integrationId?: number; widgetIds?: number[] }> {
  if (!isGorgiasConfigured()) {
    throw new Error('Gorgias is not configured.');
  }

  const integration = await findExistingIntegration();
  if (!integration) {
    return { removed: false };
  }

  // Remove associated widgets first
  const widgets = await getWidgetsForIntegration(integration.id);
  const widgetIds: number[] = [];
  for (const widget of widgets) {
    await gorgiasDelete(`/widgets/${widget.id}`);
    widgetIds.push(widget.id);
    console.log(`[Gorgias Setup] Widget deleted: ID ${widget.id}`);
  }

  // Remove integration
  await gorgiasDelete(`/integrations/${integration.id}`);
  console.log(`[Gorgias Setup] Integration deleted: ID ${integration.id}`);

  return { removed: true, integrationId: integration.id, widgetIds };
}

/**
 * Check current setup status.
 */
export async function getSetupStatus(): Promise<{
  installed: boolean;
  integration: GorgiasIntegration | null;
  widgets: GorgiasWidget[];
}> {
  if (!isGorgiasConfigured()) {
    return { installed: false, integration: null, widgets: [] };
  }

  const integration = await findExistingIntegration();
  if (!integration) {
    return { installed: false, integration: null, widgets: [] };
  }

  const widgets = await getWidgetsForIntegration(integration.id);
  return { installed: true, integration, widgets };
}
