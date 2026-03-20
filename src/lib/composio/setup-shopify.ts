/**
 * Composio Shopify Setup
 * Connects the TellMyTale Shopify store to Composio using API key auth.
 *
 * Usage:
 *   npx tsx src/lib/composio/setup-shopify.ts
 *
 * Prerequisites:
 *   - COMPOSIO_API_KEY set in environment
 *   - SHOPIFY_ADMIN_ACCESS_TOKEN set in environment
 *   - SHOPIFY_STORE_DOMAIN set in environment (e.g., tellmytale.myshopify.com)
 *
 * The Shopify custom app needs these scopes granted:
 *   read_products, write_products, read_orders, write_orders,
 *   read_customers, write_customers, read_inventory, read_fulfillments
 */

import { Composio, AuthScheme } from '@composio/core';
import { VercelProvider } from '@composio/vercel';

const COMPOSIO_USER_ID = 'tellmytale-default';

async function setupShopifyConnection() {
  const apiKey = process.env.COMPOSIO_API_KEY;
  if (!apiKey) {
    console.error('COMPOSIO_API_KEY not set');
    process.exit(1);
  }

  const shopifyToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
  if (!shopifyToken) {
    console.error('SHOPIFY_ADMIN_ACCESS_TOKEN not set');
    process.exit(1);
  }

  const storeDomain = process.env.SHOPIFY_STORE_DOMAIN || 'tellmytale.myshopify.com';
  // Extract subdomain from domain (e.g., "tellmytale" from "tellmytale.myshopify.com")
  const subdomain = storeDomain.replace('.myshopify.com', '');

  const composio = new Composio({
    apiKey,
    provider: new VercelProvider(),
  } as ConstructorParameters<typeof Composio>[0]);

  console.log(`Setting up Shopify connection for store: ${subdomain}`);

  // Find or use the API_KEY auth config for Shopify
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const configs = await composio.authConfigs.list({ toolkitSlugs: ['shopify'] } as any);
  const configItems = Array.isArray(configs) ? configs : ((configs as Record<string, unknown>)?.items as Array<Record<string, unknown>> || []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const apiKeyConfig = configItems.find((c: any) => c.authScheme === 'API_KEY' && c.status === 'ENABLED');

  if (!apiKeyConfig) {
    console.error('No API_KEY auth config found for Shopify. Create one in the Composio dashboard.');
    process.exit(1);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const authConfigId = (apiKeyConfig as any).id as string;
  console.log(`Using auth config: ${authConfigId}`);

  // Check for existing connections
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existing = await composio.connectedAccounts.list({ userIds: [COMPOSIO_USER_ID] } as any);
  const existingList = Array.isArray(existing) ? existing : [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activeShopify = existingList.find((a: any) =>
    (a.toolkit?.slug === 'shopify' || a.toolkitSlug === 'shopify') && a.status === 'ACTIVE'
  );

  if (activeShopify) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    console.log(`Shopify already connected: ${(activeShopify as any).id} (ACTIVE)`);
    console.log('To reconnect, delete the existing connection first.');
    return;
  }

  // Create the connection
  const connectionRequest = await composio.connectedAccounts.initiate(
    COMPOSIO_USER_ID,
    authConfigId,
    {
      config: AuthScheme.APIKey({
        subdomain,
        generic_api_key: shopifyToken,
      }),
    }
  );

  console.log(`Connection created: ${connectionRequest.id}`);
  console.log(`Status: ${connectionRequest.status}`);

  if (connectionRequest.status === 'ACTIVE') {
    console.log('\nShopify connection is ACTIVE. Testing...');

    // Quick test
    const tools = await composio.tools.get(COMPOSIO_USER_ID, { toolkits: ['shopify'] }) as unknown as Record<string, { execute: (args: Record<string, unknown>) => Promise<unknown>; description?: string }>;
    const shopDetails = tools['SHOPIFY_GET_SHOP_DETAILS'];
    if (shopDetails) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await shopDetails.execute({}) as any;
      if (result?.data?.shop?.name) {
        console.log(`Store verified: ${result.data.shop.name} (${result.data.shop.myshopify_domain})`);
        console.log(`Plan: ${result.data.shop.plan_display_name}`);
        console.log(`Currency: ${result.data.shop.currency}`);
      }
    }

    console.log('\nAvailable Shopify tools:');
    for (const name of Object.keys(tools).sort()) {
      console.log(`  - ${name}`);
    }

    console.log('\nSetup complete. Add COMPOSIO_TOOLKITS=shopify to your .env.local');
  } else {
    console.log(`\nConnection is ${connectionRequest.status}. May need manual activation.`);
  }
}

setupShopifyConnection().catch(console.error);
