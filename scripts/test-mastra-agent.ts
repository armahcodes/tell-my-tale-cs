import { config } from 'dotenv';
config({ path: '.env.local' });
import { mastra } from '../src/lib/mastra';

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║   🤖 MASTRA AGENT TEST                                       ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  // Check environment
  console.log('Environment check:');
  console.log('  VERCEL_API_KEY:', process.env.VERCEL_API_KEY ? '✓ set' : '✗ missing');
  console.log('');

  if (!process.env.VERCEL_API_KEY) {
    console.error('❌ Missing VERCEL_API_KEY environment variable');
    process.exit(1);
  }

  // Get the agent
  const agent = mastra.getAgent('customerSuccess');
  
  if (!agent) {
    console.error('❌ Agent not found');
    process.exit(1);
  }

  console.log(`Agent: ${agent.name}`);
  console.log(`Model: vercel/openai/gpt-4o`);
  console.log('');

  // Test queries
  const queries = [
    'Hello! What can you help me with?',
    'Can you tell me about TellMyTale products?',
  ];

  for (const query of queries) {
    console.log('────────────────────────────────────────────────────────────');
    console.log(`📝 Query: ${query}\n`);
    console.log('🔄 Processing...\n');

    try {
      const response = await agent.generate(query);
      console.log('✅ Response:');
      console.log(response.text);
      console.log('');
      
      if (response.toolCalls && response.toolCalls.length > 0) {
        console.log('🔧 Tool calls:', response.toolCalls.map(t => t.toolName).join(', '));
      }
    } catch (error) {
      console.error('❌ Error:', error instanceof Error ? error.message : error);
    }
    console.log('');
  }

  console.log('────────────────────────────────────────────────────────────');
  console.log('✅ Test complete!');
}

main().catch(console.error);
