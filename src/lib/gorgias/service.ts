/**
 * Gorgias Service
 * High-level service layer for Gorgias operations
 * 
 * Documentation: https://developers.gorgias.com/reference/introduction
 */

import {
  gorgiasGet,
  gorgiasPost,
  gorgiasPut,
  gorgiasDelete,
  isGorgiasConfigured,
  GorgiasError,
} from './client';
import type {
  GorgiasTicket,
  GorgiasCustomer,
  GorgiasMessage,
  GorgiasTag,
  GorgiasPaginatedResponse,
  CreateTicketInput,
  UpdateTicketInput,
  CreateMessageInput,
  CreateCustomerInput,
  UpdateCustomerInput,
  ListTicketsParams,
  ListCustomersParams,
  TicketStatus,
  TicketPriority,
} from './types';

// ============================================
// Ticket Operations
// ============================================

class GorgiasService {
  /**
   * Check if Gorgias integration is available
   */
  isAvailable(): boolean {
    return isGorgiasConfigured();
  }

  /**
   * Create a new ticket in Gorgias
   */
  async createTicket(input: CreateTicketInput): Promise<GorgiasTicket> {
    return gorgiasPost<GorgiasTicket>('/tickets', input);
  }

  /**
   * Get a ticket by ID
   */
  async getTicket(ticketId: number): Promise<GorgiasTicket> {
    return gorgiasGet<GorgiasTicket>(`/tickets/${ticketId}`);
  }

  /**
   * Update a ticket
   */
  async updateTicket(ticketId: number, input: UpdateTicketInput): Promise<GorgiasTicket> {
    return gorgiasPut<GorgiasTicket>(`/tickets/${ticketId}`, input);
  }

  /**
   * Delete a ticket
   */
  async deleteTicket(ticketId: number): Promise<void> {
    await gorgiasDelete(`/tickets/${ticketId}`);
  }

  /**
   * List tickets with optional filters
   */
  async listTickets(params?: ListTicketsParams): Promise<GorgiasPaginatedResponse<GorgiasTicket>> {
    const queryParams: Record<string, string | number | undefined> = {
      cursor: params?.page ? String(params.page) : undefined,
      limit: params?.per_page || 25,
      order_by: params?.order_by || 'created_datetime:desc',
      status: params?.status,
      channel: params?.channel,
      assignee_user_id: params?.assignee_user_id,
      assignee_team_id: params?.assignee_team_id,
      customer_id: params?.customer_id,
      created_datetime_from: params?.created_datetime_from,
      created_datetime_to: params?.created_datetime_to,
      updated_datetime_from: params?.updated_datetime_from,
      updated_datetime_to: params?.updated_datetime_to,
    };

    return gorgiasGet<GorgiasPaginatedResponse<GorgiasTicket>>('/tickets', queryParams);
  }

  /**
   * Close a ticket
   */
  async closeTicket(ticketId: number): Promise<GorgiasTicket> {
    return this.updateTicket(ticketId, { status: 'closed' });
  }

  /**
   * Reopen a ticket
   */
  async reopenTicket(ticketId: number): Promise<GorgiasTicket> {
    return this.updateTicket(ticketId, { status: 'open' });
  }

  /**
   * Set ticket priority
   */
  async setTicketPriority(ticketId: number, priority: TicketPriority): Promise<GorgiasTicket> {
    return this.updateTicket(ticketId, { priority });
  }

  /**
   * Assign ticket to a user
   */
  async assignTicket(ticketId: number, userId: number): Promise<GorgiasTicket> {
    return this.updateTicket(ticketId, { assignee_user: { id: userId } });
  }

  /**
   * Unassign ticket
   */
  async unassignTicket(ticketId: number): Promise<GorgiasTicket> {
    return this.updateTicket(ticketId, { assignee_user: null });
  }

  // ============================================
  // Message Operations
  // ============================================

  /**
   * Add a message to a ticket
   */
  async addMessage(ticketId: number, input: CreateMessageInput): Promise<GorgiasMessage> {
    return gorgiasPost<GorgiasMessage>(`/tickets/${ticketId}/messages`, input);
  }

