'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Bot,
  ArrowLeft,
  Save,
  Trash2,
  Play,
  Loader2,
  Settings,
  Zap,
  FileText,
  BarChart3,
  Clock,
  CheckCircle,
  AlertCircle,
  Star,
  StarOff,
  Brain,
  Sliders,
  Plus,
  X,
} from 'lucide-react';
import { Header } from '@/components/dashboard/Header';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/components/ui/Toast';
import Link from 'next/link';

const availableTools = [
  { id: 'orderLookup', name: 'Order Lookup', description: 'Look up order details and status' },
  { id: 'faqRetrieval', name: 'FAQ Retrieval', description: 'Search knowledge base articles' },
  { id: 'productInfo', name: 'Product Info', description: 'Get product information' },
  { id: 'escalation', name: 'Escalation', description: 'Escalate to human agents' },
  { id: 'shippingTracker', name: 'Shipping Tracker', description: 'Track shipments' },
  { id: 'gorgiasTicketLookup', name: 'Gorgias Tickets', description: 'Look up support tickets' },
  { id: 'gorgiasCustomerHistory', name: 'Customer History', description: 'View customer support history' },
  { id: 'templateSearch', name: 'Template Search', description: 'Search response templates' },
  { id: 'recommendTemplate', name: 'Recommend Template', description: 'Get recommended templates' },
];

const availableCapabilities = [
  'order_management',
  'refunds',
  'shipping_inquiries',
  'product_questions',
  'technical_support',
  'escalation',
  'template_responses',
  'sentiment_analysis',
];

