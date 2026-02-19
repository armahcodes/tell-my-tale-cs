/**
 * Production Agent Test Script
 * Run: npx tsx scripts/test-production-agent.ts
 * 
 * Options:
 *   --scenario <id>   Run a specific test scenario
 *   --message <text>  Custom test message
 *   --email <email>   Customer email for context
 *   --order <number>  Order number for context
 *   --all             Run all test scenarios
 *   --verbose         Show detailed output
 */

import 'dotenv/config';

// Test scenarios
const TEST_SCENARIOS = [
  {
    id: 'order-status',
    name: 'Order Status Inquiry',
    message: "Hi, I ordered a personalized book for my daughter's birthday. Order #12345. Can you tell me when it will arrive?",
    context: {
      customerEmail: 'test@example.com',
      customerName: 'Test User',
      orderNumber: '12345',
    },
    expectedIntent: 'order_status',
  },
  {
    id: 'cancellation',
    name: 'Order Cancellation Request',
    message: "I need to cancel my order #67890. I ordered the wrong book and want a refund.",
    context: {
      customerEmail: 'test@example.com',
      orderNumber: '67890',
    },
    expectedIntent: 'order_cancellation',
  },
  {
    id: 'return-request',
    name: 'Return/Replacement Request',
    message: "I received my book but my child's name is spelled wrong. The book says 'Emilly' but it should be 'Emily'. Can I get this fixed?",
    context: {
      customerEmail: 'parent@example.com',
      customerName: 'Sarah Johnson',
      orderNumber: '11111',
    },
    expectedIntent: 'return_replacement',
  },
  {
    id: 'product-question',
    name: 'Product Question',
    message: "What customization options are available for the birthday book? Can I include photos?",
    context: {
      customerEmail: 'curious@example.com',
    },
    expectedIntent: 'product_question',
  },
  {
    id: 'escalation',
    name: 'Escalation Request',
    message: "I've been waiting 3 weeks for my order and nobody is helping me. I want to speak to a manager NOW!",
    context: {
      customerEmail: 'frustrated@example.com',
      orderNumber: '99999',
    },
    expectedIntent: 'escalation_needed',
  },
  {
    id: 'revision',
    name: 'Revision Request',
    message: "I just placed my order but realized I want to change the child's age from 5 to 6. Is it too late?",
    context: {
      customerEmail: 'oops@example.com',
      orderNumber: '22222',
    },
    expectedIntent: 'revision_request',
  },
  {
    id: 'shipping',
    name: 'Shipping Inquiry',
    message: "Do you ship internationally? How long does delivery take to Canada?",
    context: {},
    expectedIntent: 'shipping_inquiry',
  },
  {
    id: 'general',
    name: 'General Question',
    message: "Hi! I'm looking for a special gift for my niece. What do you recommend?",
    context: {},
    expectedIntent: 'general_inquiry',
  },
];

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options: {
    scenario?: string;
    message?: string;
    email?: string;
    order?: string;
    all?: boolean;
    verbose?: boolean;
  } = {};

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--scenario':
        options.scenario = args[++i];
        break;
      case '--message':
        options.message = args[++i];
        break;
      case '--email':
        options.email = args[++i];
        break;
      case '--order':
        options.order = args[++i];
        break;
      case '--all':
        options.all = true;
        break;
      case '--verbose':
        options.verbose = true;
        break;
    }
  }

  return options;
}

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message: string, color?: keyof typeof colors) {
  const colorCode = color ? colors[color] : '';
  console.log(`${colorCode}${message}${colors.reset}`);
}

function logSection(title: string) {
  console.log();
  log(`━━━ ${title} ━━━`, 'cyan');
}

async function testAgent(
  message: string,
  context: { customerEmail?: string; customerName?: string; orderNumber?: string },
  verbose: boolean = false
) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  const startTime = Date.now();

  try {
    const response = await fetch(`${baseUrl}/api/agents/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: 'production',
        message,
        testScenario: context,
        options: {
          maxSteps: 10,
          includeWorkflow: true,
          stream: false,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    const totalTime = Date.now() - startTime;

    return { ...result, totalTime };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      totalTime: Date.now() - startTime,
    };
  }
}

async function runScenario(
  scenario: typeof TEST_SCENARIOS[0],
  verbose: boolean = false
) {
  logSection(scenario.name);
  
  log(`📝 Message: "${scenario.message}"`, 'dim');
  
  if (scenario.context.customerEmail) {
    log(`👤 Customer: ${scenario.context.customerEmail}`, 'dim');
  }
  if (scenario.context.orderNumber) {
    log(`📦 Order: #${scenario.context.orderNumber}`, 'dim');
  }
  
  console.log();
  log('Testing...', 'yellow');

  const result = await testAgent(scenario.message, scenario.context, verbose);

  if (result.success) {
    log('✓ Test passed', 'green');
    
    // Workflow analysis
    if (result.workflowAnalysis) {
      console.log();
      log('Workflow Analysis:', 'magenta');
      log(`  Intent: ${result.workflowAnalysis.intent}`, result.workflowAnalysis.intent === scenario.expectedIntent ? 'green' : 'yellow');
      log(`  Strategy: ${result.workflowAnalysis.strategy}`);
      log(`  Priority: ${result.workflowAnalysis.priority}`);
      
      if (result.workflowAnalysis.intent !== scenario.expectedIntent) {
        log(`  ⚠ Expected intent: ${scenario.expectedIntent}`, 'yellow');
      }
    }

    // Metrics
    console.log();
    log('Metrics:', 'blue');
    log(`  Latency: ${result.metrics?.latencyMs || result.totalTime}ms`);
    log(`  Tokens: ${result.metrics?.tokensUsed || 'N/A'}`);
    log(`  Steps: ${result.metrics?.stepsExecuted || 'N/A'}`);
    
    if (result.metrics?.toolsUsed?.length > 0) {
      log(`  Tools: ${result.metrics.toolsUsed.join(', ')}`);
    }

    // Response
    if (verbose && result.response) {
      console.log();
      log('Response:', 'cyan');
      console.log(result.response);
    } else if (result.response) {
      console.log();
      log('Response (first 200 chars):', 'cyan');
      console.log(result.response.substring(0, 200) + (result.response.length > 200 ? '...' : ''));
    }

    return { passed: true, intent: result.workflowAnalysis?.intent };
  } else {
    log('✗ Test failed', 'red');
    log(`  Error: ${result.error}`, 'red');
    return { passed: false, error: result.error };
  }
}

