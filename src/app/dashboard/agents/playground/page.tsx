'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Send,
  RefreshCw,
  Settings,
  ChevronDown,
  Clock,
  Zap,
  MessageSquare,
  Bot,
  User,
  Wrench,
  AlertCircle,
  CheckCircle,
  Loader2,
  Copy,
  Check,
  Sparkles,
  FileText,
  ChevronRight,
} from 'lucide-react';

interface TestScenario {
  id: string;
  name: string;
  message: string;
  testScenario: {
    customerEmail?: string;
    customerName?: string;
    orderNumber?: string;
    channel?: string;
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

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metrics?: TestResult['metrics'];
  workflowAnalysis?: TestResult['workflowAnalysis'];
}

export default function AgentPlaygroundPage() {
  const [scenarios, setScenarios] = useState<TestScenario[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<TestScenario | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showScenarios, setShowScenarios] = useState(true);
  const [copied, setCopied] = useState(false);
  
  // Test options
  const [testOptions, setTestOptions] = useState({
    customerEmail: '',
    customerName: '',
    orderNumber: '',
    channel: 'web_chat',
    maxSteps: 5,
    includeWorkflow: true,
  });
  const [showOptions, setShowOptions] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch available scenarios
  useEffect(() => {
    fetch('/api/agents/test')
      .then(res => res.json())
      .then(data => setScenarios(data.scenarios || []))
      .catch(console.error);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const runTest = async (message: string, scenario?: TestScenario) => {
    if (!message.trim() || isLoading) return;

    setIsLoading(true);

    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');

    try {
      const response = await fetch('/api/agents/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: 'production',
          message,
          testScenario: scenario?.testScenario || {
            customerEmail: testOptions.customerEmail || undefined,
            customerName: testOptions.customerName || undefined,
            orderNumber: testOptions.orderNumber || undefined,
            channel: testOptions.channel,
          },
          options: {
            maxSteps: testOptions.maxSteps,
            includeWorkflow: testOptions.includeWorkflow,
            stream: false,
          },
        }),
      });

      const result: TestResult = await response.json();

      // Add assistant message
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: result.response || result.error || 'No response',
        timestamp: new Date(),
        metrics: result.metrics,
        workflowAnalysis: result.workflowAnalysis,
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'system',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadScenario = (scenario: TestScenario) => {
    setSelectedScenario(scenario);
    setInputMessage(scenario.message);
    setTestOptions(prev => ({
      ...prev,
      customerEmail: scenario.testScenario.customerEmail || '',
      customerName: scenario.testScenario.customerName || '',
      orderNumber: scenario.testScenario.orderNumber || '',
      channel: scenario.testScenario.channel || 'web_chat',
    }));
    setShowScenarios(false);
  };

  const clearConversation = () => {
    setMessages([]);
    setSelectedScenario(null);
  };

  const copyLastResponse = () => {
    const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
    if (lastAssistant) {
      navigator.clipboard.writeText(lastAssistant.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-[#DC3545] bg-[#DC3545]/10';
      case 'high': return 'text-[#FFC107] bg-[#FFC107]/10';
      case 'medium': return 'text-[#4A90D9] bg-[#4A90D9]/10';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStrategyColor = (strategy: string) => {
    switch (strategy) {
      case 'template_response': return 'text-[#28A745] bg-[#28A745]/10';
      case 'escalation': return 'text-[#DC3545] bg-[#DC3545]/10';
      case 'hybrid': return 'text-[#FFC107] bg-[#FFC107]/10';
      default: return 'text-[#4A90D9] bg-[#4A90D9]/10';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#2D4A6F]">Agent Playground</h1>
            <p className="text-gray-600">Test and debug your AI agents interactively</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={copyLastResponse}
              className="px-3 py-2 bg-white border rounded-lg hover:bg-gray-50 flex items-center gap-2 text-sm"
            >
              {copied ? <Check className="w-4 h-4 text-[#28A745]" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied' : 'Copy Response'}
            </button>
            <button
              onClick={clearConversation}
              className="px-3 py-2 bg-white border rounded-lg hover:bg-gray-50 flex items-center gap-2 text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Clear
            </button>
            <button
              onClick={() => setShowOptions(!showOptions)}
              className={`px-3 py-2 border rounded-lg flex items-center gap-2 text-sm ${
                showOptions ? 'bg-[#4A90D9] text-white' : 'bg-white hover:bg-gray-50'
              }`}
            >
              <Settings className="w-4 h-4" />
              Options
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Scenarios Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <button
                onClick={() => setShowScenarios(!showScenarios)}
                className="w-full flex items-center justify-between mb-3"
              >
                <h2 className="font-semibold text-[#2D4A6F] flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Test Scenarios
                </h2>
                <ChevronDown className={`w-4 h-4 transition-transform ${showScenarios ? '' : '-rotate-90'}`} />
              </button>

              <AnimatePresence>
                {showScenarios && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="space-y-2 overflow-hidden"
                  >
                    {scenarios.map(scenario => (
                      <button
                        key={scenario.id}
                        onClick={() => loadScenario(scenario)}
                        className={`w-full text-left p-3 rounded-lg border text-sm transition-colors ${
                          selectedScenario?.id === scenario.id
                            ? 'bg-[#4A90D9]/10 border-[#4A90D9]'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="font-medium text-gray-900">{scenario.name}</div>
                        <div className="text-gray-500 text-xs mt-1 line-clamp-2">
                          {scenario.message}
                        </div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Options Panel */}
            <AnimatePresence>
              {showOptions && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mt-4 bg-white rounded-xl shadow-sm border p-4"
                >
                  <h2 className="font-semibold text-[#2D4A6F] mb-3 flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Test Options
                  </h2>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-gray-600">Customer Email</label>
                      <input
                        type="email"
                        value={testOptions.customerEmail}
                        onChange={(e) => setTestOptions(prev => ({ ...prev, customerEmail: e.target.value }))}
                        className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                        placeholder="test@example.com"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600">Customer Name</label>
                      <input
                        type="text"
                        value={testOptions.customerName}
                        onChange={(e) => setTestOptions(prev => ({ ...prev, customerName: e.target.value }))}
                        className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                        placeholder="Test User"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600">Order Number</label>
                      <input
                        type="text"
                        value={testOptions.orderNumber}
                        onChange={(e) => setTestOptions(prev => ({ ...prev, orderNumber: e.target.value }))}
                        className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                        placeholder="12345"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600">Channel</label>
                      <select
                        value={testOptions.channel}
                        onChange={(e) => setTestOptions(prev => ({ ...prev, channel: e.target.value }))}
                        className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                      >
                        <option value="web_chat">Web Chat</option>
                        <option value="email">Email</option>
                        <option value="phone">Phone</option>
                        <option value="social">Social Media</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-600">Max Steps</label>
                      <input
                        type="number"
                        value={testOptions.maxSteps}
                        onChange={(e) => setTestOptions(prev => ({ ...prev, maxSteps: parseInt(e.target.value) || 5 }))}
                        className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                        min={1}
                        max={20}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="includeWorkflow"
                        checked={testOptions.includeWorkflow}
                        onChange={(e) => setTestOptions(prev => ({ ...prev, includeWorkflow: e.target.checked }))}
                        className="rounded border-gray-300"
                      />
                      <label htmlFor="includeWorkflow" className="text-sm text-gray-600">
                        Include Workflow Analysis
                      </label>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Chat Panel */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-sm border flex flex-col h-[calc(100vh-200px)]">
              {/* Chat Header */}
              <div className="p-4 border-b flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-[#4A90D9] to-[#2D4A6F] rounded-full flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900">Production Agent</div>
                  <div className="text-xs text-gray-500">TellMyTale Customer Success</div>
                </div>
                {selectedScenario && (
                  <div className="ml-auto px-3 py-1 bg-[#4A90D9]/10 text-[#4A90D9] rounded-full text-sm">
                    {selectedScenario.name}
                  </div>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400">
                    <Sparkles className="w-12 h-12 mb-3" />
                    <p className="text-lg font-medium">Start Testing</p>
                    <p className="text-sm">Select a scenario or type a message</p>
                  </div>
                )}

                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      message.role === 'user' 
                        ? 'bg-[#2D4A6F]' 
                        : message.role === 'system'
                          ? 'bg-[#DC3545]'
                          : 'bg-[#4A90D9]'
                    }`}>
                      {message.role === 'user' ? (
                        <User className="w-4 h-4 text-white" />
                      ) : message.role === 'system' ? (
                        <AlertCircle className="w-4 h-4 text-white" />
                      ) : (
                        <Bot className="w-4 h-4 text-white" />
                      )}
                    </div>

                    <div className={`flex-1 max-w-[80%] ${message.role === 'user' ? 'text-right' : ''}`}>
                      <div className={`inline-block rounded-xl p-4 ${
                        message.role === 'user'
                          ? 'bg-[#2D4A6F] text-white'
                          : message.role === 'system'
                            ? 'bg-[#DC3545]/10 text-[#DC3545]'
                            : 'bg-gray-100 text-gray-900'
                      }`}>
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      </div>

                      {/* Metrics */}
                      {message.metrics && (
                        <div className="mt-2 space-y-2">
                          {/* Workflow Analysis */}
                          {message.workflowAnalysis && (
                            <div className="bg-[#4A90D9]/5 rounded-lg p-3 text-sm">
                              <div className="flex items-center gap-2 mb-2">
                                <Sparkles className="w-4 h-4 text-[#4A90D9]" />
                                <span className="font-medium text-[#2D4A6F]">Workflow Analysis</span>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <span className="text-gray-500 text-xs">Intent:</span>
                                  <span className="ml-1 text-gray-900">{message.workflowAnalysis.intent}</span>
                                </div>
                                <div>
                                  <span className="text-gray-500 text-xs">Strategy:</span>
                                  <span className={`ml-1 px-2 py-0.5 rounded text-xs ${getStrategyColor(message.workflowAnalysis.strategy)}`}>
                                    {message.workflowAnalysis.strategy}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-500 text-xs">Priority:</span>
                                  <span className={`ml-1 px-2 py-0.5 rounded text-xs ${getPriorityColor(message.workflowAnalysis.priority)}`}>
                                    {message.workflowAnalysis.priority}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Performance Metrics */}
                          <div className="flex flex-wrap gap-2 text-xs">
                            <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded">
                              <Clock className="w-3 h-3 text-gray-500" />
                              <span>{message.metrics.latencyMs}ms</span>
                            </div>
                            {message.metrics.tokensUsed && (
                              <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded">
                                <Zap className="w-3 h-3 text-gray-500" />
                                <span>{message.metrics.tokensUsed} tokens</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded">
                              <MessageSquare className="w-3 h-3 text-gray-500" />
                              <span>{message.metrics.stepsExecuted} steps</span>
                            </div>
                          </div>

                          {/* Tools Used */}
                          {message.metrics.toolsUsed.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              <Wrench className="w-3 h-3 text-gray-400 mt-1" />
                              {message.metrics.toolsUsed.map((tool, i) => (
                                <span key={i} className="px-2 py-0.5 bg-[#28A745]/10 text-[#28A745] rounded text-xs">
                                  {tool}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="text-xs text-gray-400 mt-1">
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </motion.div>
                ))}

                {isLoading && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 bg-[#4A90D9] rounded-full flex items-center justify-center">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div className="bg-gray-100 rounded-xl p-4">
                      <Loader2 className="w-5 h-5 text-[#4A90D9] animate-spin" />
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t">
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && runTest(inputMessage, selectedScenario || undefined)}
                    placeholder="Type a test message..."
                    className="flex-1 px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A90D9]"
                    disabled={isLoading}
                  />
                  <button
                    onClick={() => runTest(inputMessage, selectedScenario || undefined)}
                    disabled={!inputMessage.trim() || isLoading}
                    className="px-6 py-3 bg-[#4A90D9] text-white rounded-xl hover:bg-[#3A7BC4] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Play className="w-5 h-5" />
                        Test
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
