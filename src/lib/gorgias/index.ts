/**
 * Gorgias Integration
 * Re-exports all Gorgias modules
 */

// Client
export {
  getGorgiasBaseUrl,
  isGorgiasConfigured,
  gorgiasRequest,
  gorgiasGet,
  gorgiasPost,
  gorgiasPut,
  gorgiasDelete,
  GorgiasError,
} from './client';

// Service
export { gorgiasService } from './service';

// Warehouse Sync
export { gorgiasWarehouseSync } from './warehouse-sync';

// Webhooks
export {
  verifyWebhookSignature,
  parseWebhookPayload,
  processWebhookEvent,
  getWebhookEventSummary,
  isFromTellMyTale,
  getConversationIdFromTicket,
  getOrderInfoFromTicket,
  type WebhookHandlers,
} from './webhooks';

// Types
export type {
  // Core types
  TicketChannel,
  TicketStatus,
  TicketPriority,
  MessageVia,
  
  // Customer types
  GorgiasCustomer,
  GorgiasCustomerChannel,
  CreateCustomerInput,
  UpdateCustomerInput,
  
  // Ticket types
  GorgiasTicket,
  GorgiasMessage,
  GorgiasTag,
  GorgiasUser,
  CreateTicketInput,
  UpdateTicketInput,
  CreateMessageInput,
  
  // API types
  GorgiasPaginatedResponse,
  GorgiasListParams,
  ListTicketsParams,
  ListCustomersParams,
  
  // Webhook types
  GorgiasWebhookEventType,
  GorgiasWebhookPayload,
  
  // Error types
  GorgiasApiError,
} from './types';