async function main() {
  const options = parseArgs();

  log('', 'reset');
  log('╔══════════════════════════════════════════╗', 'cyan');
  log('║     TellMyTale Agent Test Suite          ║', 'cyan');
  log('╚══════════════════════════════════════════╝', 'cyan');

  // Check environment
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  log(`\nTarget: ${baseUrl}`, 'dim');

  // Check if server is running
  try {
    const healthCheck = await fetch(`${baseUrl}/api/system/health`);
    if (!healthCheck.ok) {
      log('\n⚠ Server health check failed. Make sure the dev server is running.', 'yellow');
    } else {
      const health = await healthCheck.json();
      log(`Server status: ${health.status}`, health.status === 'healthy' ? 'green' : 'yellow');
    }
  } catch (error) {
    log('\n⚠ Could not connect to server. Make sure the dev server is running:', 'yellow');
    log('  npm run dev', 'dim');
    process.exit(1);
  }

  const results: { scenario: string; passed: boolean; intent?: string; error?: string }[] = [];

  if (options.all) {
    // Run all scenarios
    log('\nRunning all test scenarios...', 'bright');
    
    for (const scenario of TEST_SCENARIOS) {
      const result = await runScenario(scenario, options.verbose);
      results.push({
        scenario: scenario.name,
        passed: result.passed,
        intent: result.intent,
        error: result.error,
      });
    }

    // Summary
    logSection('Test Summary');
    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    
    log(`\n${passed}/${total} tests passed`, passed === total ? 'green' : 'yellow');
    
    if (passed < total) {
      console.log();
      log('Failed tests:', 'red');
      results.filter(r => !r.passed).forEach(r => {
        log(`  ✗ ${r.scenario}: ${r.error}`, 'red');
      });
    }
  } else if (options.scenario) {
    // Run specific scenario
    const scenario = TEST_SCENARIOS.find(s => s.id === options.scenario);
    if (!scenario) {
      log(`\n⚠ Unknown scenario: ${options.scenario}`, 'red');
      log('\nAvailable scenarios:', 'dim');
      TEST_SCENARIOS.forEach(s => log(`  - ${s.id}: ${s.name}`, 'dim'));
      process.exit(1);
    }
    
    await runScenario(scenario, options.verbose);
  } else if (options.message) {
    // Custom message test
    logSection('Custom Test');
    log(`📝 Message: "${options.message}"`, 'dim');
    
    const result = await testAgent(
      options.message,
      {
        customerEmail: options.email,
        orderNumber: options.order,
      },
      options.verbose
    );

    if (result.success) {
      log('✓ Test completed', 'green');
      
      if (result.workflowAnalysis) {
        console.log();
        log('Workflow Analysis:', 'magenta');
        log(`  Intent: ${result.workflowAnalysis.intent}`);
        log(`  Strategy: ${result.workflowAnalysis.strategy}`);
        log(`  Priority: ${result.workflowAnalysis.priority}`);
      }

      console.log();
      log('Metrics:', 'blue');
      log(`  Latency: ${result.metrics?.latencyMs || result.totalTime}ms`);
      log(`  Tokens: ${result.metrics?.tokensUsed || 'N/A'}`);

      console.log();
      log('Response:', 'cyan');
      console.log(result.response);
    } else {
      log('✗ Test failed', 'red');
      log(`  Error: ${result.error}`, 'red');
    }
  } else {
    // Show help
    log('\nUsage:', 'bright');
    log('  npx tsx scripts/test-production-agent.ts [options]', 'dim');
    console.log();
    log('Options:', 'bright');
    log('  --scenario <id>   Run a specific test scenario', 'dim');
    log('  --message <text>  Custom test message', 'dim');
    log('  --email <email>   Customer email for context', 'dim');
    log('  --order <number>  Order number for context', 'dim');
    log('  --all             Run all test scenarios', 'dim');
    log('  --verbose         Show detailed output', 'dim');
    console.log();
    log('Available scenarios:', 'bright');
    TEST_SCENARIOS.forEach(s => log(`  - ${s.id}: ${s.name}`, 'dim'));
    console.log();
    log('Examples:', 'bright');
    log('  npx tsx scripts/test-production-agent.ts --all', 'dim');
    log('  npx tsx scripts/test-production-agent.ts --scenario order-status --verbose', 'dim');
    log('  npx tsx scripts/test-production-agent.ts --message "Where is my order?" --email test@test.com', 'dim');
  }
}

main().catch(console.error);
