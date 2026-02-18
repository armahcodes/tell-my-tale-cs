#!/usr/bin/env npx tsx
/**
 * Test the Vercel AI SDK Agent
 * 
 * Usage:
 *   npx tsx scripts/test-agent-ai.ts "your question here"
 */

import 'dotenv/config';

async function main() {
  const query = process.argv.slice(2).join(' ') || 'How many tickets are in the warehouse?';

  console.log();
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║   🤖 VERCEL AI SDK AGENT TEST                                ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log();

  // Check environment
  const apiKey = process.env.AI_GATEWAY_API_KEY;
  if (!apiKey) {
    console.error('❌ Missing AI_GATEWAY_API_KEY');
    process.exit(1);
  }

  console.log('✓ Vercel AI Gateway configured');
  console.log();
  console.log('📝 Query:', query);
  console.log();
  console.log('─'.repeat(60));
  console.log();

  const { chat } = await import('../src/lib/ai/agent');

  try {
    console.log('🔄 Processing...\n');
    const response = await chat(query);
    
    console.log('📤 Response:');
    console.log();
    console.log(response);
    console.log();
    console.log('─'.repeat(60));
    console.log('✓ Agent responded successfully');
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    if (error instanceof Error && error.stack) {
      console.error('\nStack:', error.stack);
    }
    process.exit(1);
  }

  console.log();
  process.exit(0);
}

main();
