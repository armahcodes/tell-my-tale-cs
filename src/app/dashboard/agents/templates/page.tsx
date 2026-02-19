'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Plus,
  Search,
  Edit,
  Trash2,
  Copy,
  Check,
  Loader2,
  ChevronDown,
  Tag,
  Eye,
  X,
  ArrowLeft,
  Sparkles,
  Clock,
  BarChart3,
} from 'lucide-react';
import { Header } from '@/components/dashboard/Header';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/components/ui/Toast';
import Link from 'next/link';
import { TEMPLATE_CATEGORIES } from '@/lib/data/response-templates';

export default function TemplatesPage() {
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Fetch templates
  const { data: templates, isLoading, refetch } = trpc.agents.listTemplates.useQuery({
    category: selectedCategory || undefined,
    search: searchQuery || undefined,
    includeInactive: true,
  });

  // Fetch categories
  const { data: categories } = trpc.agents.getCategories.useQuery();

  // Mutations
  const createTemplateMutation = trpc.agents.createTemplate.useMutation({
    onSuccess: () => {
      refetch();
      setShowCreateModal(false);
      showToast('success', 'Template created');
    },
    onError: (error) => showToast('error', error.message),
  });

  const updateTemplateMutation = trpc.agents.updateTemplate.useMutation({
    onSuccess: () => {
      refetch();
      setEditingTemplate(null);
      showToast('success', 'Template updated');
    },
    onError: (error) => showToast('error', error.message),
  });

  const deleteTemplateMutation = trpc.agents.deleteTemplate.useMutation({
    onSuccess: () => {
      refetch();
      showToast('success', 'Template deleted');
    },
    onError: (error) => showToast('error', error.message),
  });

  const seedTemplatesMutation = trpc.agents.seedDefaultTemplates.useMutation({
    onSuccess: (data) => {
      refetch();
      if (data.success) {
        showToast('success', `Seeded ${data.count} templates`);
      } else {
        showToast('info', data.message || 'Templates already exist');
      }
    },
    onError: (error) => showToast('error', error.message),
  });

  const handleCopyTemplate = async (body: string, id: string) => {
    await navigator.clipboard.writeText(body);
    setCopiedId(id);
    showToast('success', 'Template copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreateTemplate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createTemplateMutation.mutate({
      name: formData.get('name') as string,
      category: formData.get('category') as string,
      subcategory: formData.get('subcategory') as string || undefined,
      body: formData.get('body') as string,
      variables: (formData.get('variables') as string)?.split(',').map(v => v.trim()).filter(Boolean) || [],
      tags: (formData.get('tags') as string)?.split(',').map(t => t.trim()).filter(Boolean) || [],
    });
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this template?')) {
      deleteTemplateMutation.mutate({ id });
    }
  };

  // Define a unified template type
  type UnifiedTemplate = {
    id: string;
    name: string;
    category: string;
    subcategory: string | null;
    body: string;
    variables: string[] | null;
    tags: string[] | null;
    isActive?: boolean;
    usageCount?: number | null;
  };

  // Group templates by category
  const groupedTemplates = templates?.reduce((acc, template) => {
    const cat = template.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(template as UnifiedTemplate);
    return acc;
  }, {} as Record<string, UnifiedTemplate[]>);

  const getCategoryLabel = (categoryId: string) => {
    return categories?.find(c => c.id === categoryId)?.name || categoryId;
  };

  if (isLoading) {
    return (
      <>
        <Header title="Response Templates" subtitle="Manage your pre-written response templates" />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#1B2838]" />
        </div>
      </>
    );
  }

  return (
    <>
      <Header 
        title="Response Templates" 
        subtitle="Manage pre-written responses for common customer scenarios"
        actions={
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/agents"
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Agents
            </Link>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#1B2838] text-white rounded-xl font-medium hover:bg-[#2D4A6F] transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Template
            </button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-5 h-5 text-[#4A90D9]" />
            <span className="text-sm text-gray-500">Total Templates</span>
          </div>
          <p className="text-2xl font-bold text-[#1B2838]">{templates?.length || 0}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Tag className="w-5 h-5 text-[#2D4A6F]" />
            <span className="text-sm text-gray-500">Categories</span>
          </div>
          <p className="text-2xl font-bold text-[#1B2838]">{Object.keys(groupedTemplates || {}).length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-5 h-5 text-[#28A745]" />
            <span className="text-sm text-gray-500">Most Used</span>
          </div>
          <p className="text-lg font-bold text-[#1B2838] truncate">
            {templates?.sort((a, b) => (('usageCount' in b ? b.usageCount : 0) || 0) - (('usageCount' in a ? a.usageCount : 0) || 0))[0]?.name || 'N/A'}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-[#FFC107]" />
            <span className="text-sm text-gray-500">Last Updated</span>
          </div>
          <p className="text-lg font-bold text-[#1B2838]">
            {templates?.length ? 'Recently' : 'Never'}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates..."
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:border-[#1B2838] transition-colors"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-3 rounded-xl border border-gray-200 focus:border-[#1B2838] transition-colors min-w-[200px]"
        >
          <option value="">All Categories</option>
          {categories?.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
        {templates?.length === 0 && (
          <button
            onClick={() => seedTemplatesMutation.mutate()}
            disabled={seedTemplatesMutation.isPending}
            className="flex items-center gap-2 px-4 py-3 bg-[#FFC107]/15 text-[#1B2838] border border-[#FFC107]/30 rounded-xl font-medium hover:bg-[#FFC107]/25 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Load Default Templates
          </button>
        )}
      </div>

      {/* Templates List */}
      {!templates || templates.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[#1B2838] mb-2">No Templates Yet</h3>
          <p className="text-gray-500 mb-6">Create templates to help your agents respond consistently.</p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#1B2838] text-white rounded-xl font-medium hover:bg-[#2D4A6F] transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create Template
            </button>
            <button
              onClick={() => seedTemplatesMutation.mutate()}
              disabled={seedTemplatesMutation.isPending}
              className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-xl font-medium hover:bg-gray-50 transition-colors"
            >
              <Sparkles className="w-5 h-5" />
              Load Defaults
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedTemplates || {}).map(([category, categoryTemplates]) => (
            <div key={category} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="p-4 bg-gray-50 border-b border-gray-200">
                <h3 className="font-bold text-[#1B2838]">{getCategoryLabel(category)}</h3>
                <p className="text-sm text-gray-500">{categoryTemplates?.length} templates</p>
              </div>
              <div className="divide-y divide-gray-100">
                {categoryTemplates?.map((template) => (
                  <motion.div
                    key={template.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-[#1B2838]">{template.name}</h4>
                          {template.subcategory && (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                              {template.subcategory}
                            </span>
                          )}
                          {'isActive' in template && !template.isActive && (
                            <span className="px-2 py-0.5 bg-[#DC3545]/10 text-[#DC3545] rounded text-xs">
                              Inactive
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                          {template.body.substring(0, 200)}...
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          {(template.tags as string[] || []).slice(0, 3).map((tag, i) => (
                            <span key={i} className="px-2 py-0.5 bg-[#4A90D9]/10 text-[#4A90D9] rounded text-xs">
                              {tag}
                            </span>
                          ))}
                          {(template.variables as string[] || []).length > 0 && (
                            <span className="text-xs text-gray-500">
                              {(template.variables as string[]).length} variables
                            </span>
                          )}
                          {'usageCount' in template && template.usageCount ? (
                            <span className="text-xs text-gray-500">
                              Used {template.usageCount} times
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setPreviewTemplate(template.id)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Preview"
                        >
                          <Eye className="w-4 h-4 text-gray-500" />
                        </button>
                        <button
                          onClick={() => handleCopyTemplate(template.body, template.id)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Copy"
                        >
                          {copiedId === template.id ? (
                            <Check className="w-4 h-4 text-[#28A745]" />
                          ) : (
                            <Copy className="w-4 h-4 text-gray-500" />
                          )}
                        </button>
                        <button
                          onClick={() => setEditingTemplate(template.id)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4 text-gray-500" />
                        </button>
                        <button
                          onClick={() => handleDelete(template.id)}
                          className="p-2 hover:bg-[#DC3545]/10 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-[#DC3545]" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Template Modal */}
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
              className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-[#1B2838]">Create New Template</h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <form onSubmit={handleCreateTemplate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Template Name</label>
                  <input
                    type="text"
                    name="name"
                    required
                    placeholder="e.g., Order Cancellation - Within 24 Hours"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#1B2838] transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select
                      name="category"
                      required
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#1B2838] transition-colors"
                    >
                      <option value="">Select category</option>
                      {categories?.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subcategory</label>
                    <input
                      type="text"
                      name="subcategory"
                      placeholder="e.g., within_24h"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#1B2838] transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Template Body</label>
                  <textarea
                    name="body"
                    required
                    rows={10}
                    placeholder="Write your template here. Use [Variable Name] for placeholders."
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#1B2838] transition-colors resize-none font-mono text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Variables (comma-separated)</label>
                    <input
                      type="text"
                      name="variables"
                      placeholder="customer_name, order_number"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#1B2838] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
                    <input
                      type="text"
                      name="tags"
                      placeholder="cancellation, refund"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#1B2838] transition-colors"
                    />
                  </div>
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
                    disabled={createTemplateMutation.isPending}
                    className="flex-1 py-3 rounded-xl bg-[#1B2838] text-white font-medium hover:bg-[#2D4A6F] transition-colors disabled:opacity-50"
                  >
                    {createTemplateMutation.isPending ? (
                      <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                    ) : (
                      'Create Template'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preview Modal */}
      <AnimatePresence>
        {previewTemplate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setPreviewTemplate(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto"
            >
              {(() => {
                const template = templates?.find(t => t.id === previewTemplate);
                if (!template) return null;
                return (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-[#1B2838]">{template.name}</h3>
                      <button
                        onClick={() => setPreviewTemplate(null)}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                      >
                        <X className="w-5 h-5 text-gray-500" />
                      </button>
                    </div>
                    <div className="mb-4 flex items-center gap-2">
                      <span className="px-2 py-1 bg-[#4A90D9]/10 text-[#4A90D9] rounded text-sm">
                        {getCategoryLabel(template.category)}
                      </span>
                      {template.subcategory && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-sm">
                          {template.subcategory}
                        </span>
                      )}
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4 mb-4">
                      <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
                        {template.body}
                      </pre>
                    </div>
                    {(template.variables as string[] || []).length > 0 && (
                      <div className="mb-4">
                        <p className="text-sm font-medium text-gray-700 mb-2">Variables:</p>
                        <div className="flex gap-2 flex-wrap">
                          {(template.variables as string[]).map((v, i) => (
                            <code key={i} className="px-2 py-1 bg-[#FFC107]/15 text-[#1B2838] rounded text-sm">
                              [{v.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}]
                            </code>
                          ))}
                        </div>
                      </div>
                    )}
                    <button
                      onClick={() => handleCopyTemplate(template.body, template.id)}
                      className="w-full py-3 bg-[#1B2838] text-white rounded-xl font-medium hover:bg-[#2D4A6F] transition-colors flex items-center justify-center gap-2"
                    >
                      {copiedId === template.id ? (
                        <>
                          <Check className="w-5 h-5" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-5 h-5" />
                          Copy Template
                        </>
                      )}
                    </button>
                  </>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
