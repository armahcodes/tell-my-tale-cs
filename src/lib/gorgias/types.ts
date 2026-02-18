/**
 * Gorgias API Types
 * Based on https://developers.gorgias.com/reference/introduction
 */

// ============================================
// Core Types
// ============================================

export type TicketChannel = 
  | 'api' 
  | 'email' 
  | 'facebook' 
  | 'facebook-mention' 
  | 'facebook-messenger' 
  | 'facebook-recommendations' 
  | 'instagram-ad-comment' 
  | 'instagram-comment' 
  | 'instagram-mention' 
  | 'instagram-direct' 
  | 'chat' 
  | 'phone' 
  | 'sms' 
  | 'twitter' 
  | 'twitter-dm' 
  | 'yotpo' 
  | 'helpdesk' 
  | 'internal-note';

export type TicketStatus = 'open' | 'closed';

export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent';

export type MessageVia = 
  | 'api' 
  | 'email' 
  | 'help_center' 
  | 'self_service' 
  | 'chat' 
  | 'phone' 
  | 'sms';

// ============================================
// Customer Types
// ============================================

export interface GorgiasCustomerChannel {
  id: number;
  type: string;
  address: string;
  preferred: boolean;
  created_datetime: string;
  updated_datetime: string;
}

export interface GorgiasCustomer {
  id: number;
  external_id?: string;
  email?: string;
  name?: string;
  firstname?: string;
  lastname?: string;
  language?: string;
  timezone?: string;
  note?: string;
  data?: Record<string, unknown>;
  channels?: GorgiasCustomerChannel[];
  meta?: {
    shopify_customer_id?: string;
    [key: string]: unknown;
  };
  created_datetime: string;
  updated_datetime: string;
}

export interface CreateCustomerInput {
  email: string;
  name?: string;
  firstname?: string;
  lastname?: string;
  language?: string;
  timezone?: string;
  external_id?: string;
  note?: string;
  data?: Record<string, unknown>;
  channels?: {
    type: string;
    address: string;
    preferred?: boolean;
  }[];
  meta?: Record<string, unknown>;
}

export interface UpdateCustomerInput {
  email?: string;
  name?: string;
  firstname?: string;
  lastname?: string;
  language?: string;
  timezone?: string;
  note?: string;
  data?: Record<string, unknown>;
  meta?: Record<string, unknown>;
}

// ============================================
// Ticket Types
// ============================================

export interface GorgiasTag {
  id: number;
  name: string;
  uri: string;
  decoration?: {
    color?: string;
    emoji?: string;
  };
  created_datetime: string;
  updated_datetime: string;
}

export interface GorgiasUser {
  id: number;
  email: string;
  name?: string;
  firstname?: string;
  lastname?: string;
  role?: {
    id: number;
    name: string;
  };
  meta?: Record<string, unknown>;
  active: boolean;
  created_datetime: string;
  updated_datetime: string;
}

export interface GorgiasMessage {
  id: number;
  uri: string;
  ticket_id: number;
  channel: TicketChannel;
  via: MessageVia;
  source?: {
    type: string;
    to?: { name?: string; address: string }[];
    from?: { name?: string; address: string };
    cc?: { name?: string; address: string }[];
    bcc?: { name?: string; address: string }[];
  };
  sender?: {
    id: number;
    email?: string;
    name?: string;
  };
  receiver?: {
    id?: number;
    email?: string;
    name?: string;
  };
  integration_id?: number;
  rule_id?: number;
  external_id?: string;
  subject?: string;
  body_text?: string;
  body_html?: string;
  stripped_text?: string;
  stripped_html?: string;
  stripped_signature?: string;
  public: boolean;
  from_agent: boolean;
  is_retriable?: boolean;
  failed_datetime?: string;
  created_datetime: string;
  sent_datetime?: string;
  opened_datetime?: string;
  last_sending_error?: {
    message?: string;
    code?: string;
  };
  attachments?: {
    url: string;
    name: string;
    content_type: string;
    size: number;
  }[];
  macros?: {
    macro_id: number;
    name: string;
  }[];
  meta?: Record<string, unknown>;
  actions?: Record<string, unknown>[];
}

