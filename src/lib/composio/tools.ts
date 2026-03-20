/**
 * Composio Tool Bridge
 * Provides tools via the session-based API (composio.create() → session.tools())
 * and bridges to Mastra-compatible format for existing agent infrastructure.
 *
 * Two modes:
 * - Session tools (toolRouter): 6 meta-tools that let the AI discover and execute
 *   tools dynamically at runtime. Best for flexibility.
 * - Direct tools: Pre-loaded specific tools (e.g., SHOPIFY_GET_ORDER). Best for
 *   deterministic tool availability.
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import type { ToolSet } from 'ai';
import { getComposioClient, getComposioSession } from './index';

// Cache for fetched tools to avoid repeated API calls
const toolCache = new Map<string, { tools: unknown; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface ComposioToolOptions {
  /** Composio user/session ID (maps to your app's user ID) */
  userId?: string;
  /** Filter by specific toolkits (e.g., ['shopify', 'github', 'slack']) */
  toolkits?: string[];
  /** Search for tools by keyword */
  search?: string;
}

/**
 * Build a valid ToolListParams based on provided options
 */
function buildToolListParams(options: ComposioToolOptions) {
  if (options.search) {
    return { search: options.search } as const;
  }
  if (options.toolkits?.length) {
    return { toolkits: options.toolkits as [string, ...string[]] } as const;
  }
  // Default: return a search for common toolkits
  return { search: '*' } as const;
}

/**
 * Get Composio session tools (toolRouter meta-tools) in Vercel AI SDK format
 * Returns 6 meta-tools: COMPOSIO_MANAGE_CONNECTIONS, COMPOSIO_SEARCH_TOOLS, etc.
 * The AI agent uses these to dynamically discover and execute toolkit-specific tools.
 */
export async function getComposioSessionTools(
  options: ComposioToolOptions = {}
): Promise<ToolSet> {
  const userId = options.userId || 'tellmytale-default';
  const cacheKey = `session:${userId}:${(options.toolkits || []).join(',')}`;

  // Check cache
  const cached = toolCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.tools as ToolSet;
  }

  try {
    const session = await getComposioSession(userId);
    if (!session) return {};

    const toolkits = options.toolkits?.length ? options.toolkits : undefined;
    const tools = await session.tools(toolkits ? { toolkits } : undefined) as unknown as ToolSet;

    // Cache the result
    toolCache.set(cacheKey, { tools, timestamp: Date.now() });

    return tools;
  } catch (error) {
    console.error('[Composio] Failed to get session tools:', error);
    return {};
  }
}

/**
 * Get Composio tools in Vercel AI SDK format (ToolSet) via direct API
 * Returns specific tools like SHOPIFY_GET_ORDER, SHOPIFY_LIST_CUSTOMERS, etc.
 * Use this when you need deterministic tool availability.
 */
export async function getComposioToolsForVercel(
  options: ComposioToolOptions = {}
): Promise<ToolSet> {
  const composio = getComposioClient();
  if (!composio) {
    return {};
  }

  const userId = options.userId || 'tellmytale-default';
  const cacheKey = `vercel:${userId}:${(options.toolkits || []).join(',')}:${options.search || ''}`;

  // Check cache
  const cached = toolCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.tools as ToolSet;
  }

  try {
    const params = buildToolListParams(options);
    const tools = await composio.tools.get(userId, params) as unknown as ToolSet;

    // Cache the result
    toolCache.set(cacheKey, { tools, timestamp: Date.now() });

    return tools;
  } catch (error) {
    console.error('[Composio] Failed to fetch tools for Vercel AI SDK:', error);
    return {};
  }
}

/**
 * Get Composio tools converted to Mastra-compatible format
 * Uses session-based API for toolRouter meta-tools, then bridges to Mastra createTool format.
 */
export async function getComposioToolsForMastra(
  options: ComposioToolOptions = {}
): Promise<Record<string, ReturnType<typeof createTool>>> {
  const composio = getComposioClient();
  if (!composio) {
    return {};
  }

  const userId = options.userId || 'tellmytale-default';
  const cacheKey = `mastra:${userId}:${(options.toolkits || []).join(',')}:${options.search || ''}`;

  // Check cache
  const cached = toolCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.tools as Record<string, ReturnType<typeof createTool>>;
  }

  try {
    const params = buildToolListParams(options);
    const vercelTools = await composio.tools.get(userId, params) as unknown as ToolSet;

    const mastraTools: Record<string, ReturnType<typeof createTool>> = {};

    for (const [slug, tool] of Object.entries(vercelTools)) {
      // Sanitize the slug to create a valid Mastra tool ID
      const toolId = `composio_${slug.toLowerCase().replace(/[^a-z0-9_]/g, '_')}`;

      mastraTools[toolId] = createTool({
        id: toolId,
        description: (tool as { description?: string }).description || `Composio tool: ${slug}`,
        inputSchema: (tool as { parameters?: z.ZodType }).parameters || z.object({}),
        execute: async ({ context }) => {
          // Bridge: Mastra passes params in `context`, Composio expects them directly
          const executeFn = (tool as { execute?: (params: Record<string, unknown>) => Promise<unknown> }).execute;
          if (executeFn) {
            return await executeFn(context as Record<string, unknown>);
          }
          return { error: 'Tool execution not available' };
        },
      });
    }

    // Cache the result
    toolCache.set(cacheKey, { tools: mastraTools, timestamp: Date.now() });

    return mastraTools;
  } catch (error) {
    console.error('[Composio] Failed to fetch tools for Mastra:', error);
    return {};
  }
}

/**
 * Execute a specific Composio tool directly
 */
export async function executeComposioTool(
  toolSlug: string,
  params: Record<string, unknown>,
  userId: string = 'tellmytale-default'
): Promise<unknown> {
  const composio = getComposioClient();
  if (!composio) {
    throw new Error('Composio is not configured. Set COMPOSIO_API_KEY environment variable.');
  }

  return composio.tools.execute(toolSlug, {
    userId,
    arguments: params,
  });
}

/**
 * Clear the tool cache (useful when connections change)
 */
export function clearComposioToolCache(): void {
  toolCache.clear();
}