export default function AgentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const agentId = params.id as string;

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    avatar: '',
    model: 'gpt-4o',
    fallbackModels: [] as string[],
    temperature: 0.7,
    maxTokens: 1000,
    systemPrompt: '',
    personality: 'friendly',
    responseLength: 'balanced',
    capabilities: [] as string[],
    allowedTools: [] as string[],
    routingPriority: 1,
    routingConditions: {
      channels: [] as string[],
      categories: [] as string[],
      keywords: [] as string[],
      customerTags: [] as string[],
    },
    isActive: true,
    isPrimary: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'model' | 'tools' | 'routing' | 'stats'>('general');
  const [newKeyword, setNewKeyword] = useState('');
  const [newChannel, setNewChannel] = useState('');

  // Fetch agent data
  const { data: agent, isLoading, refetch } = trpc.agents.getAgent.useQuery({ id: agentId });
  const { data: agentStats } = trpc.agents.getAgentStats.useQuery({ agentId });

  // Mutations
  const updateAgentMutation = trpc.agents.updateAgent.useMutation({
    onSuccess: () => {
      setIsSaving(false);
      refetch();
      showToast('success', 'Agent updated successfully');
    },
    onError: (error) => {
      setIsSaving(false);
      showToast('error', error.message);
    },
  });

  const deleteAgentMutation = trpc.agents.deleteAgent.useMutation({
    onSuccess: () => {
      showToast('success', 'Agent deleted');
      router.push('/dashboard/agents');
    },
    onError: (error) => showToast('error', error.message),
  });

  // Initialize form with agent data
  useEffect(() => {
    if (agent) {
      setFormData({
        name: agent.name,
        description: agent.description || '',
        avatar: agent.avatar || '',
        model: agent.model,
        fallbackModels: (agent.fallbackModels as string[]) || [],
        temperature: agent.temperature || 0.7,
        maxTokens: agent.maxTokens || 1000,
        systemPrompt: agent.systemPrompt || '',
        personality: agent.personality || 'friendly',
        responseLength: agent.responseLength || 'balanced',
        capabilities: (agent.capabilities as string[]) || [],
        allowedTools: (agent.allowedTools as string[]) || [],
        routingPriority: agent.routingPriority || 1,
        routingConditions: (agent.routingConditions as typeof formData.routingConditions) || {
          channels: [],
          categories: [],
          keywords: [],
          customerTags: [],
        },
        isActive: agent.isActive,
        isPrimary: agent.isPrimary,
      });
    }
  }, [agent]);

  const handleSave = () => {
    setIsSaving(true);
    updateAgentMutation.mutate({
      id: agentId,
      name: formData.name,
      description: formData.description,
      avatar: formData.avatar,
      model: formData.model,
      fallbackModels: formData.fallbackModels,
      temperature: formData.temperature,
      maxTokens: formData.maxTokens,
      systemPrompt: formData.systemPrompt,
      personality: formData.personality as 'friendly' | 'professional' | 'casual',
      responseLength: formData.responseLength as 'concise' | 'balanced' | 'detailed',
      capabilities: formData.capabilities,
      allowedTools: formData.allowedTools,
      routingPriority: formData.routingPriority,
      routingConditions: formData.routingConditions,
      isActive: formData.isActive,
      isPrimary: formData.isPrimary,
    });
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this agent? This action cannot be undone.')) {
      deleteAgentMutation.mutate({ id: agentId });
    }
  };

  const toggleTool = (toolId: string) => {
    setFormData(prev => ({
      ...prev,
      allowedTools: prev.allowedTools.includes(toolId)
        ? prev.allowedTools.filter(t => t !== toolId)
        : [...prev.allowedTools, toolId],
    }));
  };

  const toggleCapability = (cap: string) => {
    setFormData(prev => ({
      ...prev,
      capabilities: prev.capabilities.includes(cap)
        ? prev.capabilities.filter(c => c !== cap)
        : [...prev.capabilities, cap],
    }));
  };

  const addKeyword = () => {
    if (newKeyword.trim()) {
      setFormData(prev => ({
        ...prev,
        routingConditions: {
          ...prev.routingConditions,
          keywords: [...(prev.routingConditions.keywords || []), newKeyword.trim()],
        },
      }));
      setNewKeyword('');
    }
  };

  const removeKeyword = (keyword: string) => {
    setFormData(prev => ({
      ...prev,
      routingConditions: {
        ...prev.routingConditions,
        keywords: (prev.routingConditions.keywords || []).filter(k => k !== keyword),
      },
    }));
  };

  if (isLoading) {
    return (
      <>
        <Header title="Loading Agent..." />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#1B2838]" />
        </div>
      </>
    );
  }

  if (!agent) {
    return (
      <>
        <Header title="Agent Not Found" />
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[#1B2838] mb-2">Agent Not Found</h3>
          <p className="text-gray-500 mb-6">The agent you're looking for doesn't exist.</p>
          <Link
            href="/dashboard/agents"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#1B2838] text-white rounded-xl font-medium hover:bg-[#2D4A6F] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Agents
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <Header
        title={agent.name}
        subtitle="Configure agent settings and behavior"
        actions={
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/agents"
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Link>
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-[#DC3545]/30 rounded-xl text-sm font-medium text-[#DC3545] hover:bg-[#DC3545]/10 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#1B2838] text-white rounded-xl font-medium hover:bg-[#2D4A6F] transition-colors disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Changes
            </button>
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {[
          { id: 'general', icon: Settings, label: 'General' },
          { id: 'model', icon: Brain, label: 'Model' },
          { id: 'tools', icon: Zap, label: 'Tools & Capabilities' },
          { id: 'routing', icon: Sliders, label: 'Routing' },
          { id: 'stats', icon: BarChart3, label: 'Statistics' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'bg-[#1B2838] text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        {/* General Tab */}
        {activeTab === 'general' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Agent Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#1B2838] transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Avatar (emoji)</label>
                <input
                  type="text"
                  value={formData.avatar}
                  onChange={(e) => setFormData(prev => ({ ...prev, avatar: e.target.value }))}
                  placeholder="🤖"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#1B2838] transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#1B2838] transition-colors resize-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Personality</label>
                <select
                  value={formData.personality}
                  onChange={(e) => setFormData(prev => ({ ...prev, personality: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#1B2838] transition-colors"
                >
                  <option value="friendly">Friendly</option>
                  <option value="professional">Professional</option>
                  <option value="casual">Casual</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Response Length</label>
                <select
                  value={formData.responseLength}
                  onChange={(e) => setFormData(prev => ({ ...prev, responseLength: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#1B2838] transition-colors"
                >
                  <option value="concise">Concise</option>
                  <option value="balanced">Balanced</option>
                  <option value="detailed">Detailed</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="w-5 h-5 rounded border-gray-300 text-[#1B2838] focus:ring-[#1B2838]"
                />
                <span className="text-sm text-gray-700">Active</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isPrimary}
                  onChange={(e) => setFormData(prev => ({ ...prev, isPrimary: e.target.checked }))}
                  className="w-5 h-5 rounded border-gray-300 text-[#1B2838] focus:ring-[#1B2838]"
                />
                <span className="text-sm text-gray-700">Primary Agent</span>
              </label>
            </div>
          </div>
        )}

        {/* Model Tab */}
        {activeTab === 'model' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Primary Model</label>
              <select
                value={formData.model}
                onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#1B2838] transition-colors"
              >
                <option value="gpt-4o">GPT-4o (OpenAI)</option>
                <option value="gpt-4o-mini">GPT-4o Mini (OpenAI)</option>
                <option value="claude-sonnet-4-20250514">Claude Sonnet 4 (Anthropic)</option>
                <option value="claude-3-5-haiku-latest">Claude 3.5 Haiku (Anthropic)</option>
                <option value="gemini-2.0-flash">Gemini 2.0 Flash (Google)</option>
                <option value="gemini-2.5-pro">Gemini 2.5 Pro (Google)</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Temperature: {formData.temperature}
                </label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={formData.temperature}
                  onChange={(e) => setFormData(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Focused</span>
                  <span>Creative</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Tokens</label>
                <input
                  type="number"
                  min="100"
                  max="8000"
                  value={formData.maxTokens}
                  onChange={(e) => setFormData(prev => ({ ...prev, maxTokens: parseInt(e.target.value) }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#1B2838] transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">System Prompt (Optional Override)</label>
              <textarea
                value={formData.systemPrompt}
                onChange={(e) => setFormData(prev => ({ ...prev, systemPrompt: e.target.value }))}
                rows={10}
                placeholder="Leave empty to use the default TellMyTale system prompt"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#1B2838] transition-colors resize-none font-mono text-sm"
              />
            </div>
          </div>
        )}

        {/* Tools Tab */}
        {activeTab === 'tools' && (
          <div className="space-y-6">
            <div>
              <h4 className="font-semibold text-[#1B2838] mb-3">Available Tools</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {availableTools.map((tool) => (
                  <button
                    key={tool.id}
                    onClick={() => toggleTool(tool.id)}
                    className={`p-4 rounded-xl border text-left transition-colors ${
                      formData.allowedTools.includes(tool.id)
                        ? 'bg-[#4A90D9]/10 border-[#4A90D9]/30'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-[#1B2838]">{tool.name}</span>
                      {formData.allowedTools.includes(tool.id) && (
                        <CheckCircle className="w-5 h-5 text-[#4A90D9]" />
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{tool.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-[#1B2838] mb-3">Capabilities</h4>
              <div className="flex flex-wrap gap-2">
                {availableCapabilities.map((cap) => (
                  <button
                    key={cap}
                    onClick={() => toggleCapability(cap)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                      formData.capabilities.includes(cap)
                        ? 'bg-[#2D4A6F]/15 text-[#2D4A6F]'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {cap.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Routing Tab */}
        {activeTab === 'routing' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Routing Priority</label>
              <input
                type="number"
                min="1"
                max="100"
                value={formData.routingPriority}
                onChange={(e) => setFormData(prev => ({ ...prev, routingPriority: parseInt(e.target.value) }))}
                className="w-full max-w-xs px-4 py-3 rounded-xl border border-gray-200 focus:border-[#1B2838] transition-colors"
              />
              <p className="text-sm text-gray-500 mt-1">Lower numbers have higher priority</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Trigger Keywords</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  placeholder="Add keyword..."
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                  className="flex-1 px-4 py-2 rounded-xl border border-gray-200 focus:border-[#1B2838] transition-colors"
                />
                <button
                  onClick={addKeyword}
                  className="px-4 py-2 bg-[#1B2838] text-white rounded-xl hover:bg-[#2D4A6F] transition-colors"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(formData.routingConditions.keywords || []).map((keyword) => (
                  <span
                    key={keyword}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-lg text-sm"
                  >
                    {keyword}
                    <button
                      onClick={() => removeKeyword(keyword)}
                      className="p-0.5 hover:bg-gray-200 rounded"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Channels</label>
              <div className="flex flex-wrap gap-2">
                {['web_chat', 'email', 'contact_form', 'mobile_app'].map((channel) => (
                  <button
                    key={channel}
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      routingConditions: {
                        ...prev.routingConditions,
                        channels: (prev.routingConditions.channels || []).includes(channel)
                          ? (prev.routingConditions.channels || []).filter(c => c !== channel)
                          : [...(prev.routingConditions.channels || []), channel],
                      },
                    }))}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                      (formData.routingConditions.channels || []).includes(channel)
                        ? 'bg-[#4A90D9]/15 text-[#4A90D9]'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {channel.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Stats Tab */}
        {activeTab === 'stats' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="text-sm text-gray-500 mb-1">Total Conversations</div>
                <div className="text-2xl font-bold text-[#1B2838]">
                  {agentStats?.stats.totalConversations || 0}
                </div>
              </div>
              <div className="p-4 bg-[#28A745]/10 rounded-xl">
                <div className="text-sm text-gray-500 mb-1">Resolved</div>
                <div className="text-2xl font-bold text-[#28A745]">
                  {agentStats?.stats.resolvedConversations || 0}
                </div>
              </div>
              <div className="p-4 bg-[#4A90D9]/10 rounded-xl">
                <div className="text-sm text-gray-500 mb-1">Resolution Rate</div>
                <div className="text-2xl font-bold text-[#4A90D9]">
                  {agentStats?.stats.resolutionRate || '0'}%
                </div>
              </div>
              <div className="p-4 bg-[#2D4A6F]/10 rounded-xl">
                <div className="text-sm text-gray-500 mb-1">Avg Response Time</div>
                <div className="text-2xl font-bold text-[#2D4A6F]">
                  {agentStats?.stats.avgResponseTime || 0}ms
                </div>
              </div>
            </div>

            {agentStats?.recentActivity && agentStats.recentActivity.length > 0 && (
              <div>
                <h4 className="font-semibold text-[#1B2838] mb-3">Recent Activity</h4>
                <div className="space-y-2">
                  {agentStats.recentActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        {activity.success ? (
                          <CheckCircle className="w-5 h-5 text-[#28A745]" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-[#DC3545]" />
                        )}
                        <div>
                          <div className="font-medium text-[#1B2838]">{activity.activityType}</div>
                          <div className="text-sm text-gray-500">
                            {new Date(activity.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-gray-500">
                        {activity.responseTimeMs}ms
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
