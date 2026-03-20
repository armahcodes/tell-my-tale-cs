/**
 * Composio Tools Discovery API
 * Lists available tools and toolkits
 *
 * GET /api/composio/tools?toolkits=shopify — list direct Shopify tools
 * GET /api/composio/tools?mode=session&toolkits=shopify — list session meta-tools
 */

import { auth } from '@/lib/auth/auth';
import { headers } from 'next/headers';
import { getComposioToolsForVercel, getComposioSessionTools } from '@/lib/composio';

export async function GET(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const toolkits = searchParams.get('toolkits')?.split(',').filter(Boolean);
    const search = searchParams.get('search') || undefined;
    const mode = searchParams.get('mode') || 'direct';

    let tools;
    if (mode === 'session') {
      // Session tools (toolRouter meta-tools)
      tools = await getComposioSessionTools({
        userId: session.user.id,
        toolkits,
      });
    } else {
      // Direct tools (specific tool functions)
      tools = await getComposioToolsForVercel({
        userId: session.user.id,
        toolkits,
        search,
      });
    }

    // Return tool metadata (not the execute functions)
    const toolList = Object.entries(tools).map(([slug, tool]) => ({
      slug,
      description: (tool as { description?: string }).description || '',
    }));

    return Response.json({ tools: toolList, count: toolList.length, mode });
  } catch (error) {
    console.error('[Composio API] List tools error:', error);
    return Response.json(
      { error: 'Failed to list tools' },
      { status: 500 }
    );
  }
}
