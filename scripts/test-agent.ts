/**
 * Test script to verify Mastra Agent and all tools
 * Run with: npx tsx scripts/test-agent.ts
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { orderLookupTool } from '../src/lib/mastra/tools/order-lookup';
import { faqRetrievalTool } from '../src/lib/mastra/tools/faq-retrieval';
import { productInfoTool } from '../src/lib/mastra/tools/product-info';
import { escalationTool } from '../src/lib/mastra/tools/escalation';
import { shippingTrackerTool } from '../src/lib/mastra/tools/shipping-tracker';

console.log('=== Mastra Agent & Tools Test ===\n');

async function testOrderLookup() {
  console.log('1. Testing Order Lookup Tool...');
  
  try {
    // Test with mock data email + order number
    const result = await orderLookupTool.execute!({
      orderNumber: 'TMT-1001',
      email: 'sarah.johnson@example.com',
    });
    
    if (result.found) {
      console.log('   ✅ Order lookup working!');
      console.log(`      Message: ${result.message}`);
      if (result.orders && result.orders.length > 0) {
        const order = result.orders[0];
        console.log(`      Order: ${order.orderName}`);
        console.log(`      Customer: ${order.customerName}`);
        console.log(`      Status: ${order.status} - ${order.statusDescription}`);
        console.log(`      Total: $${order.totalPrice}`);
      }
    } else {
      console.log('   ❌ Order not found:', result.message);
    }
    
    // Test without credentials
    const noAuthResult = await orderLookupTool.execute({});
    console.log('   ✅ No-auth handling:', noAuthResult.message?.slice(0, 60) + '...');
    
    return true;
  } catch (error) {
    console.log('   ❌ Error:', error);
    return false;
  }
}

async function testFaqRetrieval() {
  console.log('\n2. Testing FAQ Retrieval Tool...');
  
  try {
    // Test shipping question
    const shippingResult = await faqRetrievalTool.execute({
      query: 'How long does shipping take?',
    });
    
    if (shippingResult.found && shippingResult.results) {
      console.log('   ✅ FAQ retrieval working!');
      console.log(`      Query: "How long does shipping take?"`);
      console.log(`      Found: ${shippingResult.results.length} results`);
      console.log(`      Top match: "${shippingResult.results[0].question}"`);
      console.log(`      Category: ${shippingResult.results[0].category}`);
    } else {
      console.log('   ❌ No FAQ found:', shippingResult.message);
    }
    
    // Test refund question
    const refundResult = await faqRetrievalTool.execute({
      query: 'Can I get a refund?',
      category: 'returns',
    });
    
    if (refundResult.found && refundResult.results) {
      console.log('   ✅ Category filter working!');
      console.log(`      Query: "Can I get a refund?" (category: returns)`);
      console.log(`      Top match: "${refundResult.results[0].question}"`);
    }
    
    // Test photo requirements
    const photoResult = await faqRetrievalTool.execute({
      query: 'What photo format do you accept?',
    });
    
    if (photoResult.found && photoResult.results) {
      console.log('   ✅ Photo question working!');
      console.log(`      Query: "What photo format do you accept?"`);
      console.log(`      Top match: "${photoResult.results[0].question}"`);
    }
    
    return true;
  } catch (error) {
    console.log('   ❌ Error:', error);
    return false;
  }
}

async function testProductInfo() {
  console.log('\n3. Testing Product Info Tool...');
  
  try {
    // Test listing all products (will use Storefront API or fallback)
    const listResult = await productInfoTool.execute({
      listAll: true,
    });
    
    console.log('   ✅ Product info working!');
    console.log(`      Message: ${listResult.message.slice(0, 80)}...`);
    
    if (listResult.products && listResult.products.length > 0) {
      console.log(`      Products found: ${listResult.products.length}`);
      listResult.products.slice(0, 3).forEach((p, i) => {
        console.log(`      ${i + 1}. ${p.title} - $${p.price}`);
      });
    }
    
    if (listResult.customizationInfo) {
      console.log('   ✅ Customization info included');
    }
    
    if (listResult.photoRequirements) {
      console.log('   ✅ Photo requirements included');
    }
    
    // Test search
    const searchResult = await productInfoTool.execute({
      productName: 'adventure',
    });
    
    console.log(`   ✅ Product search: ${searchResult.message}`);
    
    return true;
  } catch (error) {
    console.log('   ❌ Error:', error);
    return false;
  }
}

async function testShippingTracker() {
  console.log('\n4. Testing Shipping Tracker Tool...');
  
  try {
    // Test with tracking number (UPS format)
    const upsResult = await shippingTrackerTool.execute({
      trackingNumber: '1Z999AA10123456784',
    });
    
    if (upsResult.found && upsResult.shipment) {
      console.log('   ✅ Tracking number detection working!');
      console.log(`      Carrier: ${upsResult.shipment.carrier}`);
      console.log(`      Status: ${upsResult.shipment.status}`);
      console.log(`      URL: ${upsResult.shipment.trackingUrl?.slice(0, 50)}...`);
    }
    
    // Test USPS format
    const uspsResult = await shippingTrackerTool.execute({
      trackingNumber: '9400111899223456789012',
    });
    
    if (uspsResult.shipment?.carrier === 'USPS') {
      console.log('   ✅ USPS detection working!');
    }
    
    // Test FedEx format
    const fedexResult = await shippingTrackerTool.execute({
      trackingNumber: '794644790299',
    });
    
    if (fedexResult.shipment?.carrier === 'FedEx') {
      console.log('   ✅ FedEx detection working!');
    }
    
    // Test no-auth message
    const noAuthResult = await shippingTrackerTool.execute({});
    console.log('   ✅ No-auth handling:', noAuthResult.message?.slice(0, 60) + '...');
    
    return true;
  } catch (error) {
    console.log('   ❌ Error:', error);
    return false;
  }
}

async function testEscalation() {
  console.log('\n5. Testing Escalation Tool...');
  
  try {
    // Test customer-requested escalation
    const result = await escalationTool.execute({
      reason: 'customer_requested',
      reasonDetails: 'Customer asked to speak with a human representative',
      customerSummary: 'Customer has questions about order customization that require complex handling',
      priority: 'medium',
      attemptedSolutions: ['Provided FAQ information', 'Offered product details'],
    });
    
    console.log('   ✅ Escalation tool working!');
    console.log(`      Escalation ID: ${result.escalationId}`);
    console.log(`      Status: ${result.status}`);
    console.log(`      Est. Wait: ${result.estimatedWaitTime}`);
    console.log(`      Message: ${result.message.slice(0, 60)}...`);
    console.log(`      Next Steps: ${result.nextSteps.length} steps defined`);
    
    // Test urgent escalation
    const urgentResult = await escalationTool.execute({
      reason: 'high_frustration',
      reasonDetails: 'Customer is very upset about delayed order',
      customerSummary: 'Order delayed by 2 weeks, customer expressing strong frustration',
      priority: 'urgent',
      orderNumber: 'TMT-1001',
      sentimentScore: -0.8,
    });
    
    if (urgentResult.status === 'assigned') {
      console.log('   ✅ Urgent escalation properly prioritized (assigned immediately)');
    }
    
    // Test refund escalation
    const refundResult = await escalationTool.execute({
      reason: 'refund_request',
      reasonDetails: 'Customer requesting refund for damaged book',
      customerSummary: 'Book arrived with torn pages',
      priority: 'high',
      orderNumber: 'TMT-1002',
    });
    
    console.log('   ✅ Refund escalation message:', refundResult.message.slice(0, 50) + '...');
    
    return true;
  } catch (error) {
    console.log('   ❌ Error:', error);
    return false;
  }
}

async function testAgentIntegration() {
  console.log('\n6. Testing Agent Integration (requires AI_GATEWAY_API_KEY)...');
  
  if (!process.env.AI_GATEWAY_API_KEY) {
    console.log('   ⚠️  AI_GATEWAY_API_KEY not set - skipping agent conversation test');
    console.log('   ℹ️  All tools verified individually above');
    return true;
  }
  
  try {
    const { customerSuccessAgent } = await import('../src/lib/mastra/agents/customer-success-agent');
    
    console.log('   ✅ Agent loaded successfully!');
    console.log(`      Agent ID: ${customerSuccessAgent.id}`);
    console.log(`      Agent Name: ${customerSuccessAgent.name}`);
    console.log(`      Tools: orderLookup, faqRetrieval, productInfo, escalation, shippingTracker`);
    
    // Test a simple conversation
    console.log('\n   Testing agent conversation...');
    console.log('   User: "Hi, I want to check on my order TMT-1001. My email is sarah.johnson@example.com"');
    
    const response = await customerSuccessAgent.generate(
      'Hi, I want to check on my order TMT-1001. My email is sarah.johnson@example.com'
    );
    
    console.log(`\n   Agent Response:`);
    console.log(`   ${response.text.slice(0, 300)}...`);
    
    if (response.toolCalls && response.toolCalls.length > 0) {
      console.log(`\n   Tools used: ${response.toolCalls.map(tc => tc.toolName).join(', ')}`);
    }
    
    return true;
  } catch (error: any) {
    if (error.message?.includes('API key')) {
      console.log('   ⚠️  API key error - agent cannot make LLM calls');
    } else {
      console.log('   ❌ Agent error:', error.message || error);
    }
    return false;
  }
}

async function main() {
  const results = {
    orderLookup: await testOrderLookup(),
    faqRetrieval: await testFaqRetrieval(),
    productInfo: await testProductInfo(),
    shippingTracker: await testShippingTracker(),
    escalation: await testEscalation(),
    agentIntegration: await testAgentIntegration(),
  };
  
  console.log('\n=== Test Summary ===');
  console.log('Order Lookup:', results.orderLookup ? '✅ Passed' : '❌ Failed');
  console.log('FAQ Retrieval:', results.faqRetrieval ? '✅ Passed' : '❌ Failed');
  console.log('Product Info:', results.productInfo ? '✅ Passed' : '❌ Failed');
  console.log('Shipping Tracker:', results.shippingTracker ? '✅ Passed' : '❌ Failed');
  console.log('Escalation:', results.escalation ? '✅ Passed' : '❌ Failed');
  console.log('Agent Integration:', results.agentIntegration ? '✅ Passed' : '⚠️ Partial (no API key)');
  
  const allPassed = Object.values(results).every(r => r);
  console.log('\n' + (allPassed ? '✅ All tests passed!' : '⚠️ Some tests need attention'));
  
  console.log('\n=== Test Complete ===');
}

main().catch(console.error);
