/**
 * Test script for Gorgias Integration
 * Run with: npx tsx scripts/test-gorgias.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

// Import after env vars are loaded
async function main() {
  console.log('🧪 Testing Gorgias Integration\n');
  console.log('='.repeat(50));

  // Check configuration
  console.log('\n📋 Configuration Check:');
  console.log(`  GORGIAS_DOMAIN: ${process.env.GORGIAS_DOMAIN ? '✅ Set' : '❌ Missing'}`);
  console.log(`  GORGIAS_EMAIL: ${process.env.GORGIAS_EMAIL ? '✅ Set' : '❌ Missing'}`);
  console.log(`  GORGIAS_API_KEY: ${process.env.GORGIAS_API_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`  GORGIAS_WEBHOOK_SECRET: ${process.env.GORGIAS_WEBHOOK_SECRET ? '✅ Set' : '❌ Missing'}`);

  if (!process.env.GORGIAS_DOMAIN || !process.env.GORGIAS_EMAIL || !process.env.GORGIAS_API_KEY) {
    console.error('\n❌ Missing required Gorgias configuration. Please check your .env.local file.');
    process.exit(1);
  }

  // Dynamically import after env vars are set
  const { gorgiasService, isGorgiasConfigured } = await import('../src/lib/gorgias');

  console.log(`\n  isGorgiasConfigured(): ${isGorgiasConfigured() ? '✅ Yes' : '❌ No'}`);

  if (!isGorgiasConfigured()) {
    console.error('\n❌ Gorgias is not configured properly.');
    process.exit(1);
  }

  console.log('\n' + '='.repeat(50));

  // Test 1: List existing tickets
  console.log('\n🎫 Test 1: Listing existing tickets...');
  try {
    const ticketsResult = await gorgiasService.listTickets({ per_page: 5 } as any);
    console.log(`  ✅ Found ${ticketsResult.data.length} tickets`);
    if (ticketsResult.data.length > 0) {
      console.log('  Recent tickets:');
      ticketsResult.data.slice(0, 3).forEach(ticket => {
        console.log(`    - #${ticket.id}: ${ticket.subject || 'No subject'} (${ticket.status})`);
      });
    }
  } catch (error) {
    console.error(`  ❌ Failed to list tickets:`, error);
    process.exit(1);
  }

  // Test 2: List customers
  console.log('\n👥 Test 2: Listing existing customers...');
  try {
    const customersResult = await gorgiasService.listCustomers({ per_page: 5 } as any);
    console.log(`  ✅ Found ${customersResult.data.length} customers`);
    if (customersResult.data.length > 0) {
      console.log('  Recent customers:');
      customersResult.data.slice(0, 3).forEach(customer => {
        console.log(`    - #${customer.id}: ${customer.email || customer.name || 'Unknown'}`);
      });
    }
  } catch (error) {
    console.error(`  ❌ Failed to list customers:`, error);
  }

  // Test 3: Create a test ticket
  console.log('\n📝 Test 3: Creating a test escalation ticket...');
  try {
    const testTicket = await gorgiasService.createEscalationTicket({
      customerEmail: 'test@tellmytale.com',
      customerName: 'Test Customer',
      reason: 'Integration Test',
      reasonDetails: 'This is a test ticket created by the Gorgias integration test script.',
      customerSummary: 'Customer is testing the integration to ensure everything works correctly.',
      attemptedSolutions: ['Verified API connection', 'Checked configuration'],
      priority: 'low',
      conversationId: 'test-conversation-' + Date.now(),
      orderNumber: 'TEST-12345',
    });

    console.log(`  ✅ Created ticket #${testTicket.id}`);
    console.log(`  URL: ${gorgiasService.getTicketUrl(testTicket.id)}`);
    console.log(`  Status: ${testTicket.status}`);
    console.log(`  Priority: ${testTicket.priority}`);

    // Test 4: Retrieve the created ticket
    console.log('\n🔍 Test 4: Retrieving the created ticket...');
    const retrievedTicket = await gorgiasService.getTicket(testTicket.id);
    console.log(`  ✅ Retrieved ticket #${retrievedTicket.id}`);
    console.log(`  Subject: ${retrievedTicket.subject}`);
    console.log(`  Customer: ${retrievedTicket.customer?.email}`);
    console.log(`  Messages count: ${retrievedTicket.messages_count}`);

    // Test 5: Add an internal note (use the Gorgias account email as sender)
    console.log('\n📌 Test 5: Adding internal note to ticket...');
    const note = await gorgiasService.addInternalNote(
      testTicket.id,
      'This is an automated test note from the TellMyTale integration.',
      process.env.GORGIAS_EMAIL
    );
    console.log(`  ✅ Added internal note #${note.id}`);

    // Test 6: Close the test ticket
    console.log('\n🔒 Test 6: Closing test ticket...');
    const closedTicket = await gorgiasService.closeTicket(testTicket.id);
    console.log(`  ✅ Ticket closed: ${closedTicket.status}`);

  } catch (error) {
    console.error(`  ❌ Failed:`, error);
  }

  console.log('\n' + '='.repeat(50));
  console.log('✅ Gorgias integration test completed!\n');
}

main().catch(console.error);
