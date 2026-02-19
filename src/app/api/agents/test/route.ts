/**
 * Agent Testing API
 * Test agents with different configurations and scenarios
 */

import { NextRequest } from 'next/server';
import { mastra, getProductionAgent, customerSupportWorkflow } from '@/lib/mastra';
import { getObservabilityService } from '@/lib/mastra';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface TestRequest {
  agentId?: string;
  message: string;
  testScenario?: {
    customerEmail?: string;
    customerName?: string;
    orderNumber?: string;
    channel?: string;
  };
  options?: {
    maxSteps?: number;
    stream?: boolean;
    includeWorkflow?: boolean;
    temperature?: number;
  };
}

interface TestResult {
  success: boolean;
  requestId: string;
  agentId: string;
  response?: string;
  workflowAnalysis?: {
    intent: string;
    strategy: string;
    priority: string;
    contextSummary: string;
  };
  metrics: {
    latencyMs: number;
    tokensUsed?: number;
    toolsUsed: string[];
    stepsExecuted: number;
  };
  error?: string;
}

/**
 * POST /api/agents/test
 * Test an agent with a specific message and scenario
 */
export async function POST(req: NextRequest): Promise<Response> {
  const startTime = Date.now();
  const requestId = `test-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const observability = getObservabilityService();

  try {
    const body: TestRequest = await req.json();
    const { agentId = 'production', message, testScenario, options } = body;

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get the agent
    let agent;
    if (agentId === 'production') {
      agent = getProductionAgent();
    } else if (agentId === 'customerSuccess') {
      agent = mastra.getAgent('customerSuccess');
    } else {
      return new Response(
        JSON.stringify({ 
          error: `Agent '${agentId}' not found`,
          availableAgents: ['production', 'customerSuccess'],
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!agent) {
      return new Response(
        JSON.stringify({ error: `Agent '${agentId}' failed to initialize` }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Run workflow analysis if requested
    let workflowAnalysis;
    if (options?.includeWorkflow !== false) {
      try {
        const run = customerSupportWorkflow.createRun();
        const result = await run.start({
          inputData: {
            message,
            customerEmail: testScenario?.customerEmail,
            customerName: testScenario?.customerName,
            orderNumber: testScenario?.orderNumber,
            channel: testScenario?.channel,
          },
        });

        if (result.status === 'success') {
          workflowAnalysis = {
            intent: result.result.intent,
            strategy: result.result.strategy,
            priority: result.result.priority,
            contextSummary: result.result.contextSummary,
          };
        }
      } catch (error) {
        console.error('[Test API] Workflow analysis failed:', error);
      }
    }

    // Build context message
    const contextParts: string[] = [];
    if (testScenario?.customerEmail) {
      contextParts.push(`Customer: ${testScenario.customerName || 'Test User'} (${testScenario.customerEmail})`);
    }
    if (testScenario?.orderNumber) {
      contextParts.push(`Order: ${testScenario.orderNumber}`);
    }
    if (testScenario?.channel) {
      contextParts.push(`Channel: ${testScenario.channel}`);
    }

    const contextMessage = contextParts.length > 0
      ? `[Test Context: ${contextParts.join(', ')}]`
      : '';

    // Format messages
    const formattedMessages = [
      ...(contextMessage ? [{ role: 'system' as const, content: contextMessage }] : []),
      { role: 'user' as const, content: message },
    ];

    // Track metrics
    const metrics = observability.startRequest(agentId, 'test', testScenario?.customerEmail);
    const toolsUsed: string[] = [];
    let stepsExecuted = 0;

    // Execute agent
    if (options?.stream) {
      // Return streaming response
      const result = await agent.stream(
        formattedMessages as Parameters<typeof agent.stream>[0],
        {
          maxSteps: options.maxSteps || 5,
          onStepFinish: ({ toolCalls }) => {
            stepsExecuted++;
            if (toolCalls) {
              for (const tc of toolCalls) {
                if ('toolName' in tc && typeof tc.toolName === 'string') {
                  if (!toolsUsed.includes(tc.toolName)) {
                    toolsUsed.push(tc.toolName);
                  }
                }
              }
            }
          },
        }
      );

      const encoder = new TextEncoder();
      let fullResponse = '';

      const stream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of result.textStream) {
              fullResponse += chunk;
              controller.enqueue(encoder.encode(chunk));
            }
            
            // Send final metrics as JSON comment
            const finalMetrics = {
              requestId,
              latencyMs: Date.now() - startTime,
              toolsUsed,
              stepsExecuted,
            };
            controller.enqueue(encoder.encode(`\n\n<!-- metrics: ${JSON.stringify(finalMetrics)} -->`));
            controller.close();

            observability.completeRequest(metrics, {
              success: true,
              toolsUsed,
            });
          } catch (error) {
            controller.error(error);
            observability.completeRequest(metrics, {
              success: false,
              errorMessage: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'X-Request-Id': requestId,
          'Cache-Control': 'no-cache',
        },
      });
    } else {
      // Return complete response
      const result = await agent.generate(
        formattedMessages as Parameters<typeof agent.generate>[0],
        {
          maxSteps: options?.maxSteps || 5,
          onStepFinish: ({ toolCalls }) => {
            stepsExecuted++;
            if (toolCalls) {
              for (const tc of toolCalls) {
                if ('toolName' in tc && typeof tc.toolName === 'string') {
                  if (!toolsUsed.includes(tc.toolName)) {
                    toolsUsed.push(tc.toolName);
                  }
                }
              }
            }
          },
        }
      );

      const latencyMs = Date.now() - startTime;

      observability.completeRequest(metrics, {
        success: true,
        tokensUsed: result.usage?.totalTokens,
        toolsUsed,
      });

      const testResult: TestResult = {
        success: true,
        requestId,
        agentId,
        response: result.text || '',
        workflowAnalysis,
        metrics: {
          latencyMs,
          tokensUsed: result.usage?.totalTokens,
          toolsUsed,
          stepsExecuted,
        },
      };

      return new Response(JSON.stringify(testResult, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'X-Request-Id': requestId,
        },
      });
    }
  } catch (error) {
    console.error('[Test API] Error:', error);
    
    const testResult: TestResult = {
      success: false,
      requestId,
      agentId: 'unknown',
      metrics: {
        latencyMs: Date.now() - startTime,
        toolsUsed: [],
        stepsExecuted: 0,
      },
      error: error instanceof Error ? error.message : 'Unknown error',
    };

    return new Response(JSON.stringify(testResult, null, 2), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * GET /api/agents/test
 * Get available test scenarios
 */
export async function GET(): Promise<Response> {
  const scenarios = [
    {
      id: 'order-status',
      name: 'Order Status Inquiry',
      message: "Hi, I ordered a personalized book for my daughter's birthday. Order #12345. Can you tell me when it will arrive?",
      testScenario: {
        customerEmail: 'test@example.com',
        customerName: 'Test User',
        orderNumber: '12345',
        channel: 'web_chat',
      },
    },
    {
      id: 'cancellation',
      name: 'Order Cancellation Request',
      message: "I need to cancel my order #67890. I ordered the wrong book and want a refund.",
      testScenario: {
        customerEmail: 'test@example.com',
        customerName: 'Test User',
        orderNumber: '67890',
        channel: 'email',
      },
    },
    {
      id: 'return-request',
      name: 'Return/Replacement Request',
      message: "I received my book but my child's name is spelled wrong. The book says 'Emilly' but it should be 'Emily'. Can I get this fixed?",
      testScenario: {
        customerEmail: 'parent@example.com',
        customerName: 'Sarah Johnson',
        orderNumber: '11111',
        channel: 'web_chat',
      },
    },
    {
      id: 'product-question',
      name: 'Product Question',
      message: "What customization options are available for the birthday book? Can I include photos?",
      testScenario: {
        customerEmail: 'curious@example.com',
        customerName: 'Mike Wilson',
        channel: 'web_chat',
      },
    },
    {
      id: 'escalation',
      name: 'Escalation Request',
      message: "I've been waiting 3 weeks for my order and nobody is helping me. I want to speak to a manager NOW!",
      testScenario: {
        customerEmail: 'frustrated@example.com',
        customerName: 'Angry Customer',
        orderNumber: '99999',
        channel: 'email',
      },
    },
    {
      id: 'revision',
      name: 'Revision Request',
      message: "I just placed my order but realized I want to change the child's age from 5 to 6. Is it too late?",
      testScenario: {
        customerEmail: 'oops@example.com',
        customerName: 'Forgetful Parent',
        orderNumber: '22222',
        channel: 'web_chat',
      },
    },
    {
      id: 'shipping',
      name: 'Shipping Inquiry',
      message: "Do you ship internationally? How long does delivery take to Canada?",
      testScenario: {
        channel: 'web_chat',
      },
    },
    {
      id: 'general',
      name: 'General Question',
      message: "Hi! I'm looking for a special gift for my niece. What do you recommend?",
      testScenario: {
        customerName: 'New Customer',
        channel: 'web_chat',
      },
    },
  ];

  return new Response(JSON.stringify({ scenarios }, null, 2), {
    headers: { 'Content-Type': 'application/json' },
  });
}
