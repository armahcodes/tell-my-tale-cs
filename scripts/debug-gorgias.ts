/**
 * Debug script for Gorgias API
 * Run with: npx tsx scripts/debug-gorgias.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  const domain = process.env.GORGIAS_DOMAIN;
  const email = process.env.GORGIAS_EMAIL;
  const apiKey = process.env.GORGIAS_API_KEY;

  console.log('🔍 Debugging Gorgias API Connection\n');
  console.log('Configuration:');
  console.log(`  Domain: ${domain}`);
  console.log(`  Email: ${email}`);
  console.log(`  API Key: ${apiKey ? apiKey.substring(0, 10) + '...' : 'NOT SET'}`);

  if (!domain || !email || !apiKey) {
    console.error('\n❌ Missing configuration');
    process.exit(1);
  }

  const baseUrl = `https://${domain}.gorgias.com/api`;
  const auth = Buffer.from(`${email}:${apiKey}`).toString('base64');

  console.log(`\n  Base URL: ${baseUrl}`);

  // Test 1: Get account info
  console.log('\n📊 Test 1: Getting account info...');
  try {
    const response = await fetch(`${baseUrl}/account`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    console.log(`  Status: ${response.status} ${response.statusText}`);
    const data = await response.json();
    
    if (response.ok) {
      console.log(`  ✅ Account: ${data.domain || data.name || 'OK'}`);
      console.log(`  Company: ${data.company_name || 'N/A'}`);
    } else {
      console.log(`  ❌ Error:`, JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error(`  ❌ Fetch error:`, error);
  }

  // Test 2: List tickets
  console.log('\n🎫 Test 2: Listing tickets...');
  try {
    const response = await fetch(`${baseUrl}/tickets?limit=3`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    console.log(`  Status: ${response.status} ${response.statusText}`);
    const data = await response.json();
    
    if (response.ok) {
      console.log(`  ✅ Found ${data.data?.length || 0} tickets`);
      if (data.data && data.data.length > 0) {
        data.data.forEach((ticket: any) => {
          console.log(`    - #${ticket.id}: ${ticket.subject || 'No subject'}`);
        });
      }
    } else {
      console.log(`  ❌ Error:`, JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error(`  ❌ Fetch error:`, error);
  }

  // Test 3: List customers
  console.log('\n👥 Test 3: Listing customers...');
  try {
    const response = await fetch(`${baseUrl}/customers?limit=3`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    console.log(`  Status: ${response.status} ${response.statusText}`);
    const data = await response.json();
    
    if (response.ok) {
      console.log(`  ✅ Found ${data.data?.length || 0} customers`);
    } else {
      console.log(`  ❌ Error:`, JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error(`  ❌ Fetch error:`, error);
  }

  console.log('\n✅ Debug complete');
}

main().catch(console.error);
