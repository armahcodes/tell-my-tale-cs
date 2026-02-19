CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"id_token" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_activity_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid,
	"conversation_id" uuid,
	"activity_type" varchar(50) NOT NULL,
	"details" jsonb,
	"response_time_ms" integer,
	"tokens_used" integer,
	"success" boolean DEFAULT true,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"template_id" uuid NOT NULL,
	"priority" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"avatar" text,
	"model" varchar(100) DEFAULT 'gpt-4o' NOT NULL,
	"fallback_models" jsonb DEFAULT '[]'::jsonb,
	"temperature" real DEFAULT 0.7,
	"max_tokens" integer DEFAULT 1000,
	"system_prompt" text,
	"personality" varchar(50) DEFAULT 'friendly',
	"response_length" varchar(50) DEFAULT 'balanced',
	"capabilities" jsonb DEFAULT '[]'::jsonb,
	"allowed_tools" jsonb DEFAULT '[]'::jsonb,
	"routing_priority" integer DEFAULT 1,
	"routing_conditions" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"total_conversations" integer DEFAULT 0,
	"resolved_conversations" integer DEFAULT 0,
	"avg_response_time" real,
	"avg_satisfaction_score" real,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analytics_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"period_type" varchar(50) NOT NULL,
	"total_conversations" integer DEFAULT 0 NOT NULL,
	"resolved_conversations" integer DEFAULT 0 NOT NULL,
	"escalated_conversations" integer DEFAULT 0 NOT NULL,
	"ai_resolution_rate" real,
	"avg_response_time_ms" integer,
	"avg_messages_per_conversation" real,
	"positive_sentiment_count" integer DEFAULT 0 NOT NULL,
	"neutral_sentiment_count" integer DEFAULT 0 NOT NULL,
	"negative_sentiment_count" integer DEFAULT 0 NOT NULL,
	"avg_csat_score" real,
	"channel_breakdown" jsonb,
	"top_queries" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_email" varchar(255) NOT NULL,
	"customer_name" varchar(255),
	"channel" varchar(50) DEFAULT 'web_chat' NOT NULL,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"sentiment" varchar(50) DEFAULT 'neutral',
	"order_number" varchar(100),
	"order_id" varchar(255),
	"handled_by_ai" boolean DEFAULT true NOT NULL,
	"escalated_at" timestamp,
	"resolved_at" timestamp,
	"gorgias_customer_id" integer,
	"gorgias_ticket_id" integer,
	"message_count" integer DEFAULT 0 NOT NULL,
	"response_time_ms" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_stats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" timestamp NOT NULL,
	"total_conversations" integer DEFAULT 0 NOT NULL,
	"active_conversations" integer DEFAULT 0 NOT NULL,
	"resolved_conversations" integer DEFAULT 0 NOT NULL,
	"escalated_conversations" integer DEFAULT 0 NOT NULL,
	"ai_resolution_rate" real DEFAULT 0 NOT NULL,
	"avg_response_time_sec" real,
	"pending_escalations" integer DEFAULT 0 NOT NULL,
	"high_priority_escalations" integer DEFAULT 0 NOT NULL,
	"medium_priority_escalations" integer DEFAULT 0 NOT NULL,
	"csat_score" real,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "daily_stats_date_unique" UNIQUE("date")
);
--> statement-breakpoint
CREATE TABLE "escalations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid,
	"ticket_number" varchar(50) NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"priority" varchar(50) DEFAULT 'medium' NOT NULL,
	"reason" varchar(100) NOT NULL,
	"reason_details" text,
	"customer_summary" text,
	"attempted_solutions" jsonb,
	"customer_email" varchar(255) NOT NULL,
	"customer_name" varchar(255),
	"order_number" varchar(100),
	"assigned_to" varchar(255),
	"assigned_at" timestamp,
	"resolution" text,
	"resolved_at" timestamp,
	"resolved_by" varchar(255),
	"sentiment_score" real,
	"gorgias_ticket_id" integer,
	"gorgias_ticket_url" text,
	"gorgias_status" varchar(50),
	"last_synced_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "escalations_ticket_number_unique" UNIQUE("ticket_number")
);
--> statement-breakpoint
CREATE TABLE "gorgias_customers" (
	"id" integer PRIMARY KEY NOT NULL,
	"external_id" varchar(255),
	"email" varchar(255),
	"name" varchar(255),
	"firstname" varchar(100),
	"lastname" varchar(100),
	"language" varchar(10),
	"timezone" varchar(50),
	"note" text,
	"data" jsonb,
	"channels" jsonb,
	"meta" jsonb,
	"shopify_customer_id" varchar(100),
	"ticket_count" integer DEFAULT 0,
	"open_ticket_count" integer DEFAULT 0,
	"gorgias_created_at" timestamp,
	"gorgias_updated_at" timestamp,
	"synced_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gorgias_messages" (
	"id" integer PRIMARY KEY NOT NULL,
	"ticket_id" integer NOT NULL,
	"uri" varchar(500),
	"channel" varchar(50) NOT NULL,
	"via" varchar(50),
	"source" jsonb,
	"sender_id" integer,
	"sender_email" varchar(255),
	"sender_name" varchar(255),
	"receiver_id" integer,
	"receiver_email" varchar(255),
	"receiver_name" varchar(255),
	"integration_id" integer,
	"rule_id" integer,
	"external_id" varchar(255),
	"subject" text,
	"body_text" text,
	"body_html" text,
	"stripped_text" text,
	"stripped_html" text,
	"stripped_signature" text,
	"public" boolean DEFAULT true,
	"from_agent" boolean DEFAULT false,
	"is_retriable" boolean,
	"failed_datetime" timestamp,
	"sent_datetime" timestamp,
	"opened_datetime" timestamp,
	"last_sending_error" jsonb,
	"attachments" jsonb,
	"macros" jsonb,
	"meta" jsonb,
	"actions" jsonb,
	"gorgias_created_at" timestamp NOT NULL,
	"synced_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gorgias_sync_cursors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"last_synced_at" timestamp NOT NULL,
	"last_synced_id" integer,
	"cursor" varchar(255),
	"total_synced" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "gorgias_sync_cursors_entity_type_unique" UNIQUE("entity_type")
);
--> statement-breakpoint
CREATE TABLE "gorgias_sync_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sync_type" varchar(50) NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"status" varchar(20) DEFAULT 'running' NOT NULL,
	"total_records" integer,
	"processed_records" integer DEFAULT 0,
	"created_records" integer DEFAULT 0,
	"updated_records" integer DEFAULT 0,
	"skipped_records" integer DEFAULT 0,
	"failed_records" integer DEFAULT 0,
	"from_datetime" timestamp,
	"to_datetime" timestamp,
	"last_cursor" varchar(255),
	"last_processed_id" integer,
	"error_message" text,
	"error_details" jsonb,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gorgias_tags" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"uri" varchar(500),
	"color" varchar(20),
	"emoji" varchar(10),
	"ticket_count" integer DEFAULT 0,
	"gorgias_created_at" timestamp,
	"gorgias_updated_at" timestamp,
	"synced_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gorgias_ticket_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" integer NOT NULL,
	"tag_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gorgias_tickets" (
	"id" integer PRIMARY KEY NOT NULL,
	"uri" varchar(500),
	"external_id" varchar(255),
	"language" varchar(10),
	"status" varchar(20) NOT NULL,
	"priority" varchar(20),
	"channel" varchar(50) NOT NULL,
	"via" varchar(50),
	"from_agent" boolean DEFAULT false,
	"subject" text,
	"excerpt" text,
	"customer_id" integer,
	"customer_email" varchar(255),
	"customer_name" varchar(255),
	"assignee_user_id" integer,
	"assignee_team_id" integer,
	"assignee_team_name" varchar(100),
	"messages_count" integer DEFAULT 0,
	"is_unread" boolean DEFAULT false,
	"opened_datetime" timestamp,
	"last_received_message_datetime" timestamp,
	"last_message_datetime" timestamp,
	"closed_datetime" timestamp,
	"snooze_datetime" timestamp,
	"trashed_datetime" timestamp,
	"spam_datetime" timestamp,
	"integrations" jsonb,
	"meta" jsonb,
	"shopify_order_id" varchar(100),
	"first_response_time_seconds" integer,
	"resolution_time_seconds" integer,
	"gorgias_created_at" timestamp NOT NULL,
	"gorgias_updated_at" timestamp NOT NULL,
	"synced_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gorgias_users" (
	"id" integer PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255),
	"firstname" varchar(100),
	"lastname" varchar(100),
	"role_id" integer,
	"role_name" varchar(100),
	"active" boolean DEFAULT true NOT NULL,
	"meta" jsonb,
	"gorgias_created_at" timestamp,
	"gorgias_updated_at" timestamp,
	"synced_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gorgias_webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"resource_id" integer,
	"resource_type" varchar(50),
	"payload" jsonb,
	"processed_at" timestamp,
	"processing_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"role" varchar(50) NOT NULL,
	"content" text NOT NULL,
	"tools_used" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"author" varchar(255) NOT NULL,
	"author_type" varchar(50) DEFAULT 'system' NOT NULL,
	"is_internal" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "response_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"category" varchar(100) NOT NULL,
	"subcategory" varchar(100),
	"subject" varchar(500),
	"body" text NOT NULL,
	"variables" jsonb DEFAULT '[]'::jsonb,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0,
	"usage_count" integer DEFAULT 0,
	"last_used_at" timestamp,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_activity_logs" ADD CONSTRAINT "agent_activity_logs_agent_id_ai_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."ai_agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_activity_logs" ADD CONSTRAINT "agent_activity_logs_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_templates" ADD CONSTRAINT "agent_templates_agent_id_ai_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."ai_agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_templates" ADD CONSTRAINT "agent_templates_template_id_response_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."response_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escalations" ADD CONSTRAINT "escalations_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gorgias_messages" ADD CONSTRAINT "gorgias_messages_ticket_id_gorgias_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."gorgias_tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gorgias_ticket_tags" ADD CONSTRAINT "gorgias_ticket_tags_ticket_id_gorgias_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."gorgias_tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gorgias_ticket_tags" ADD CONSTRAINT "gorgias_ticket_tags_tag_id_gorgias_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."gorgias_tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gorgias_tickets" ADD CONSTRAINT "gorgias_tickets_customer_id_gorgias_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."gorgias_customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gorgias_tickets" ADD CONSTRAINT "gorgias_tickets_assignee_user_id_gorgias_users_id_fk" FOREIGN KEY ("assignee_user_id") REFERENCES "public"."gorgias_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;