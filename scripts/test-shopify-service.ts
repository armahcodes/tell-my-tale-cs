/**
 * Test script to verify Shopify service with mock data
 * Run with: npx tsx scripts/test-shopify-service.ts
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { shopifyService } from '../src/lib/shopify/service';

async function main() {
  console.log('=== Shopify Service Test ===\n');
  console.log('Using mock data:', shopifyService.isUsingMockData());
  console.log('');

  // Test getting all orders
  console.log('1. Testing getAllOrders...');
  try {
    const { orders } = await shopifyService.getAllOrders(10);
    console.log(`   ✅ Got ${orders.length} orders`);
    orders.slice(0, 3).forEach((order, i) => {
      console.log(`      ${i + 1}. ${order.orderName} - ${order.customerName} - $${order.totalPrice} - ${order.status}`);
    });
  } catch (error) {
    console.log('   ❌ Error:', error);
  }

  // Test getting all customers
  console.log('\n2. Testing getAllCustomers...');
  try {
    const { customers } = await shopifyService.getAllCustomers(10);
    console.log(`   ✅ Got ${customers.length} customers`);
    customers.slice(0, 3).forEach((customer: any, i: number) => {
      console.log(`      ${i + 1}. ${customer.firstName} ${customer.lastName} <${customer.email}> - ${customer.ordersCount} orders`);
    });
  } catch (error) {
    console.log('   ❌ Error:', error);
  }

  // Test order lookup
  console.log('\n3. Testing lookupOrderByNumber...');
  try {
    const order = await shopifyService.lookupOrderByNumber('TMT-1001', 'sarah.johnson@example.com');
    if (order) {
      console.log(`   ✅ Found order: ${order.orderName}`);
      console.log(`      Customer: ${order.customerName}`);
      console.log(`      Status: ${order.status} - ${order.statusDescription}`);
      console.log(`      Total: $${order.totalPrice}`);
    } else {
      console.log('   ❌ Order not found');
    }
  } catch (error) {
    console.log('   ❌ Error:', error);
  }

  // Test mock stats
  console.log('\n4. Testing getMockStats...');
  const stats = shopifyService.getMockStats();
  console.log(`   ✅ Stats loaded`);
  console.log(`      Total Orders: ${stats.totalOrders}`);
  console.log(`      Total Revenue: $${stats.totalRevenue.toFixed(2)}`);
  console.log(`      Total Customers: ${stats.totalCustomers}`);
  console.log(`      Average Order Value: $${stats.averageOrderValue.toFixed(2)}`);

  console.log('\n=== Test Complete ===');
}

main().catch(console.error);