export interface GorgiasTicket {
  id: number;
  uri: string;
  external_id?: string;
  language?: string;
  status: TicketStatus;
  priority?: TicketPriority;
  channel: TicketChannel;
  via: MessageVia;
  from_agent: boolean;
  customer: GorgiasCustomer;
  assignee_user?: GorgiasUser;
  assignee_team?: {
    id: number;
    name: string;
  };
  subject?: string;
  excerpt?: string;
  integrations?: {
    id: number;
    type: string;
    name: string;
  }[];
  tags?: GorgiasTag[];
  messages?: GorgiasMessage[];
  messages_count: number;
  opened_datetime?: string;
  last_received_message_datetime?: string;
  last_message_datetime?: string;
  closed_datetime?: string;
  snooze_datetime?: string;
  trashed_datetime?: string;
  spam_datetime?: string;
  is_unread: boolean;
  created_datetime: string;
  updated_datetime: string;
  meta?: {
    shopify_order_id?: string;
    priority?: string;
    conversation_id?: string;
    [key: string]: unknown;
  };
}

export interface CreateTicketInput {
  channel: TicketChannel;
  via?: MessageVia;
  status?: TicketStatus;
  priority?: TicketPriority;
  subject?: string;
  external_id?: string;
  language?: string;
  customer: {
    id?: number;
    email?: string;
    name?: string;
    firstname?: string;
    lastname?: string;
    data?: Record<string, unknown>;
  };
  messages: CreateMessageInput[];
  assignee_user?: { id: number } | { email: string };
  assignee_team?: { id: number } | { name: string };
  tags?: { id: number }[] | { name: string }[];
  meta?: Record<string, unknown>;
}

export interface UpdateTicketInput {
  status?: TicketStatus;
  priority?: TicketPriority;
  subject?: string;
  external_id?: string;
  language?: string;
  assignee_user?: { id: number } | { email: string } | null;
  assignee_team?: { id: number } | { name: string } | null;
  snooze_datetime?: string | null;
  meta?: Record<string, unknown>;
}

export interface CreateMessageInput {
  channel: TicketChannel;
  via: MessageVia;
  subject?: string;
  body_text?: string;
  body_html?: string;
  stripped_text?: string;
  from_agent: boolean;
  public?: boolean;
  sender?: {
    id?: number;
    email?: string;
    name?: string;
  };
  receiver?: {
    id?: number;
    email?: string;
    name?: string;
  };
  source?: {
    type?: string;
    to?: { name?: string; address: string }[];
    from?: { name?: string; address: string };
  };
  attachments?: {
    url: string;
    name: string;
    content_type?: string;
    size?: number;
  }[];
  meta?: Record<string, unknown>;
}

// ============================================
// API Response Types
// ============================================

export interface GorgiasPaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

export interface GorgiasListParams {
  page?: number;
  per_page?: number;
  order_by?: string;
}

export interface ListTicketsParams extends GorgiasListParams {
  status?: TicketStatus;
  channel?: TicketChannel;
  assignee_user_id?: number;
  assignee_team_id?: number;
  customer_id?: number;
  created_datetime_from?: string;
  created_datetime_to?: string;
  updated_datetime_from?: string;
  updated_datetime_to?: string;
}

export interface ListCustomersParams extends GorgiasListParams {
  email?: string;
  external_id?: string;
}

// ============================================
// Webhook Types
// ============================================

export type GorgiasWebhookEventType =
  | 'ticket-created'
  | 'ticket-updated'
  | 'ticket-message-created'
  | 'ticket-assigned'
  | 'ticket-unassigned'
  | 'customer-created'
  | 'customer-updated';

export interface GorgiasWebhookPayload {
  event: GorgiasWebhookEventType;
  timestamp: string;
  data: {
    ticket?: GorgiasTicket;
    message?: GorgiasMessage;
    customer?: GorgiasCustomer;
    previous?: Record<string, unknown>;
  };
}

// ============================================
// Error Types
// ============================================

export interface GorgiasApiError {
  message: string;
  errors?: Record<string, string[]>;
  code?: string;
}
