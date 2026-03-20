/**
 * MCP (Model Context Protocol) Client Integration
 * Connects to MCP servers for additional AI tool sources
 *
 * Uses @ai-sdk/mcp to create MCP clients that expose tools
 * compatible with the Vercel AI SDK.
 */

import { createMCPClient as createAIMCPClient } from '@ai-sdk/mcp';
import type { ToolSet } from 'ai';

export interface MCPServerConfig {
  /** Display name for this MCP server */
  name: string;
  /** MCP server URL (SSE or HTTP transport) */
  url: string;
  /** Transport type */
  transport: 'sse' | 'http';
  /** Optional auth headers */
  headers?: Record<string, string>;
}

// Active MCP clients
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const activeClients = new Map<string, any>();

/**
 * Create and connect to an MCP server
 * Returns the MCP client with tools ready for Vercel AI SDK
 */
export async function createMCPClient(config: MCPServerConfig) {
  // Return cached client if already connected
  const existing = activeClients.get(config.name);
  if (existing) {
    return existing;
  }

  const client = await createAIMCPClient({
    transport: {
      type: config.transport,
      url: config.url,
      ...(config.headers ? { headers: config.headers } : {}),
    },
  });

  activeClients.set(config.name, client);
  return client;
}

/**
 * Get tools from an MCP server for use with Vercel AI SDK
 */
export async function getMCPTools(config: MCPServerConfig): Promise<ToolSet> {
  const client = await createMCPClient(config);
  return client.tools();
}

/**
 * Get tools from all configured MCP servers
 */
export async function getAllMCPTools(): Promise<ToolSet> {
  const mcpServersEnv = process.env.COMPOSIO_MCP_SERVERS;
  if (!mcpServersEnv) return {};

  try {
    const servers: MCPServerConfig[] = JSON.parse(mcpServersEnv);
    const allTools: ToolSet = {};

    for (const server of servers) {
      try {
        const tools = await getMCPTools(server);
        Object.assign(allTools, tools);
      } catch (error) {
        console.error(`[MCP] Failed to connect to ${server.name}:`, error);
      }
    }

    return allTools;
  } catch (error) {
    console.error('[MCP] Failed to parse MCP_SERVERS config:', error);
    return {};
  }
}

/**
 * Close an MCP client connection
 */
export async function closeMCPClient(name: string): Promise<void> {
  const client = activeClients.get(name);
  if (client) {
    await client.close();
    activeClients.delete(name);
  }
}

/**
 * Close all MCP client connections
 */
export async function closeAllMCPClients(): Promise<void> {
  for (const [name, client] of activeClients) {
    try {
      await client.close();
    } catch (error) {
      console.error(`[MCP] Error closing client ${name}:`, error);
    }
  }
  activeClients.clear();
}
