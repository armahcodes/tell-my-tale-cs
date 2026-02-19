'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  Plus,
  Settings,
  Zap,
  MessageSquare,
  CheckCircle,
  Clock,
  BarChart3,
  FileText,
  Loader2,
  MoreVertical,
  Edit,
  Trash2,
  Star,
  StarOff,
  Power,
  PowerOff,
  ChevronRight,
  Brain,
  Sparkles,
} from 'lucide-react';
import { Header } from '@/components/dashboard/Header';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/components/ui/Toast';
import Link from 'next/link';

export default function AgentsPage() {
  const { showToast } = useToast();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  // Fetch agents
  const { data: agents, isLoading, refetch } = trpc.agents.listAgents.useQuery({ includeInactive: true });

  // Mutations
  const updateAgentMutation = trpc.agents.updateAgent.useMutation({
    onSuccess: () => {
      refetch();
      showToast('success', 'Agent updated');
    },
    onError: (error) => showToast('error', error.message),
  });

  const deleteAgentMutation = trpc.agents.deleteAgent.useMutation({
    onSuccess: () => {
      refetch();
      showToast('success', 'Agent deleted');
    },
    onError: (error) => showToast('error', error.message),
  });

  const createAgentMutation = trpc.agents.createAgent.useMutation({
    onSuccess: () => {
      refetch();
      setShowCreateModal(false);
      showToast('success', 'Agent created');
    },
    onError: (error) => showToast('error', error.message),
  });

  const handleToggleActive = (agentId: string, currentStatus: boolean) => {
    updateAgentMutation.mutate({ id: agentId, isActive: !currentStatus });
  };

  const handleTogglePrimary = (agentId: string, currentStatus: boolean) => {
    updateAgentMutation.mutate({ id: agentId, isPrimary: !currentStatus });
  };

  const handleDelete = (agentId: string) => {
    if (confirm('Are you sure you want to delete this agent?')) {
      deleteAgentMutation.mutate({ id: agentId });
    }
  };

  const handleCreateAgent = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createAgentMutation.mutate({
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      model: formData.get('model') as string || 'gpt-4o',
      personality: (formData.get('personality') as 'friendly' | 'professional' | 'casual') || 'friendly',
      responseLength: (formData.get('responseLength') as 'concise' | 'balanced' | 'detailed') || 'balanced',
    });
  };

  if (isLoading) {
    return (
      <>
        <Header title="AI Agents" subtitle="Manage your customer support agents" />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#1B2838]" />
        </div>
      </>
    );
  }

  const activeAgents = agents?.filter(a => a.isActive) || [];
  const inactiveAgents = agents?.filter(a => !a.isActive) || [];

  return (
    <>
      <Header 
        title="AI Agents" 
        subtitle="Manage your customer support agents and their configurations"
        actions={
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/agents/templates"
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <FileText className="w-4 h-4" />
              Templates
            </Link>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#1B2838] text-white rounded-xl font-medium hover:bg-[#2D4A6F] transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Agent
            </button>
          </div>
        }
      />

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Bot className="w-5 h-5 text-[#4A90D9]" />
            <span className="text-sm text-gray-500">Total Agents</span>
          </div>
          <p className="text-2xl font-bold text-[#1B2838]">{agents?.length || 0}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-5 h-5 text-[#28A745]" />
            <span className="text-sm text-gray-500">Active</span>
          </div>
          <p className="text-2xl font-bold text-[#28A745]">{activeAgents.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="w-5 h-5 text-[#2D4A6F]" />
            <span className="text-sm text-gray-500">Conversations</span>
          </div>
          <p className="text-2xl font-bold text-[#1B2838]">
            {agents?.reduce((sum, a) => sum + (a.totalConversations || 0), 0) || 0}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-[#28A745]" />
            <span className="text-sm text-gray-500">Resolved</span>
          </div>
          <p className="text-2xl font-bold text-[#1B2838]">
            {agents?.reduce((sum, a) => sum + (a.resolvedConversations || 0), 0) || 0}
          </p>
        </div>
      </div>

      {/* Agents List */}
      {agents?.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <Bot className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[#1B2838] mb-2">No Agents Yet</h3>
          <p className="text-gray-500 mb-6">Create your first AI agent to start automating customer support.</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#1B2838] text-white rounded-xl font-medium hover:bg-[#2D4A6F] transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create First Agent
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active Agents */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Active Agents ({activeAgents.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeAgents.map((agent) => (
                <motion.div
                  key={agent.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          agent.isPrimary 
                            ? 'bg-gradient-to-br from-[#FFC107] to-[#FF9800]'
                            : 'bg-gradient-to-br from-[#1B2838] to-[#2D4A6F]'
                        }`}>
                          {agent.avatar ? (
                            <span className="text-2xl">{agent.avatar}</span>
                          ) : (
                            <Bot className="w-6 h-6 text-white" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-[#1B2838]">{agent.name}</h4>
                            {agent.isPrimary && (
                              <Star className="w-4 h-4 text-[#FFC107] fill-[#FFC107]" />
                            )}
                          </div>
                          <p className="text-xs text-gray-500">{agent.model}</p>
                        </div>
                      </div>
                      <div className="relative">
                        <button
                          onClick={() => setMenuOpen(menuOpen === agent.id ? null : agent.id)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <MoreVertical className="w-4 h-4 text-gray-400" />
                        </button>
                        <AnimatePresence>
                          {menuOpen === agent.id && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-10"
                            >
                              <Link
                                href={`/dashboard/agents/${agent.id}`}
                                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                <Edit className="w-4 h-4" />
                                Edit Agent
                              </Link>
                              <button
                                onClick={() => handleTogglePrimary(agent.id, agent.isPrimary)}
                                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                {agent.isPrimary ? <StarOff className="w-4 h-4" /> : <Star className="w-4 h-4" />}
                                {agent.isPrimary ? 'Remove Primary' : 'Set as Primary'}
                              </button>
                              <button
                                onClick={() => handleToggleActive(agent.id, agent.isActive)}
                                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                <PowerOff className="w-4 h-4" />
                                Deactivate
                              </button>
                              <hr className="my-1" />
                              <button
                                onClick={() => handleDelete(agent.id)}
                                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-[#DC3545] hover:bg-[#DC3545]/10"
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    {agent.description && (
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">{agent.description}</p>
                    )}

                    <div className="flex items-center gap-2 flex-wrap mb-4">
                      <span className="px-2 py-1 bg-[#4A90D9]/10 text-[#4A90D9] rounded-lg text-xs font-medium capitalize">
                        {agent.personality}
                      </span>
                      <span className="px-2 py-1 bg-[#2D4A6F]/10 text-[#2D4A6F] rounded-lg text-xs font-medium capitalize">
                        {agent.responseLength}
                      </span>
                      {agent.capabilities && (agent.capabilities as string[]).slice(0, 2).map((cap, i) => (
                        <span key={i} className="px-2 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs">
                          {cap}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1 text-gray-500">
                          <MessageSquare className="w-4 h-4" />
                          <span>{agent.totalConversations || 0}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[#28A745]">
                          <CheckCircle className="w-4 h-4" />
                          <span>{agent.resolvedConversations || 0}</span>
                        </div>
                      </div>
                      <Link
                        href={`/dashboard/agents/${agent.id}`}
                        className="flex items-center gap-1 text-sm text-[#1B2838] hover:text-[#4A90D9] font-medium"
                      >
                        Configure
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Inactive Agents */}
          {inactiveAgents.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Inactive Agents ({inactiveAgents.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {inactiveAgents.map((agent) => (
                  <div
                    key={agent.id}
                    className="bg-gray-50 rounded-2xl border border-gray-200 p-5 opacity-75"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gray-200 flex items-center justify-center">
                          <Bot className="w-5 h-5 text-gray-400" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-600">{agent.name}</h4>
                          <p className="text-xs text-gray-400">{agent.model}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggleActive(agent.id, agent.isActive)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-100"
                      >
                        <Power className="w-4 h-4" />
                        Activate
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Agent Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-gradient-to-br from-[#1B2838] to-[#2D4A6F] rounded-xl">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#1B2838]">Create New Agent</h3>
                  <p className="text-sm text-gray-500">Configure your AI support agent</p>
                </div>
              </div>

              <form onSubmit={handleCreateAgent} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Agent Name</label>
                  <input
                    type="text"
                    name="name"
                    required
                    placeholder="e.g., Customer Support Bot"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#1B2838] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    name="description"
                    rows={2}
                    placeholder="What does this agent do?"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#1B2838] transition-colors resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                    <select
                      name="model"
                      defaultValue="gpt-4o"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#1B2838] transition-colors"
                    >
                      <option value="gpt-4o">GPT-4o</option>
                      <option value="gpt-4o-mini">GPT-4o Mini</option>
                      <option value="claude-sonnet-4-20250514">Claude Sonnet</option>
                      <option value="gemini-2.0-flash">Gemini Flash</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Personality</label>
                    <select
                      name="personality"
                      defaultValue="friendly"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#1B2838] transition-colors"
                    >
                      <option value="friendly">Friendly</option>
                      <option value="professional">Professional</option>
                      <option value="casual">Casual</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Response Length</label>
                  <select
                    name="responseLength"
                    defaultValue="balanced"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#1B2838] transition-colors"
                  >
                    <option value="concise">Concise</option>
                    <option value="balanced">Balanced</option>
                    <option value="detailed">Detailed</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createAgentMutation.isPending}
                    className="flex-1 py-3 rounded-xl bg-[#1B2838] text-white font-medium hover:bg-[#2D4A6F] transition-colors disabled:opacity-50"
                  >
                    {createAgentMutation.isPending ? (
                      <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                    ) : (
                      'Create Agent'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Click outside to close menu */}
      {menuOpen && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => setMenuOpen(null)} 
        />
      )}
    </>
  );
}
