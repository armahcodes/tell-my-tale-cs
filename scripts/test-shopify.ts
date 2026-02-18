/**
 * Test script to verify Shopify API connectivity
 * Run with: npx tsx scripts/test-shopify.ts
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const SHOPIFY_STOREFRONT_TOKEN = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;
const SHOPIFY_ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;

console.log('=== Shopify API Test ===\n');
console.log('Configuration:');
console.log('  Store Domain:', SHOPIFY_STORE_DOMAIN);
console.log('  Storefront Token:', SHOPIFY_STOREFRONT_TOKEN ? `${SHOPIFY_STOREFRONT_TOKEN.slice(0, 8)}...` : 'NOT SET');
console.log('  Admin Token:', SHOPIFY_ADMIN_TOKEN ? `${SHOPIFY_ADMIN_TOKEN.slice(0, 8)}...` : 'NOT SET');
console.log('');

async function testStorefrontAPI() {
  console.log('1. Testing Storefront API...');
  
  if (!SHOPIFY_STOREFRONT_TOKEN) {
    console.log('   ❌ SHOPIFY_STOREFRONT_ACCESS_TOKEN not set');
    return false;
  }

  try {
    const endpoint = `https://${SHOPIFY_STORE_DOMAIN}/api/2025-10/graphql.json`;
    const query = `{
      shop {
        name
        primaryDomain {
          url
        }
      }
    }`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': SHOPIFY_STOREFRONT_TOKEN,
      },
      body: JSON.stringify({ query }),
    });

    const data = await response.json();
    
    if (data.errors) {
      console.log('   ❌ Storefront API Error:', JSON.stringify(data.errors, null, 2));
      return false;
    }

    console.log('   ✅ Storefront API working!');
    console.log('      Shop Name:', data.data?.shop?.name);
    console.log('      Domain:', data.data?.shop?.primaryDomain?.url);
    return true;
  } catch (error) {
    console.log('   ❌ Storefront API Error:', error);
    return false;
  }
}

async function testAdminAPI() {
  console.log('\n2. Testing Admin API...');
  
  if (!SHOPIFY_ADMIN_TOKEN) {
    console.log('   ❌ SHOPIFY_ADMIN_ACCESS_TOKEN not set');
    return false;
  }

  try {
    const endpoint = `https://${SHOPIFY_STORE_DOMAIN}/admin/api/2024-10/graphql.json`;
    const query = `{
      shop {
        name
        email
        currencyCode
      }
    }`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN,
      },
      body: JSON.stringify({ query }),
    });

    const data = await response.json();
    
    if (data.errors) {
      console.log('   ❌ Admin API Error:', JSON.stringify(data.errors, null, 2));
      return false;
    }

    if (!response.ok) {
      console.log('   ❌ Admin API HTTP Error:', response.status, await response.text());
      return false;
    }

    console.log('   ✅ Admin API working!');
    console.log('      Shop Name:', data.data?.shop?.name);
    console.log('      Email:', data.data?.shop?.email);
    console.log('      Currency:', data.data?.shop?.currencyCode);
    return true;
  } catch (error) {
    console.log('   ❌ Admin API Error:', error);
    return false;
  }
}

async function testCustomersAPI() {
  console.log('\n3. Testing Customers API (Admin)...');
  
  if (!SHOPIFY_ADMIN_TOKEN) {
    console.log('   ❌ SHOPIFY_ADMIN_ACCESS_TOKEN not set');
    return false;
  }

  try {
    const endpoint = `https://${SHOPIFY_STORE_DOMAIN}/admin/api/2024-10/graphql.json`;
    const query = `{
      customers(first: 5) {
        edges {
          node {
            id
            email
            firstName
            lastName
            ordersCount
            createdAt
          }
        }
      }
    }`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN,
      },
      body: JSON.stringify({ query }),
    });

    const data = await response.json();
    
    if (data.errors) {
      console.log('   ❌ Customers API Error:', JSON.stringify(data.errors, null, 2));
      return false;
    }

    const customers = data.data?.customers?.edges || [];
    console.log('   ✅ Customers API working!');
    console.log('      Found', customers.length, 'customers');
    
    if (customers.length > 0) {
      console.log('\n   Sample customers:');
      customers.forEach((edge: any, i: number) => {
        const c = edge.node;
        console.log(`      ${i + 1}. ${c.firstName || ''} ${c.lastName || ''} <${c.email}> - ${c.ordersCount} orders`);
      });
    }
    
    return true;
  } catch (error) {
    console.log('   ❌ Customers API Error:', error);
    return false;
  }
}

async function testOrdersAPI() {
  console.log('\n4. Testing Orders API (Admin)...');
  
  if (!SHOPIFY_ADMIN_TOKEN) {
    console.log('   ❌ SHOPIFY_ADMIN_ACCESS_TOKEN not set');
    return false;
  }

  try {
    const endpoint = `https://${SHOPIFY_STORE_DOMAIN}/admin/api/2024-10/graphql.json`;
    const query = `{
      orders(first: 5, sortKey: CREATED_AT, reverse: true) {
        edges {
          node {
            id
            name
            email
            createdAt
            displayFinancialStatus
            displayFulfillmentStatus
            totalPriceSet {
              shopMoney {
                amount
                currencyCode
              }
            }
          }
        }
      }
    }`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN,
      },
      body: JSON.stringify({ query }),
    });

    const data = await response.json();
    
    if (data.errors) {
      console.log('   ❌ Orders API Error:', JSON.stringify(data.errors, null, 2));
      return false;
    }

    const orders = data.data?.orders?.edges || [];
    console.log('   ✅ Orders API working!');
    console.log('      Found', orders.length, 'recent orders');
    
    if (orders.length > 0) {
      console.log('\n   Recent orders:');
      orders.forEach((edge: any, i: number) => {
        const o = edge.node;
        const price = o.totalPriceSet?.shopMoney;
        console.log(`      ${i + 1}. ${o.name} - ${o.email} - ${price?.amount} ${price?.currencyCode} - ${o.displayFulfillmentStatus}`);
      });
    }
    
    return true;
  } catch (error) {
    console.log('   ❌ Orders API Error:', error);
    return false;
  }
}

async function main() {
  const results = {
    storefront: await testStorefrontAPI(),
    admin: await testAdminAPI(),
    customers: await testCustomersAPI(),
    orders: await testOrdersAPI(),
  };

  console.log('\n=== Summary ===');
  console.log('Storefront API:', results.storefront ? '✅ Working' : '❌ Failed');
  console.log('Admin API:', results.admin ? '✅ Working' : '❌ Failed');
  console.log('Customers:', results.customers ? '✅ Working' : '❌ Failed');
  console.log('Orders:', results.orders ? '✅ Working' : '❌ Failed');
  
  if (!results.admin && SHOPIFY_ADMIN_TOKEN?.startsWith('shpss_')) {
    console.log('\n⚠️  Note: Your token starts with "shpss_" which is a Shopify Secret format.');
    console.log('   For Admin API access, you need a token starting with "shpat_".');
    console.log('   Go to Shopify Admin → Apps → Develop apps → Your app → API credentials');
    console.log('   and get the Admin API access token.');
  }
}

main().catch(console.error);