  /**
   * Get messages for a ticket
   */
  async getMessages(ticketId: number, params?: { page?: number; per_page?: number }): Promise<GorgiasPaginatedResponse<GorgiasMessage>> {
    const queryParams = {
      cursor: params?.page ? String(params.page) : undefined,
      limit: params?.per_page,
    };
    return gorgiasGet<GorgiasPaginatedResponse<GorgiasMessage>>(`/tickets/${ticketId}/messages`, queryParams);
  }

  /**
   * Add an internal note to a ticket
   */
  async addInternalNote(ticketId: number, noteText: string, senderEmail?: string): Promise<GorgiasMessage> {
    return this.addMessage(ticketId, {
      channel: 'internal-note',
      via: 'api',
      body_text: noteText,
      from_agent: true,
      public: false,
      sender: senderEmail ? { email: senderEmail } : undefined,
    });
  }

  // ============================================
  // Customer Operations
  // ============================================

  /**
   * Create a new customer
   */
  async createCustomer(input: CreateCustomerInput): Promise<GorgiasCustomer> {
    return gorgiasPost<GorgiasCustomer>('/customers', input);
  }

  /**
   * Get a customer by ID
   */
  async getCustomer(customerId: number): Promise<GorgiasCustomer> {
    return gorgiasGet<GorgiasCustomer>(`/customers/${customerId}`);
  }

  /**
   * Update a customer
   */
  async updateCustomer(customerId: number, input: UpdateCustomerInput): Promise<GorgiasCustomer> {
    return gorgiasPut<GorgiasCustomer>(`/customers/${customerId}`, input);
  }

  /**
   * Delete a customer
   */
  async deleteCustomer(customerId: number): Promise<void> {
    await gorgiasDelete(`/customers/${customerId}`);
  }

  /**
   * List customers with optional filters
   */
  async listCustomers(params?: ListCustomersParams): Promise<GorgiasPaginatedResponse<GorgiasCustomer>> {
    const queryParams: Record<string, string | number | undefined> = {
      cursor: params?.page ? String(params.page) : undefined,
      limit: params?.per_page || 25,
      email: params?.email,
      external_id: params?.external_id,
    };
    return gorgiasGet<GorgiasPaginatedResponse<GorgiasCustomer>>('/customers', queryParams);
  }

  /**
   * Find or create a customer by email
   */
  async findOrCreateCustomer(email: string, data?: Partial<CreateCustomerInput>): Promise<GorgiasCustomer> {
    // Try to find existing customer
    const existingCustomers = await this.listCustomers({ email, per_page: 1 } as ListCustomersParams);
    
    if (existingCustomers.data.length > 0) {
      return existingCustomers.data[0];
    }

    // Create new customer
    return this.createCustomer({
      email,
      ...data,
    });
  }

  // ============================================
  // Tag Operations
  // ============================================

  /**
   * List all tags
   */
  async listTags(params?: { page?: number; per_page?: number }): Promise<GorgiasPaginatedResponse<GorgiasTag>> {
    const queryParams = {
      cursor: params?.page ? String(params.page) : undefined,
      limit: params?.per_page,
    };
    return gorgiasGet<GorgiasPaginatedResponse<GorgiasTag>>('/tags', queryParams);
  }

  /**
   * Add tags to a ticket
   */
  async addTicketTags(ticketId: number, tagIds: number[]): Promise<GorgiasTicket> {
    const tags = tagIds.map(id => ({ id }));
    return gorgiasPost<GorgiasTicket>(`/tickets/${ticketId}/tags`, { tags });
  }

  /**
   * Remove tags from a ticket
   */
  async removeTicketTags(ticketId: number, tagIds: number[]): Promise<void> {
    await gorgiasDelete(`/tickets/${ticketId}/tags?ids=${tagIds.join(',')}`);
  }

  // ============================================
  // Escalation Helpers
  // ============================================

