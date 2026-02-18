/**
 * Database Schema for TellMyTale Customer Success Platform
 * Using Drizzle ORM with Neon PostgreSQL
 */

import { pgTable, text, timestamp, integer, boolean, jsonb, uuid, varchar, real } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============================================
// Better Auth Tables
// Documentation: https://www.better-auth.com/docs/concepts/database
// ============================================

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  idToken: text('id_token'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Better Auth Relations
export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

// ============================================
// Conversations Table
// ============================================
export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Customer info
  customerEmail: varchar('customer_email', { length: 255 }).notNull(),
  customerName: varchar('customer_name', { length: 255 }),
  
  // Conversation metadata
  channel: varchar('channel', { length: 50 }).notNull().default('web_chat'), // web_chat, email, contact_form, mobile_app
  status: varchar('status', { length: 50 }).notNull().default('active'), // active, resolved, escalated, closed
  sentiment: varchar('sentiment', { length: 50 }).default('neutral'), // positive, neutral, negative
  
  // Related order info (if any)
  orderNumber: varchar('order_number', { length: 100 }),
  orderId: varchar('order_id', { length: 255 }),
  
  // AI handling
  handledByAi: boolean('handled_by_ai').notNull().default(true),
  escalatedAt: timestamp('escalated_at'),
  resolvedAt: timestamp('resolved_at'),
  
  // Gorgias integration
  gorgiasCustomerId: integer('gorgias_customer_id'),
  gorgiasTicketId: integer('gorgias_ticket_id'),
  
  // Metrics
  messageCount: integer('message_count').notNull().default(0),
  responseTimeMs: integer('response_time_ms'), // First response time
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ============================================
// Messages Table
// ============================================
export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  
  // Message content
  role: varchar('role', { length: 50 }).notNull(), // user, assistant, system
  content: text('content').notNull(),
  
  // Tool usage tracking
  toolsUsed: jsonb('tools_used').$type<string[]>(),
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ============================================
// Escalations Table
// ============================================
export const escalations = pgTable('escalations', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id').references(() => conversations.id, { onDelete: 'set null' }),
  
  // Ticket info
  ticketNumber: varchar('ticket_number', { length: 50 }).notNull().unique(),
  status: varchar('status', { length: 50 }).notNull().default('pending'), // pending, assigned, in_progress, resolved, closed
  priority: varchar('priority', { length: 50 }).notNull().default('medium'), // low, medium, high, urgent
  
  // Escalation details
  reason: varchar('reason', { length: 100 }).notNull(),
  reasonDetails: text('reason_details'),
  customerSummary: text('customer_summary'),
  attemptedSolutions: jsonb('attempted_solutions').$type<string[]>(),
  
  // Customer info
  customerEmail: varchar('customer_email', { length: 255 }).notNull(),
  customerName: varchar('customer_name', { length: 255 }),
  orderNumber: varchar('order_number', { length: 100 }),
  
  // Agent assignment
  assignedTo: varchar('assigned_to', { length: 255 }),
  assignedAt: timestamp('assigned_at'),
  
  // Resolution
  resolution: text('resolution'),
  resolvedAt: timestamp('resolved_at'),
  resolvedBy: varchar('resolved_by', { length: 255 }),
  
  // Sentiment tracking
  sentimentScore: real('sentiment_score'), // -1 to 1
  
  // Gorgias integration
  gorgiasTicketId: integer('gorgias_ticket_id'),
  gorgiasTicketUrl: text('gorgias_ticket_url'),
  gorgiasStatus: varchar('gorgias_status', { length: 50 }),
  lastSyncedAt: timestamp('last_synced_at'),
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ============================================
// Notes Table (for orders and customers)
// ============================================
export const notes = pgTable('notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Note target (polymorphic)
  entityType: varchar('entity_type', { length: 50 }).notNull(), // order, customer, conversation
  entityId: varchar('entity_id', { length: 255 }).notNull(),
  
  // Note content
  content: text('content').notNull(),
  author: varchar('author', { length: 255 }).notNull(), // Assistant, user email, or system
  authorType: varchar('author_type', { length: 50 }).notNull().default('system'), // ai, human, system
  
  // Visibility
  isInternal: boolean('is_internal').notNull().default(true),
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ============================================
// Analytics Snapshots Table
// ============================================
export const analyticsSnapshots = pgTable('analytics_snapshots', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Time period
  periodStart: timestamp('period_start').notNull(),
  periodEnd: timestamp('period_end').notNull(),
  periodType: varchar('period_type', { length: 50 }).notNull(), // hourly, daily, weekly, monthly
  
  // Conversation metrics
  totalConversations: integer('total_conversations').notNull().default(0),
  resolvedConversations: integer('resolved_conversations').notNull().default(0),
  escalatedConversations: integer('escalated_conversations').notNull().default(0),
  
  // AI performance
  aiResolutionRate: real('ai_resolution_rate'), // percentage 0-100
  avgResponseTimeMs: integer('avg_response_time_ms'),
  avgMessagesPerConversation: real('avg_messages_per_conversation'),
  
  // Customer satisfaction
  positiveSentimentCount: integer('positive_sentiment_count').notNull().default(0),
  neutralSentimentCount: integer('neutral_sentiment_count').notNull().default(0),
  negativeSentimentCount: integer('negative_sentiment_count').notNull().default(0),
  avgCsatScore: real('avg_csat_score'),
  
  // Channel breakdown
  channelBreakdown: jsonb('channel_breakdown').$type<Record<string, number>>(),
  
  // Top queries
  topQueries: jsonb('top_queries').$type<Array<{ query: string; count: number }>>(),
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ============================================
// Gorgias Webhook Events Table
// ============================================
export const gorgiasWebhookEvents = pgTable('gorgias_webhook_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Event info
  eventType: varchar('event_type', { length: 100 }).notNull(),
  resourceId: integer('resource_id'),
  resourceType: varchar('resource_type', { length: 50 }), // ticket, customer, message
  
  // Payload
  payload: jsonb('payload').$type<Record<string, unknown>>(),
  
  // Processing status
  processedAt: timestamp('processed_at'),
  processingError: text('processing_error'),
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ============================================
// Daily Stats Table (for dashboard)
// ============================================
export const dailyStats = pgTable('daily_stats', {
  id: uuid('id').primaryKey().defaultRandom(),
  date: timestamp('date').notNull().unique(),
  
  // Core metrics
  totalConversations: integer('total_conversations').notNull().default(0),
  activeConversations: integer('active_conversations').notNull().default(0),
  resolvedConversations: integer('resolved_conversations').notNull().default(0),
  escalatedConversations: integer('escalated_conversations').notNull().default(0),
  
  // AI metrics
  aiResolutionRate: real('ai_resolution_rate').notNull().default(0),
  avgResponseTimeSec: real('avg_response_time_sec'),
  
  // Escalation metrics
  pendingEscalations: integer('pending_escalations').notNull().default(0),
  highPriorityEscalations: integer('high_priority_escalations').notNull().default(0),
  mediumPriorityEscalations: integer('medium_priority_escalations').notNull().default(0),
  
  // Satisfaction
  csatScore: real('csat_score'),
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ============================================
// Gorgias Data Warehouse Tables
// ============================================

// Gorgias Users (Agents) - Stores all agents from Gorgias
export const gorgiasUsers = pgTable('gorgias_users', {
  id: integer('id').primaryKey(), // Gorgias user ID
  email: varchar('email', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }),
  firstname: varchar('firstname', { length: 100 }),
  lastname: varchar('lastname', { length: 100 }),
  roleId: integer('role_id'),
  roleName: varchar('role_name', { length: 100 }),
  active: boolean('active').notNull().default(true),
  meta: jsonb('meta').$type<Record<string, unknown>>(),
  gorgiasCreatedAt: timestamp('gorgias_created_at'),
  gorgiasUpdatedAt: timestamp('gorgias_updated_at'),
  syncedAt: timestamp('synced_at').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Gorgias Customers - Complete customer data warehouse
export const gorgiasCustomers = pgTable('gorgias_customers', {
  id: integer('id').primaryKey(), // Gorgias customer ID
  externalId: varchar('external_id', { length: 255 }),
  email: varchar('email', { length: 255 }),
  name: varchar('name', { length: 255 }),
  firstname: varchar('firstname', { length: 100 }),
  lastname: varchar('lastname', { length: 100 }),
  language: varchar('language', { length: 10 }),
  timezone: varchar('timezone', { length: 50 }),
  note: text('note'),
  data: jsonb('data').$type<Record<string, unknown>>(),
  channels: jsonb('channels').$type<Array<{
    id: number;
    type: string;
    address: string;
    preferred: boolean;
  }>>(),
  meta: jsonb('meta').$type<Record<string, unknown>>(),
  shopifyCustomerId: varchar('shopify_customer_id', { length: 100 }),
  ticketCount: integer('ticket_count').default(0),
  openTicketCount: integer('open_ticket_count').default(0),
  gorgiasCreatedAt: timestamp('gorgias_created_at'),
  gorgiasUpdatedAt: timestamp('gorgias_updated_at'),
  syncedAt: timestamp('synced_at').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Gorgias Tags - All tags from Gorgias
export const gorgiasTags = pgTable('gorgias_tags', {
  id: integer('id').primaryKey(), // Gorgias tag ID
  name: varchar('name', { length: 255 }).notNull(),
  uri: varchar('uri', { length: 500 }),
  color: varchar('color', { length: 20 }),
  emoji: varchar('emoji', { length: 10 }),
  ticketCount: integer('ticket_count').default(0),
  gorgiasCreatedAt: timestamp('gorgias_created_at'),
  gorgiasUpdatedAt: timestamp('gorgias_updated_at'),
  syncedAt: timestamp('synced_at').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Gorgias Tickets - Complete ticket data warehouse
export const gorgiasTickets = pgTable('gorgias_tickets', {
  id: integer('id').primaryKey(), // Gorgias ticket ID
  uri: varchar('uri', { length: 500 }),
  externalId: varchar('external_id', { length: 255 }),
  language: varchar('language', { length: 10 }),
  status: varchar('status', { length: 20 }).notNull(), // open, closed
  priority: varchar('priority', { length: 20 }), // low, normal, high, urgent
  channel: varchar('channel', { length: 50 }).notNull(),
  via: varchar('via', { length: 50 }),
  fromAgent: boolean('from_agent').default(false),
  subject: text('subject'),
  excerpt: text('excerpt'),
  
  // Customer reference
  customerId: integer('customer_id').references(() => gorgiasCustomers.id),
  customerEmail: varchar('customer_email', { length: 255 }),
  customerName: varchar('customer_name', { length: 255 }),
  
  // Assignment
  assigneeUserId: integer('assignee_user_id').references(() => gorgiasUsers.id),
  assigneeTeamId: integer('assignee_team_id'),
  assigneeTeamName: varchar('assignee_team_name', { length: 100 }),
  
  // Counts
  messagesCount: integer('messages_count').default(0),
  
  // Status timestamps
  isUnread: boolean('is_unread').default(false),
  openedDatetime: timestamp('opened_datetime'),
  lastReceivedMessageDatetime: timestamp('last_received_message_datetime'),
  lastMessageDatetime: timestamp('last_message_datetime'),
  closedDatetime: timestamp('closed_datetime'),
  snoozeDatetime: timestamp('snooze_datetime'),
  trashedDatetime: timestamp('trashed_datetime'),
  spamDatetime: timestamp('spam_datetime'),
  
  // Integrations
  integrations: jsonb('integrations').$type<Array<{
    id: number;
    type: string;
    name: string;
  }>>(),
  
  // Metadata
  meta: jsonb('meta').$type<Record<string, unknown>>(),
  shopifyOrderId: varchar('shopify_order_id', { length: 100 }),
  
  // Response time metrics (calculated)
  firstResponseTimeSeconds: integer('first_response_time_seconds'),
  resolutionTimeSeconds: integer('resolution_time_seconds'),
  
  // Sync timestamps
  gorgiasCreatedAt: timestamp('gorgias_created_at').notNull(),
  gorgiasUpdatedAt: timestamp('gorgias_updated_at').notNull(),
  syncedAt: timestamp('synced_at').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Gorgias Ticket Tags - Many-to-many relationship
export const gorgiasTicketTags = pgTable('gorgias_ticket_tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  ticketId: integer('ticket_id').notNull().references(() => gorgiasTickets.id, { onDelete: 'cascade' }),
  tagId: integer('tag_id').notNull().references(() => gorgiasTags.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Gorgias Messages - All messages from tickets
export const gorgiasMessages = pgTable('gorgias_messages', {
  id: integer('id').primaryKey(), // Gorgias message ID
  ticketId: integer('ticket_id').notNull().references(() => gorgiasTickets.id, { onDelete: 'cascade' }),
  uri: varchar('uri', { length: 500 }),
  channel: varchar('channel', { length: 50 }).notNull(),
  via: varchar('via', { length: 50 }),
  
  // Source info
  source: jsonb('source').$type<{
    type: string;
    to?: { name?: string; address: string }[];
    from?: { name?: string; address: string };
    cc?: { name?: string; address: string }[];
    bcc?: { name?: string; address: string }[];
  }>(),
  
  // Sender/Receiver
  senderId: integer('sender_id'),
  senderEmail: varchar('sender_email', { length: 255 }),
  senderName: varchar('sender_name', { length: 255 }),
  receiverId: integer('receiver_id'),
  receiverEmail: varchar('receiver_email', { length: 255 }),
  receiverName: varchar('receiver_name', { length: 255 }),
  
  // Integration info
  integrationId: integer('integration_id'),
  ruleId: integer('rule_id'),
  externalId: varchar('external_id', { length: 255 }),
  
  // Content
  subject: text('subject'),
  bodyText: text('body_text'),
  bodyHtml: text('body_html'),
  strippedText: text('stripped_text'),
  strippedHtml: text('stripped_html'),
  strippedSignature: text('stripped_signature'),
  
  // Flags
  public: boolean('public').default(true),
  fromAgent: boolean('from_agent').default(false),
  isRetriable: boolean('is_retriable'),
  failedDatetime: timestamp('failed_datetime'),
  
  // Timestamps
  sentDatetime: timestamp('sent_datetime'),
  openedDatetime: timestamp('opened_datetime'),
  
  // Error info
  lastSendingError: jsonb('last_sending_error').$type<{
    message?: string;
    code?: string;
  }>(),
  
  // Attachments
  attachments: jsonb('attachments').$type<Array<{
    url: string;
    name: string;
    content_type: string;
    size: number;
  }>>(),
  
  // Macros used
  macros: jsonb('macros').$type<Array<{
    macro_id: number;
    name: string;
  }>>(),
  
  // Metadata
  meta: jsonb('meta').$type<Record<string, unknown>>(),
  actions: jsonb('actions').$type<Record<string, unknown>[]>(),
  
  // Sync timestamps
  gorgiasCreatedAt: timestamp('gorgias_created_at').notNull(),
  syncedAt: timestamp('synced_at').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Gorgias Sync Log - Track all sync operations
export const gorgiasSyncLogs = pgTable('gorgias_sync_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  syncType: varchar('sync_type', { length: 50 }).notNull(), // full, incremental, tickets, customers, users, tags, messages
  entityType: varchar('entity_type', { length: 50 }).notNull(), // tickets, customers, users, tags, messages
  status: varchar('status', { length: 20 }).notNull().default('running'), // running, completed, failed, cancelled
  
  // Progress
  totalRecords: integer('total_records'),
  processedRecords: integer('processed_records').default(0),
  createdRecords: integer('created_records').default(0),
  updatedRecords: integer('updated_records').default(0),
  skippedRecords: integer('skipped_records').default(0),
  failedRecords: integer('failed_records').default(0),
  
  // Time range (for incremental sync)
  fromDatetime: timestamp('from_datetime'),
  toDatetime: timestamp('to_datetime'),
  
  // Cursor for pagination
  lastCursor: varchar('last_cursor', { length: 255 }),
  lastProcessedId: integer('last_processed_id'),
  
  // Error info
  errorMessage: text('error_message'),
  errorDetails: jsonb('error_details').$type<Record<string, unknown>>(),
  
  // Timestamps
  startedAt: timestamp('started_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Gorgias Sync Cursors - Track cursors for incremental syncs
export const gorgiasSyncCursors = pgTable('gorgias_sync_cursors', {
  id: uuid('id').primaryKey().defaultRandom(),
  entityType: varchar('entity_type', { length: 50 }).notNull().unique(), // tickets, customers, users, tags
  lastSyncedAt: timestamp('last_synced_at').notNull(),
  lastSyncedId: integer('last_synced_id'),
  cursor: varchar('cursor', { length: 255 }),
  totalSynced: integer('total_synced').default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ============================================
// Gorgias Data Warehouse Relations
// ============================================
export const gorgiasCustomersRelations = relations(gorgiasCustomers, ({ many }) => ({
  tickets: many(gorgiasTickets),
}));

export const gorgiasUsersRelations = relations(gorgiasUsers, ({ many }) => ({
  assignedTickets: many(gorgiasTickets),
}));

export const gorgiasTagsRelations = relations(gorgiasTags, ({ many }) => ({
  ticketTags: many(gorgiasTicketTags),
}));

export const gorgiasTicketsRelations = relations(gorgiasTickets, ({ one, many }) => ({
  customer: one(gorgiasCustomers, {
    fields: [gorgiasTickets.customerId],
    references: [gorgiasCustomers.id],
  }),
  assignee: one(gorgiasUsers, {
    fields: [gorgiasTickets.assigneeUserId],
    references: [gorgiasUsers.id],
  }),
  messages: many(gorgiasMessages),
  ticketTags: many(gorgiasTicketTags),
}));

export const gorgiasTicketTagsRelations = relations(gorgiasTicketTags, ({ one }) => ({
  ticket: one(gorgiasTickets, {
    fields: [gorgiasTicketTags.ticketId],
    references: [gorgiasTickets.id],
  }),
  tag: one(gorgiasTags, {
    fields: [gorgiasTicketTags.tagId],
    references: [gorgiasTags.id],
  }),
}));

export const gorgiasMessagesRelations = relations(gorgiasMessages, ({ one }) => ({
  ticket: one(gorgiasTickets, {
    fields: [gorgiasMessages.ticketId],
    references: [gorgiasTickets.id],
  }),
}));

// ============================================
// Relations
// ============================================
export const conversationsRelations = relations(conversations, ({ many }) => ({
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}));

export const escalationsRelations = relations(escalations, ({ one }) => ({
  conversation: one(conversations, {
    fields: [escalations.conversationId],
    references: [conversations.id],
  }),
}));

// ============================================
// Types
// ============================================

// Better Auth Types
export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;
export type Session = typeof session.$inferSelect;
export type NewSession = typeof session.$inferInsert;
export type Account = typeof account.$inferSelect;
export type NewAccount = typeof account.$inferInsert;
export type Verification = typeof verification.$inferSelect;
export type NewVerification = typeof verification.$inferInsert;

// Application Types
export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type Escalation = typeof escalations.$inferSelect;
export type NewEscalation = typeof escalations.$inferInsert;
export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;
export type AnalyticsSnapshot = typeof analyticsSnapshots.$inferSelect;
export type DailyStats = typeof dailyStats.$inferSelect;
export type GorgiasWebhookEvent = typeof gorgiasWebhookEvents.$inferSelect;
export type NewGorgiasWebhookEvent = typeof gorgiasWebhookEvents.$inferInsert;

// Gorgias Data Warehouse Types
export type GorgiasUserRecord = typeof gorgiasUsers.$inferSelect;
export type NewGorgiasUserRecord = typeof gorgiasUsers.$inferInsert;
export type GorgiasCustomerRecord = typeof gorgiasCustomers.$inferSelect;
export type NewGorgiasCustomerRecord = typeof gorgiasCustomers.$inferInsert;
export type GorgiasTagRecord = typeof gorgiasTags.$inferSelect;
export type NewGorgiasTagRecord = typeof gorgiasTags.$inferInsert;
export type GorgiasTicketRecord = typeof gorgiasTickets.$inferSelect;
export type NewGorgiasTicketRecord = typeof gorgiasTickets.$inferInsert;
export type GorgiasTicketTagRecord = typeof gorgiasTicketTags.$inferSelect;
export type NewGorgiasTicketTagRecord = typeof gorgiasTicketTags.$inferInsert;
export type GorgiasMessageRecord = typeof gorgiasMessages.$inferSelect;
export type NewGorgiasMessageRecord = typeof gorgiasMessages.$inferInsert;
export type GorgiasSyncLog = typeof gorgiasSyncLogs.$inferSelect;
export type NewGorgiasSyncLog = typeof gorgiasSyncLogs.$inferInsert;
export type GorgiasSyncCursor = typeof gorgiasSyncCursors.$inferSelect;
export type NewGorgiasSyncCursor = typeof gorgiasSyncCursors.$inferInsert;