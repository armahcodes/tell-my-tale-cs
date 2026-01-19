/**
 * Database Schema for TellMyTale Customer Success Platform
 * Using Drizzle ORM with Neon PostgreSQL
 */

import { pgTable, text, timestamp, integer, boolean, jsonb, uuid, varchar, real } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

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