  /**
   * Create an escalation ticket from AI conversation
   * This is the main method used by the escalation tool
   */
  async createEscalationTicket(options: {
    customerEmail: string;
    customerName?: string;
    reason: string;
    reasonDetails?: string;
    customerSummary: string;
    attemptedSolutions?: string[];
    priority: 'low' | 'medium' | 'high' | 'urgent';
    conversationId?: string;
    orderNumber?: string;
    orderId?: string;
    previousMessages?: { role: 'user' | 'assistant'; content: string }[];
  }): Promise<GorgiasTicket> {
    // Map our priority to Gorgias priority
    const priorityMap: Record<string, TicketPriority> = {
      low: 'low',
      medium: 'normal',
      high: 'high',
      urgent: 'urgent',
    };

    // Build the ticket body
    let bodyText = `## Escalation from AI Support\n\n`;
    bodyText += `**Reason:** ${options.reason}\n`;
    if (options.reasonDetails) {
      bodyText += `**Details:** ${options.reasonDetails}\n`;
    }
    bodyText += `\n**Customer Summary:**\n${options.customerSummary}\n`;

    if (options.attemptedSolutions && options.attemptedSolutions.length > 0) {
      bodyText += `\n**Attempted Solutions:**\n`;
      options.attemptedSolutions.forEach((solution, index) => {
        bodyText += `${index + 1}. ${solution}\n`;
      });
    }

    if (options.orderNumber) {
      bodyText += `\n**Order Number:** ${options.orderNumber}\n`;
    }

    if (options.previousMessages && options.previousMessages.length > 0) {
      bodyText += `\n---\n## Conversation History\n\n`;
      options.previousMessages.forEach(msg => {
        const role = msg.role === 'user' ? 'Customer' : 'AI Assistant';
        bodyText += `**${role}:** ${msg.content}\n\n`;
      });
    }

    // Create the ticket
    const ticket = await this.createTicket({
      channel: 'api',
      via: 'api',
      status: 'open',
      priority: priorityMap[options.priority],
      subject: `[AI Escalation] ${options.reason} - ${options.customerName || options.customerEmail}`,
      customer: {
        email: options.customerEmail,
        name: options.customerName,
      },
      messages: [
        {
          channel: 'api',
          via: 'api',
          body_text: bodyText,
          from_agent: false,
          public: true,
          sender: {
            email: options.customerEmail,
            name: options.customerName,
          },
        },
      ],
      meta: {
        priority: options.priority,
        conversation_id: options.conversationId,
        shopify_order_id: options.orderId,
        order_number: options.orderNumber,
        escalation_reason: options.reason,
        source: 'tellmytale_ai',
      },
    });

    return ticket;
  }

  /**
   * Sync a conversation to Gorgias
   * Creates a ticket with all messages from the conversation
   */
  async syncConversation(options: {
    customerEmail: string;
    customerName?: string;
    messages: { role: 'user' | 'assistant'; content: string; createdAt?: string }[];
    status?: 'open' | 'closed';
    orderNumber?: string;
    orderId?: string;
    conversationId: string;
  }): Promise<GorgiasTicket> {
    // Get or create customer
    const customer = await this.findOrCreateCustomer(options.customerEmail, {
      name: options.customerName,
    });

    // Build conversation body
    let bodyText = '## AI Chat Conversation\n\n';
    
    if (options.orderNumber) {
      bodyText += `**Order:** ${options.orderNumber}\n\n`;
    }

    bodyText += '---\n\n';

    options.messages.forEach(msg => {
      const role = msg.role === 'user' ? 'Customer' : 'AI Assistant';
      const timestamp = msg.createdAt ? ` (${new Date(msg.createdAt).toLocaleString()})` : '';
      bodyText += `**${role}${timestamp}:**\n${msg.content}\n\n`;
    });

    // Create ticket
    const ticket = await this.createTicket({
      channel: 'api',
      via: 'api',
      status: options.status || 'open',
      subject: `Chat Conversation - ${options.customerName || options.customerEmail}`,
      customer: {
        id: customer.id,
        email: options.customerEmail,
        name: options.customerName,
      },
      messages: [
        {
          channel: 'api',
          via: 'api',
          body_text: bodyText,
          from_agent: false,
          public: true,
          sender: {
            email: options.customerEmail,
            name: options.customerName,
          },
        },
      ],
      meta: {
        conversation_id: options.conversationId,
        shopify_order_id: options.orderId,
        order_number: options.orderNumber,
        source: 'tellmytale_ai',
        synced_at: new Date().toISOString(),
      },
    });

    return ticket;
  }

  /**
   * Get Gorgias ticket URL for dashboard linking
   */
  getTicketUrl(ticketId: number): string {
    const domain = process.env.GORGIAS_DOMAIN;
    return `https://${domain}.gorgias.com/app/ticket/${ticketId}`;
  }
}

// Export singleton instance
export const gorgiasService = new GorgiasService();

// Export error class
export { GorgiasError };
