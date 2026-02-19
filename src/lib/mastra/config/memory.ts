/**
 * Mastra Memory Configuration
 * Production-ready memory for conversation persistence and context management
 * 
 * Based on: https://mastra.ai/docs/memory/overview
 */

import { Memory } from '@mastra/memory';
import { mastraStorage } from './storage';

/**
 * Memory configuration for TellMyTale agents
 * 
 * Features:
 * - Message history: Keeps recent messages for conversation continuity
 * - Thread management: Organizes conversations by resource (user) and thread
 * - Auto title generation: Creates descriptive thread titles
 */
export const createAgentMemory = (options?: {
  lastMessages?: number;
  generateTitle?: boolean;
}) => {
  if (!mastraStorage) {
    console.warn('Storage not available - memory features disabled');
    return undefined;
  }

  return new Memory({
    storage: mastraStorage,
    options: {
      // Keep last N messages for context window management
      lastMessages: options?.lastMessages ?? 50,
      // Auto-generate thread titles from first message
      generateTitle: options?.generateTitle ?? {
        model: 'openai/gpt-4o-mini',
        instructions: 'Generate a concise 3-5 word title summarizing this support request',
      },
    },
  });
};

/**
 * Memory context helpers for thread/resource management
 */
export interface MemoryContext {
  thread: string;
  resource: string;
}

/**
 * Generate a thread ID for a conversation
 */
export function generateThreadId(conversationId?: string): string {
  return conversationId || `thread-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Generate a resource ID for a user/customer
 */
export function generateResourceId(email?: string, userId?: string): string {
  if (email) return `email:${email}`;
  if (userId) return `user:${userId}`;
  return `guest:${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Create memory context for agent calls
 */
export function createMemoryContext(options: {
  conversationId?: string;
  customerEmail?: string;
  userId?: string;
}): MemoryContext {
  return {
    thread: generateThreadId(options.conversationId),
    resource: generateResourceId(options.customerEmail, options.userId),
  };
}
