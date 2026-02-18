import { config } from 'dotenv';
config({ path: '.env.local' });

import { mastra } from '../src/lib/mastra';

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║   🔧 MASTRA TOOLS TEST                                       ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const agent = mastra.getAgent('customerSuccess');
  
  if (!agent) {
    console.error('❌ Agent not found');
    process.exit(1);
  }

  // Test tool usage
  const query = 'Can you look up order #1001 for customer test@example.com?';
  
  console.log(`📝 Query: ${query}\n`);
  console.log('🔄 Processing...\n');

  try {
    const response = await agent.generate(query);
    console.log('✅ Response:');
    console.log(response.text);
    console.log('');
    
    if (response.toolCalls && response.toolCalls.length > 0) {
      console.log('🔧 Tool calls:');
      for (const call of response.toolCalls) {
        console.log(`  - ${call.toolName}(${JSON.stringify(call.args)})`);
      }
    }
    
    if (response.toolResults && response.toolResults.length > 0) {
      console.log('\n📊 Tool results:');
      for (const result of response.toolResults) {
        const resultStr = JSON.stringify(result.result);
        console.log(`  - ${result.toolName}: ${resultStr.length > 200 ? resultStr.slice(0, 200) + '...' : resultStr}`);
      }
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }

  console.log('\n✅ Test complete!');
}

main().catch(console.error);
