/**
 * Agents & Templates tRPC Router
 * Manages AI agents and response templates
 */

import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { db } from '@/lib/db';
import { 
  aiAgents, 
  responseTemplates, 
  agentTemplates, 
  agentActivityLogs 
} from '@/lib/db/schema';
import { eq, desc, asc, sql, and, like, or, count, inArray } from 'drizzle-orm';
import { 
  responseTemplates as defaultTemplates,
  TEMPLATE_CATEGORIES,
} from '@/lib/data/response-templates';

export const agentsRouter = router({
  // ============================================
  // AGENTS CRUD
  // ============================================
  
  listAgents: publicProcedure
    .input(z.object({
      includeInactive: z.boolean().default(false),
    }).optional())
    .query(async ({ input }) => {
      if (!db) return [];
      
      const conditions = input?.includeInactive ? undefined : eq(aiAgents.isActive, true);
      
      return db.select()
        .from(aiAgents)
        .where(conditions)
        .orderBy(desc(aiAgents.isPrimary), asc(aiAgents.routingPriority));
    }),
    
  getAgent: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      if (!db) return null;
      
      const [agent] = await db.select()
        .from(aiAgents)
        .where(eq(aiAgents.id, input.id))
        .limit(1);
        
      if (!agent) return null;
      
      // Get associated templates
      const templates = await db.select({
        template: responseTemplates,
        priority: agentTemplates.priority,
      })
        .from(agentTemplates)
        .innerJoin(responseTemplates, eq(agentTemplates.templateId, responseTemplates.id))
        .where(eq(agentTemplates.agentId, input.id))
        .orderBy(desc(agentTemplates.priority));
        
      return {
        ...agent,
        templates: templates.map(t => ({ ...t.template, priority: t.priority })),
      };
    }),
    
  createAgent: publicProcedure
    .input(z.object({
      name: z.string().min(1).max(255),
      description: z.string().optional(),
      avatar: z.string().optional(),
      model: z.string().default('gpt-4o'),
      fallbackModels: z.array(z.string()).default([]),
      temperature: z.number().min(0).max(2).default(0.7),
      maxTokens: z.number().min(100).max(8000).default(1000),
      systemPrompt: z.string().optional(),
      personality: z.enum(['friendly', 'professional', 'casual']).default('friendly'),
      responseLength: z.enum(['concise', 'balanced', 'detailed']).default('balanced'),
      capabilities: z.array(z.string()).default([]),
      allowedTools: z.array(z.string()).default([]),
      routingPriority: z.number().default(1),
      routingConditions: z.object({
        channels: z.array(z.string()).optional(),
        categories: z.array(z.string()).optional(),
        keywords: z.array(z.string()).optional(),
        customerTags: z.array(z.string()).optional(),
      }).optional(),
      isActive: z.boolean().default(true),
      isPrimary: z.boolean().default(false),
    }))
    .mutation(async ({ input }) => {
      if (!db) throw new Error('Database not available');
      
      // If setting as primary, unset other primary agents
      if (input.isPrimary) {
        await db.update(aiAgents)
          .set({ isPrimary: false })
          .where(eq(aiAgents.isPrimary, true));
      }
      
      const [agent] = await db.insert(aiAgents)
        .values(input)
        .returning();
        
      return agent;
    }),
    
  updateAgent: publicProcedure
    .input(z.object({
      id: z.string().uuid(),
      name: z.string().min(1).max(255).optional(),
      description: z.string().optional(),
      avatar: z.string().optional(),
      model: z.string().optional(),
      fallbackModels: z.array(z.string()).optional(),
      temperature: z.number().min(0).max(2).optional(),
      maxTokens: z.number().min(100).max(8000).optional(),
      systemPrompt: z.string().optional(),
      personality: z.enum(['friendly', 'professional', 'casual']).optional(),
      responseLength: z.enum(['concise', 'balanced', 'detailed']).optional(),
      capabilities: z.array(z.string()).optional(),
      allowedTools: z.array(z.string()).optional(),
      routingPriority: z.number().optional(),
      routingConditions: z.object({
        channels: z.array(z.string()).optional(),
        categories: z.array(z.string()).optional(),
        keywords: z.array(z.string()).optional(),
        customerTags: z.array(z.string()).optional(),
      }).optional(),
      isActive: z.boolean().optional(),
      isPrimary: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      if (!db) throw new Error('Database not available');
      
      const { id, ...updates } = input;
      
      // If setting as primary, unset other primary agents
      if (updates.isPrimary) {
        await db.update(aiAgents)
          .set({ isPrimary: false })
          .where(and(eq(aiAgents.isPrimary, true), sql`${aiAgents.id} != ${id}`));
      }
      
      const [agent] = await db.update(aiAgents)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(aiAgents.id, id))
        .returning();
        
      return agent;
    }),
    
  deleteAgent: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      if (!db) throw new Error('Database not available');
      
      await db.delete(aiAgents).where(eq(aiAgents.id, input.id));
      return { success: true };
    }),
    
  // Get primary agent
  getPrimaryAgent: publicProcedure.query(async () => {
    if (!db) return null;
    
    const [agent] = await db.select()
      .from(aiAgents)
      .where(and(eq(aiAgents.isPrimary, true), eq(aiAgents.isActive, true)))
      .limit(1);
      
    return agent || null;
  }),

  // ============================================
  // TEMPLATES CRUD
  // ============================================
  
  listTemplates: publicProcedure
    .input(z.object({
      category: z.string().optional(),
      search: z.string().optional(),
      includeInactive: z.boolean().default(false),
    }).optional())
    .query(async ({ input }) => {
      if (!db) {
        // Return default templates if no DB
        let templates = [...defaultTemplates];
        if (input?.category) {
          templates = templates.filter(t => t.category === input.category);
        }
        if (input?.search) {
          const search = input.search.toLowerCase();
          templates = templates.filter(t => 
            t.name.toLowerCase().includes(search) ||
            t.body.toLowerCase().includes(search)
          );
        }
        return templates;
      }
      
      const conditions = [];
      
      if (!input?.includeInactive) {
        conditions.push(eq(responseTemplates.isActive, true));
      }
      if (input?.category) {
        conditions.push(eq(responseTemplates.category, input.category));
      }
      if (input?.search) {
        conditions.push(or(
          like(responseTemplates.name, `%${input.search}%`),
          like(responseTemplates.body, `%${input.search}%`)
        ));
      }
      
      return db.select()
        .from(responseTemplates)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(asc(responseTemplates.category), asc(responseTemplates.sortOrder));
    }),
    
  getTemplate: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      if (!db) return null;
      
      const [template] = await db.select()
        .from(responseTemplates)
        .where(eq(responseTemplates.id, input.id))
        .limit(1);
        
      return template || null;
    }),
    
  createTemplate: publicProcedure
    .input(z.object({
      name: z.string().min(1).max(255),
      category: z.string().min(1).max(100),
      subcategory: z.string().max(100).optional(),
      subject: z.string().max(500).optional(),
      body: z.string().min(1),
      variables: z.array(z.string()).default([]),
      tags: z.array(z.string()).default([]),
      isActive: z.boolean().default(true),
      sortOrder: z.number().default(0),
    }))
    .mutation(async ({ input }) => {
      if (!db) throw new Error('Database not available');
      
      const [template] = await db.insert(responseTemplates)
        .values(input)
        .returning();
        
      return template;
    }),
    
  updateTemplate: publicProcedure
    .input(z.object({
      id: z.string().uuid(),
      name: z.string().min(1).max(255).optional(),
      category: z.string().min(1).max(100).optional(),
      subcategory: z.string().max(100).optional(),
      subject: z.string().max(500).optional(),
      body: z.string().min(1).optional(),
      variables: z.array(z.string()).optional(),
      tags: z.array(z.string()).optional(),
      isActive: z.boolean().optional(),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      if (!db) throw new Error('Database not available');
      
      const { id, ...updates } = input;
      
      const [template] = await db.update(responseTemplates)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(responseTemplates.id, id))
        .returning();
        
      return template;
    }),
    
  deleteTemplate: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      if (!db) throw new Error('Database not available');
      
      await db.delete(responseTemplates).where(eq(responseTemplates.id, input.id));
      return { success: true };
    }),
    
  // Record template usage
  recordTemplateUsage: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      if (!db) return { success: false };
      
      await db.update(responseTemplates)
        .set({ 
          usageCount: sql`${responseTemplates.usageCount} + 1`,
          lastUsedAt: new Date(),
        })
        .where(eq(responseTemplates.id, input.id));
        
      return { success: true };
    }),
    
  // Seed default templates to database
  seedDefaultTemplates: publicProcedure.mutation(async () => {
    if (!db) throw new Error('Database not available');
    
    const existingCount = await db.select({ count: count() }).from(responseTemplates);
    if (Number(existingCount[0]?.count || 0) > 0) {
      return { success: false, message: 'Templates already exist' };
    }
    
    const templatesWithUUID = defaultTemplates.map(t => ({
      name: t.name,
      category: t.category,
      subcategory: t.subcategory,
      body: t.body,
      variables: t.variables,
      tags: t.tags,
      isActive: true,
    }));
    
    await db.insert(responseTemplates).values(templatesWithUUID);
    return { success: true, count: templatesWithUUID.length };
  }),

  // ============================================
  // AGENT-TEMPLATE ASSOCIATIONS
  // ============================================
  
  assignTemplateToAgent: publicProcedure
    .input(z.object({
      agentId: z.string().uuid(),
      templateId: z.string().uuid(),
      priority: z.number().default(0),
    }))
    .mutation(async ({ input }) => {
      if (!db) throw new Error('Database not available');
      
      const [assignment] = await db.insert(agentTemplates)
        .values(input)
        .returning();
        
      return assignment;
    }),
    
  removeTemplateFromAgent: publicProcedure
    .input(z.object({
      agentId: z.string().uuid(),
      templateId: z.string().uuid(),
    }))
    .mutation(async ({ input }) => {
      if (!db) throw new Error('Database not available');
      
      await db.delete(agentTemplates)
        .where(and(
          eq(agentTemplates.agentId, input.agentId),
          eq(agentTemplates.templateId, input.templateId)
        ));
        
      return { success: true };
    }),

  // ============================================
  // AGENT ACTIVITY & STATS
  // ============================================
  
  getAgentStats: publicProcedure
    .input(z.object({ agentId: z.string().uuid() }))
    .query(async ({ input }) => {
      if (!db) return null;
      
      const [agent] = await db.select()
        .from(aiAgents)
        .where(eq(aiAgents.id, input.agentId))
        .limit(1);
        
      if (!agent) return null;
      
      // Get recent activity
      const recentActivity = await db.select()
        .from(agentActivityLogs)
        .where(eq(agentActivityLogs.agentId, input.agentId))
        .orderBy(desc(agentActivityLogs.createdAt))
        .limit(50);
        
      // Calculate stats
      const successCount = recentActivity.filter(a => a.success).length;
      const avgResponseTime = recentActivity
        .filter(a => a.responseTimeMs)
        .reduce((sum, a) => sum + (a.responseTimeMs || 0), 0) / (recentActivity.length || 1);
        
      return {
        agent,
        stats: {
          totalConversations: agent.totalConversations || 0,
          resolvedConversations: agent.resolvedConversations || 0,
          resolutionRate: agent.totalConversations 
            ? ((agent.resolvedConversations || 0) / agent.totalConversations * 100).toFixed(1)
            : '0',
          avgResponseTime: Math.round(avgResponseTime),
          recentSuccessRate: recentActivity.length 
            ? ((successCount / recentActivity.length) * 100).toFixed(1)
            : '100',
        },
        recentActivity: recentActivity.slice(0, 10),
      };
    }),
    
  logAgentActivity: publicProcedure
    .input(z.object({
      agentId: z.string().uuid().optional(),
      conversationId: z.string().uuid().optional(),
      activityType: z.string(),
      details: z.record(z.unknown()).optional(),
      responseTimeMs: z.number().optional(),
      tokensUsed: z.number().optional(),
      success: z.boolean().default(true),
      errorMessage: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      if (!db) return null;
      
      const [log] = await db.insert(agentActivityLogs)
        .values(input)
        .returning();
        
      // Update agent stats
      if (input.agentId) {
        await db.update(aiAgents)
          .set({
            totalConversations: sql`${aiAgents.totalConversations} + 1`,
            ...(input.success ? { resolvedConversations: sql`${aiAgents.resolvedConversations} + 1` } : {}),
          })
          .where(eq(aiAgents.id, input.agentId));
      }
        
      return log;
    }),

  // ============================================
  // TEMPLATE CATEGORIES
  // ============================================
  
  getCategories: publicProcedure.query(() => {
    return Object.entries(TEMPLATE_CATEGORIES).map(([key, value]) => ({
      id: value,
      name: key.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
    }));
  }),
});
