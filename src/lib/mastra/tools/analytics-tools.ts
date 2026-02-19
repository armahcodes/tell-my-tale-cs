import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { dbService } from '@/lib/db/service';

/**
 * Advanced Analytics Query Tool
 * Run complex queries against the data warehouse
 */
export const analyticsQueryTool = createTool({
  id: 'analytics-query',
  description: `Run analytics queries on the support data warehouse. Use this to analyze:
- Ticket volume trends by date, channel, or status
- Customer segmentation (high-contact, VIP, at-risk)
- Response time analysis
- Channel performance comparison
- Agent workload distribution
Ask questions like "How many tickets did we get last week?" or "Which channel has the most tickets?"`,
  inputSchema: z.object({
    queryType: z.enum([
      'ticket_volume_by_date',
      'ticket_volume_by_channel', 
      'ticket_volume_by_status',
      'top_customers_by_tickets',
      'avg_response_time_trend',
      'tickets_by_priority',
      'recent_activity_summary',
    ]).describe('Type of analytics query to run'),
    dateRange: z.object({
      startDate: z.string().optional().describe('Start date (YYYY-MM-DD)'),
      endDate: z.string().optional().describe('End date (YYYY-MM-DD)'),
    }).optional(),
    limit: z.number().optional().default(10).describe('Max results to return'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    data: z.array(z.record(z.string(), z.any())),
    summary: z.string(),
    insights: z.array(z.string()).optional(),
  }),
  execute: async (input) => {
    const { queryType, limit = 10 } = input;

    try {
      switch (queryType) {
        case 'ticket_volume_by_channel': {
          const stats = await dbService.gorgiasWarehouse.getWarehouseStats();
          const data = Object.entries(stats.channelBreakdown).map(([channel, count]) => ({
            channel,
            count,
            percentage: Math.round((count / stats.totalTickets) * 100),
          })).sort((a, b) => b.count - a.count);
          
          const topChannel = data[0];
          return {
            success: true,
            data,
            summary: `Channel breakdown: ${data.map(d => `${d.channel}: ${d.count} (${d.percentage}%)`).join(', ')}`,
            insights: [
              `${topChannel?.channel || 'Email'} is the most used channel with ${topChannel?.percentage || 0}% of tickets`,
              data.length > 1 ? `Consider optimizing resources for top channels` : '',
            ].filter(Boolean),
          };
        }

        case 'ticket_volume_by_status': {
          const stats = await dbService.gorgiasWarehouse.getWarehouseStats();
          const data = [
            { status: 'open', count: stats.openTickets, percentage: Math.round((stats.openTickets / stats.totalTickets) * 100) },
            { status: 'closed', count: stats.closedTickets, percentage: Math.round((stats.closedTickets / stats.totalTickets) * 100) },
          ];
          
          return {
            success: true,
            data,
            summary: `Status breakdown: ${stats.openTickets} open (${data[0].percentage}%), ${stats.closedTickets} closed (${data[1].percentage}%)`,
            insights: [
              stats.openTickets > 100 ? `High backlog: ${stats.openTickets} open tickets need attention` : `Backlog is manageable with ${stats.openTickets} open tickets`,
              `Resolution rate: ${data[1].percentage}%`,
            ],
          };
        }

        case 'top_customers_by_tickets': {
          const result = await dbService.gorgiasWarehouse.getCustomersPaginated(limit, 0);
          const topCustomers = result.customers
            .sort((a, b) => b.computedTicketCount - a.computedTicketCount)
            .slice(0, limit);
          
          const data = topCustomers.map(c => ({
            email: c.email,
            name: c.name || `${c.firstname || ''} ${c.lastname || ''}`.trim() || 'Unknown',
            totalTickets: c.computedTicketCount,
            openTickets: c.computedOpenTicketCount,
          }));

          return {
            success: true,
            data,
            summary: `Top ${data.length} customers by ticket volume`,
            insights: [
              data[0] ? `Highest contact customer: ${data[0].email} with ${data[0].totalTickets} tickets` : '',
              `These customers may need proactive outreach or VIP treatment`,
            ].filter(Boolean),
          };
        }

        case 'recent_activity_summary': {
          const [stats, dashStats] = await Promise.all([
            dbService.gorgiasWarehouse.getWarehouseStats(),
            dbService.stats.getDashboardStats(),
          ]);
          
          const data = [{
            totalTickets: stats.totalTickets,
            openTickets: stats.openTickets,
            closedTickets: stats.closedTickets,
            totalCustomers: stats.totalCustomers,
            totalMessages: stats.totalMessages,
            ticketsToday: stats.ticketsToday,
            aiConversations: dashStats.totalConversations,
            activeChats: dashStats.activeNow,
            avgResponseTime: stats.avgResponseTimeSec ? `${Math.round(stats.avgResponseTimeSec)}s` : 'N/A',
          }];

          return {
            success: true,
            data,
            summary: `Activity summary: ${stats.totalTickets} total tickets (${stats.openTickets} open), ${stats.totalCustomers} customers, ${stats.ticketsToday} tickets today, ${dashStats.totalConversations} AI conversations`,
            insights: [
              stats.ticketsToday > 50 ? 'High ticket volume today - consider additional support coverage' : '',
              dashStats.activeNow > 10 ? `${dashStats.activeNow} active conversations - good engagement` : '',
              stats.openTickets > stats.closedTickets * 0.2 ? 'Open ticket ratio is high - focus on resolution' : 'Good ticket resolution rate',
            ].filter(Boolean),
          };
        }

        default:
          return {
            success: false,
            data: [],
            summary: `Query type '${queryType}' not yet implemented`,
          };
      }
    } catch (error) {
      console.error('Analytics query error:', error);
      return {
        success: false,
        data: [],
        summary: 'Error running analytics query',
      };
    }
  },
});

/**
 * Customer Insights Tool
 * Deep analysis of individual customers
 */
export const customerInsightsTool = createTool({
  id: 'customer-insights',
  description: 'Get deep insights about a specific customer including their support history, behavior patterns, and recommendations. Use for VIP handling or understanding problematic customers.',
  inputSchema: z.object({
    email: z.string().email().describe('Customer email to analyze'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    profile: z.object({
      email: z.string(),
      name: z.string().nullable(),
      customerSince: z.string().nullable(),
      totalTickets: z.number(),
      openTickets: z.number(),
      channels: z.array(z.string()),
      avgTicketsPerMonth: z.number(),
      lastContact: z.string().nullable(),
    }).optional(),
    behavior: z.object({
      contactFrequency: z.string(),
      preferredChannel: z.string().nullable(),
      issueTypes: z.array(z.string()),
      sentiment: z.string(),
    }).optional(),
    recommendations: z.array(z.string()),
    summary: z.string(),
  }),
  execute: async (input) => {
    const { email } = input;

    try {
      const [tickets, customer, conversations] = await Promise.all([
        dbService.gorgiasWarehouse.getTicketsByEmail(email, 100),
        dbService.gorgiasWarehouse.getCustomerByEmail(email),
        dbService.conversations.getByEmail(email, 50),
      ]);

      if (tickets.length === 0 && !customer && conversations.length === 0) {
        return {
          success: false,
          recommendations: [],
          summary: `No data found for customer ${email}. They may be a new customer.`,
        };
      }

      const openTickets = tickets.filter(t => t.status === 'open').length;
      const channels = [...new Set(tickets.map(t => t.channel))];
      const channelCounts = channels.map(ch => ({
        channel: ch,
        count: tickets.filter(t => t.channel === ch).length,
      })).sort((a, b) => b.count - a.count);

      const earliestTicket = tickets.length > 0 
        ? new Date(Math.min(...tickets.map(t => new Date(t.gorgiasCreatedAt).getTime())))
        : null;
      const latestTicket = tickets.length > 0
        ? new Date(Math.max(...tickets.map(t => new Date(t.gorgiasCreatedAt).getTime())))
        : null;

      const monthsAsCustomer = earliestTicket 
        ? Math.max(1, Math.ceil((Date.now() - earliestTicket.getTime()) / (30 * 24 * 60 * 60 * 1000)))
        : 1;
      const avgTicketsPerMonth = Math.round((tickets.length / monthsAsCustomer) * 10) / 10;

      const contactFrequency = avgTicketsPerMonth > 3 ? 'High Contact' 
        : avgTicketsPerMonth > 1 ? 'Regular Contact' 
        : 'Low Contact';

      const recommendations: string[] = [];
      
      if (openTickets > 2) {
        recommendations.push(`Priority: ${openTickets} open tickets need immediate attention`);
      }
      if (avgTicketsPerMonth > 3) {
        recommendations.push('High contact customer - consider proactive outreach to address root causes');
      }
      if (channelCounts[0]?.channel === 'email') {
        recommendations.push('Email preference - ensure timely email responses');
      }
      if (tickets.length > 10 && openTickets === 0) {
        recommendations.push('Long-term customer with resolved issues - potential VIP candidate');
      }

      return {
        success: true,
        profile: {
          email,
          name: customer?.name || `${customer?.firstname || ''} ${customer?.lastname || ''}`.trim() || tickets[0]?.customerName || null,
          customerSince: earliestTicket?.toISOString() || null,
          totalTickets: tickets.length,
          openTickets,
          channels,
          avgTicketsPerMonth,
          lastContact: latestTicket?.toISOString() || null,
        },
        behavior: {
          contactFrequency,
          preferredChannel: channelCounts[0]?.channel || null,
          issueTypes: tickets.slice(0, 5).map(t => t.subject || 'No subject').filter(Boolean),
          sentiment: openTickets > 2 ? 'Needs Attention' : tickets.length > 20 ? 'Engaged' : 'Normal',
        },
        recommendations,
        summary: `${email}: ${tickets.length} total tickets (${openTickets} open), ${contactFrequency.toLowerCase()}, preferred channel: ${channelCounts[0]?.channel || 'N/A'}`,
      };
    } catch (error) {
      console.error('Customer insights error:', error);
      return {
        success: false,
        recommendations: [],
        summary: 'Error analyzing customer',
      };
    }
  },
});

/**
 * Support Performance Tool
 * Analyze team and support performance metrics
 */
export const supportPerformanceTool = createTool({
  id: 'support-performance',
  description: 'Get support performance metrics including resolution rates, response times, and workload distribution. Use to understand team performance and identify bottlenecks.',
  inputSchema: z.object({
    metric: z.enum([
      'overview',
      'resolution_rate',
      'response_times',
      'channel_efficiency',
      'backlog_analysis',
    ]).describe('Performance metric to analyze'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    metrics: z.record(z.string(), z.any()),
    trends: z.array(z.string()),
    recommendations: z.array(z.string()),
    summary: z.string(),
  }),
  execute: async (input) => {
    const { metric } = input;

    try {
      const stats = await dbService.gorgiasWarehouse.getWarehouseStats();
      const dashStats = await dbService.stats.getDashboardStats();

      switch (metric) {
        case 'overview': {
          const resolutionRate = Math.round((stats.closedTickets / stats.totalTickets) * 100);
          
          return {
            success: true,
            metrics: {
              totalTickets: stats.totalTickets,
              openTickets: stats.openTickets,
              closedTickets: stats.closedTickets,
              resolutionRate: `${resolutionRate}%`,
              avgResponseTimeSec: stats.avgResponseTimeSec,
              totalCustomers: stats.totalCustomers,
              totalMessages: stats.totalMessages,
              ticketsToday: stats.ticketsToday,
              aiConversations: dashStats.totalConversations,
              pendingEscalations: dashStats.pendingEscalations,
            },
            trends: [
              `Resolution rate: ${resolutionRate}%`,
              stats.ticketsToday > 0 ? `${stats.ticketsToday} tickets received today` : 'No new tickets today',
            ],
            recommendations: [
              stats.openTickets > 100 ? 'High backlog - prioritize ticket resolution' : '',
              resolutionRate < 80 ? 'Resolution rate below target - review processes' : '',
              dashStats.pendingEscalations > 5 ? `${dashStats.pendingEscalations} pending escalations need attention` : '',
            ].filter(Boolean),
            summary: `Support performance: ${resolutionRate}% resolution rate, ${stats.openTickets} open tickets, ${stats.ticketsToday} new today`,
          };
        }

        case 'backlog_analysis': {
          const backlogRatio = Math.round((stats.openTickets / stats.totalTickets) * 100);
          const avgTicketsPerCustomer = Math.round((stats.totalTickets / Math.max(1, stats.totalCustomers)) * 10) / 10;
          
          return {
            success: true,
            metrics: {
              openTickets: stats.openTickets,
              backlogRatio: `${backlogRatio}%`,
              avgTicketsPerCustomer,
              channelBreakdown: stats.channelBreakdown,
            },
            trends: [
              backlogRatio > 20 ? 'Backlog is growing' : 'Backlog is under control',
              `Average ${avgTicketsPerCustomer} tickets per customer`,
            ],
            recommendations: [
              backlogRatio > 30 ? 'Critical: Focus all resources on clearing backlog' : '',
              backlogRatio > 15 ? 'Consider temporary support capacity increase' : '',
              'Analyze oldest open tickets for patterns',
            ].filter(Boolean),
            summary: `Backlog: ${stats.openTickets} open tickets (${backlogRatio}% of total), ${avgTicketsPerCustomer} avg tickets/customer`,
          };
        }

        case 'channel_efficiency': {
          const channels = Object.entries(stats.channelBreakdown);
          const totalFromChannels = channels.reduce((sum, [, count]) => sum + count, 0);
          
          return {
            success: true,
            metrics: {
              channelBreakdown: stats.channelBreakdown,
              channelPercentages: Object.fromEntries(
                channels.map(([ch, count]) => [ch, `${Math.round((count / totalFromChannels) * 100)}%`])
              ),
            },
            trends: channels.map(([ch, count]) => `${ch}: ${count} tickets (${Math.round((count / totalFromChannels) * 100)}%)`),
            recommendations: [
              'Consider chat automation for common queries',
              'Monitor email response times closely',
            ],
            summary: `Channel distribution across ${channels.length} channels`,
          };
        }

        default:
          return {
            success: false,
            metrics: {},
            trends: [],
            recommendations: [],
            summary: 'Metric not implemented',
          };
      }
    } catch (error) {
      console.error('Support performance error:', error);
      return {
        success: false,
        metrics: {},
        trends: [],
        recommendations: [],
        summary: 'Error analyzing performance',
      };
    }
  },
});

/**
 * Data Search Tool
 * Flexible search across all data sources
 */
export const dataSearchTool = createTool({
  id: 'data-search',
  description: 'Search across all data sources (tickets, customers, conversations) with flexible criteria. Use for finding specific records or investigating issues.',
  inputSchema: z.object({
    searchType: z.enum(['tickets', 'customers', 'conversations', 'all']).describe('What to search'),
    query: z.string().optional().describe('Search query (email, name, or keyword)'),
    status: z.enum(['open', 'closed', 'all']).optional().default('all'),
    limit: z.number().optional().default(20),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    results: z.object({
      tickets: z.array(z.object({
        id: z.number(),
        subject: z.string().nullable(),
        status: z.string(),
        customerEmail: z.string().nullable(),
        channel: z.string(),
        createdAt: z.string(),
      })).optional(),
      customers: z.array(z.object({
        id: z.number(),
        email: z.string().nullable(),
        name: z.string().nullable(),
        ticketCount: z.number(),
      })).optional(),
      conversations: z.array(z.object({
        id: z.string(),
        customerEmail: z.string(),
        status: z.string(),
        messageCount: z.number(),
      })).optional(),
    }),
    totalResults: z.number(),
    summary: z.string(),
  }),
  execute: async (input) => {
    const { searchType, query, status, limit = 20 } = input;

    try {
      const results: {
        tickets?: Array<{
          id: number;
          subject: string | null;
          status: string;
          customerEmail: string | null;
          channel: string;
          createdAt: string;
        }>;
        customers?: Array<{
          id: number;
          email: string | null;
          name: string | null;
          ticketCount: number;
        }>;
        conversations?: Array<{
          id: string;
          customerEmail: string;
          status: string;
          messageCount: number;
        }>;
      } = {};

      let totalResults = 0;

      if (searchType === 'tickets' || searchType === 'all') {
        if (query && query.includes('@')) {
          const tickets = await dbService.gorgiasWarehouse.getTicketsByEmail(query, limit);
          results.tickets = tickets
            .filter(t => status === 'all' || t.status === status)
            .map(t => ({
              id: t.id,
              subject: t.subject,
              status: t.status,
              customerEmail: t.customerEmail,
              channel: t.channel,
              createdAt: t.gorgiasCreatedAt.toISOString(),
            }));
        } else {
          const ticketData = await dbService.gorgiasWarehouse.getTicketsPaginated(
            limit, 
            0, 
            status === 'all' ? undefined : status as 'open' | 'closed'
          );
          results.tickets = ticketData.tickets.map(t => ({
            id: t.id,
            subject: t.subject,
            status: t.status,
            customerEmail: t.customerEmail,
            channel: t.channel,
            createdAt: t.gorgiasCreatedAt.toISOString(),
          }));
        }
        totalResults += results.tickets?.length || 0;
      }

      if (searchType === 'customers' || searchType === 'all') {
        if (query && query.includes('@')) {
          const customer = await dbService.gorgiasWarehouse.getCustomerByEmail(query);
          if (customer) {
            const tickets = await dbService.gorgiasWarehouse.getTicketsByEmail(query, 100);
            results.customers = [{
              id: customer.id,
              email: customer.email,
              name: customer.name || `${customer.firstname || ''} ${customer.lastname || ''}`.trim() || null,
              ticketCount: tickets.length,
            }];
          }
        } else {
          const customerData = await dbService.gorgiasWarehouse.getCustomersPaginated(limit, 0);
          results.customers = customerData.customers.map(c => ({
            id: c.id,
            email: c.email,
            name: c.name || `${c.firstname || ''} ${c.lastname || ''}`.trim() || null,
            ticketCount: c.computedTicketCount,
          }));
        }
        totalResults += results.customers?.length || 0;
      }

      if (searchType === 'conversations' || searchType === 'all') {
        if (query && query.includes('@')) {
          const convos = await dbService.conversations.getByEmail(query, limit);
          results.conversations = convos.map(c => ({
            id: c.id,
            customerEmail: c.customerEmail,
            status: c.status,
            messageCount: c.messageCount || 0,
          }));
        } else {
          const convos = await dbService.conversations.getRecent({ 
            limit, 
            status: status === 'all' ? undefined : status === 'open' ? 'active' : 'resolved',
          });
          results.conversations = convos.map(c => ({
            id: c.id,
            customerEmail: c.customerEmail,
            status: c.status,
            messageCount: c.messageCount || 0,
          }));
        }
        totalResults += results.conversations?.length || 0;
      }

      return {
        success: true,
        results,
        totalResults,
        summary: `Found ${totalResults} results${query ? ` for "${query}"` : ''}`,
      };
    } catch (error) {
      console.error('Data search error:', error);
      return {
        success: false,
        results: {},
        totalResults: 0,
        summary: 'Error searching data',
      };
    }
  },
});

/**
 * Business Insights Tool  
 * Generate high-level business insights and KPIs
 */
export const businessInsightsTool = createTool({
  id: 'business-insights',
  description: 'Generate business insights and KPIs from support data. Use for executive summaries, reports, and strategic decisions.',
  inputSchema: z.object({
    insightType: z.enum([
      'executive_summary',
      'customer_health',
      'operational_efficiency',
      'growth_metrics',
    ]).describe('Type of business insight to generate'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    kpis: z.record(z.string(), z.any()),
    insights: z.array(z.string()),
    actionItems: z.array(z.string()),
    summary: z.string(),
  }),
  execute: async (input) => {
    const { insightType } = input;

    try {
      const [warehouseStats, dashStats] = await Promise.all([
        dbService.gorgiasWarehouse.getWarehouseStats(),
        dbService.stats.getDashboardStats(),
      ]);

      switch (insightType) {
        case 'executive_summary': {
          const resolutionRate = Math.round((warehouseStats.closedTickets / warehouseStats.totalTickets) * 100);
          const avgTicketsPerCustomer = Math.round((warehouseStats.totalTickets / Math.max(1, warehouseStats.totalCustomers)) * 10) / 10;
          
          return {
            success: true,
            kpis: {
              totalSupportInteractions: warehouseStats.totalTickets + dashStats.totalConversations,
              totalCustomersServed: warehouseStats.totalCustomers,
              resolutionRate: `${resolutionRate}%`,
              avgTicketsPerCustomer,
              openBacklog: warehouseStats.openTickets,
              aiConversations: dashStats.totalConversations,
              pendingEscalations: dashStats.pendingEscalations,
            },
            insights: [
              `Total support volume: ${warehouseStats.totalTickets} Gorgias tickets + ${dashStats.totalConversations} AI conversations`,
              `Customer base: ${warehouseStats.totalCustomers} unique customers`,
              `Resolution rate: ${resolutionRate}% of tickets closed`,
              `Backlog: ${warehouseStats.openTickets} open tickets requiring attention`,
            ],
            actionItems: [
              warehouseStats.openTickets > 100 ? 'PRIORITY: Reduce ticket backlog' : '',
              dashStats.pendingEscalations > 0 ? `Review ${dashStats.pendingEscalations} pending escalations` : '',
              resolutionRate < 85 ? 'Improve resolution rate through training or tooling' : '',
            ].filter(Boolean),
            summary: `Executive Summary: ${warehouseStats.totalTickets + dashStats.totalConversations} total interactions, ${resolutionRate}% resolution rate, ${warehouseStats.openTickets} open tickets`,
          };
        }

        case 'customer_health': {
          const customerCount = warehouseStats.totalCustomers;
          const ticketsPerCustomer = warehouseStats.totalTickets / Math.max(1, customerCount);
          
          return {
            success: true,
            kpis: {
              totalCustomers: customerCount,
              avgTicketsPerCustomer: Math.round(ticketsPerCustomer * 10) / 10,
              customersWithOpenTickets: 'Data collection needed',
              customerSatisfaction: 'CSAT integration pending',
            },
            insights: [
              `Managing ${customerCount} customer relationships`,
              `Average ${Math.round(ticketsPerCustomer * 10) / 10} support tickets per customer`,
              'High-contact customers may need proactive engagement',
            ],
            actionItems: [
              'Identify and flag high-contact customers for outreach',
              'Implement CSAT tracking for satisfaction measurement',
              'Create VIP program for loyal customers',
            ],
            summary: `Customer Health: ${customerCount} customers, ${Math.round(ticketsPerCustomer * 10) / 10} avg tickets/customer`,
          };
        }

        case 'operational_efficiency': {
          const channelEfficiency = Object.entries(warehouseStats.channelBreakdown)
            .map(([channel, count]) => `${channel}: ${count}`)
            .join(', ');
          
          return {
            success: true,
            kpis: {
              avgResponseTimeSec: warehouseStats.avgResponseTimeSec,
              channelBreakdown: warehouseStats.channelBreakdown,
              aiDeflectionRate: dashStats.totalConversations > 0 
                ? `${Math.round((dashStats.totalConversations / (dashStats.totalConversations + warehouseStats.totalTickets)) * 100)}%`
                : '0%',
              escalationRate: dashStats.pendingEscalations,
            },
            insights: [
              `Average response time: ${warehouseStats.avgResponseTimeSec ? Math.round(warehouseStats.avgResponseTimeSec) + 's' : 'Not tracked'}`,
              `Channel distribution: ${channelEfficiency}`,
              `AI handling ${dashStats.totalConversations} conversations autonomously`,
            ],
            actionItems: [
              'Optimize high-volume channels for efficiency',
              'Increase AI agent capabilities to handle more queries',
              'Reduce escalation rate through better training',
            ],
            summary: `Operational Efficiency: ${warehouseStats.avgResponseTimeSec ? Math.round(warehouseStats.avgResponseTimeSec) + 's' : 'N/A'} avg response, ${Object.keys(warehouseStats.channelBreakdown).length} active channels`,
          };
        }

        default:
          return {
            success: false,
            kpis: {},
            insights: [],
            actionItems: [],
            summary: 'Insight type not implemented',
          };
      }
    } catch (error) {
      console.error('Business insights error:', error);
      return {
        success: false,
        kpis: {},
        insights: [],
        actionItems: [],
        summary: 'Error generating insights',
      };
    }
  },
});
