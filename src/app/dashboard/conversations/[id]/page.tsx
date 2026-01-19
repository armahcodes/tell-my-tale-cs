'use client';

import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  MessageSquare,
  User,
  Clock,
  AlertCircle,
  CheckCircle,
  Mail,
  Package,
  Loader2,
  Send,
  Sparkles,
  Tag,
  FileText,
} from 'lucide-react';
import { Header } from '@/components/dashboard/Header';
import { trpc } from '@/lib/trpc';
import { formatDistanceToNow, format } from 'date-fns';
import Link from 'next/link';
import { useState } from 'react';
import { useToast } from '@/components/ui/Toast';

type ConversationStatus = 'active' | 'escalated' | 'resolved' | 'closed';
type Sentiment = 'positive' | 'neutral' | 'negative';

const statusColors: Record<ConversationStatus, { bg: string; text: string; border: string }> = {
  active: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  escalated: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  resolved: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  closed: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
};

const sentimentLabels: Record<Sentiment, { label: string; color: string; icon: typeof CheckCircle }> = {
  positive: { label: 'Positive', color: 'text-green-600', icon: CheckCircle },
  neutral: { label: 'Neutral', color: 'text-gray-600', icon: MessageSquare },
  negative: { label: 'Negative', color: 'text-red-600', icon: AlertCircle },
};

export default function ConversationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const conversationId = params.id as string;
  const [note, setNote] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const { showToast } = useToast();

  // Fetch conversation details
  const { data, isLoading, refetch } = trpc.dashboard.getConversation.useQuery(
    { id: conversationId },
    { enabled: !!conversationId }
  );

  // Mutation for updating status
  const updateStatusMutation = trpc.dashboard.updateConversationStatus.useMutation({
    onSuccess: (data) => {
      refetch();
      setIsUpdating(false);
      if (data.success) {
        showToast('success', 'Conversation status updated');
      }
    },
    onError: () => {
      setIsUpdating(false);
      showToast('error', 'Failed to update status');
    },
  });

  // Fetch notes for this conversation
  const { data: notesData, refetch: refetchNotes } = trpc.notes.getByEntity.useQuery({
    entityType: 'conversation',
    entityId: conversationId,
  });

  // Mutation for adding notes
  const addNoteMutation = trpc.notes.create.useMutation({
    onSuccess: () => {
      refetchNotes();
      setNote('');
      showToast('success', 'Note added successfully');
    },
    onError: () => {
      showToast('error', 'Failed to add note');
    },
  });

  const conversation = data?.conversation;
  const messages = data?.messages || [];
  const notes = notesData?.notes || [];

  const handleStatusChange = async (newStatus: ConversationStatus) => {
    setIsUpdating(true);
    await updateStatusMutation.mutateAsync({
      id: conversationId,
      status: newStatus,
    });
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) return;
    
    await addNoteMutation.mutateAsync({
      entityType: 'conversation',
      entityId: conversationId,
      content: note,
      author: 'Dashboard User',
      authorType: 'human',
    });
  };

  if (isLoading) {
    return (
      <>
        <Header title="Loading..." subtitle="Fetching conversation details" />
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-[#1B2838]" />
        </div>
      </>
    );
  }

  if (!conversation) {
    return (
      <>
        <Header title="Conversation Not Found" subtitle="The requested conversation could not be found" />
        <div className="bg-white rounded-xl md:rounded-2xl p-8 md:p-12 text-center border border-gray-200">
          <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[#1B2838] mb-2">Conversation not found</h3>
          <p className="text-sm text-gray-500 mb-6">
            This conversation may have been deleted or doesn&apos;t exist.
          </p>
          <Link
            href="/dashboard/conversations"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#1B2838] text-white rounded-lg text-sm font-medium hover:bg-[#2D4A6F] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Conversations
          </Link>
        </div>
      </>
    );
  }

  const status = conversation.status as ConversationStatus;
  const sentiment = (conversation.sentiment as Sentiment) || 'neutral';
  const statusStyle = statusColors[status] || statusColors.active;
  const sentimentInfo = sentimentLabels[sentiment];
  const SentimentIcon = sentimentInfo.icon;

  return (
    <>
      <Header 
        title={conversation.customerName || conversation.customerEmail}
        subtitle={`Conversation started ${formatDistanceToNow(new Date(conversation.createdAt), { addSuffix: true })}`}
        actions={
          <Link
            href="/dashboard/conversations"
            className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
        }
      />

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Messages Area */}
        <div className="flex-1 bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="p-4 md:p-6 border-b border-gray-200">
            <div className="flex flex-wrap items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border} border`}>
                {status}
              </span>
              <span className={`flex items-center gap-1.5 text-sm ${sentimentInfo.color}`}>
                <SentimentIcon className="w-4 h-4" />
                {sentimentInfo.label} sentiment
              </span>
              <span className="text-sm text-gray-500">
                {messages.length} messages
              </span>
            </div>
          </div>

          {/* Messages */}
          <div className="p-4 md:p-6 max-h-[500px] overflow-y-auto space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MessageSquare className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">No messages in this conversation yet.</p>
              </div>
            ) : (
              messages.map((message, i) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-[#1B2838] flex items-center justify-center mr-3 flex-shrink-0">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div className={`max-w-[80%] ${message.role === 'user' ? 'text-right' : ''}`}>
                    <div
                      className={`px-4 py-3 rounded-2xl inline-block ${
                        message.role === 'user'
                          ? 'bg-[#1B2838] text-white rounded-br-md'
                          : 'bg-gray-100 text-[#1B2838] rounded-bl-md'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {format(new Date(message.createdAt), 'MMM d, h:mm a')}
                    </p>
                  </div>
                  {message.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center ml-3 flex-shrink-0">
                      <User className="w-4 h-4 text-[#1B2838]" />
                    </div>
                  )}
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:w-80 space-y-6">
          {/* Customer Info */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="font-bold text-[#1B2838] mb-4">Customer Details</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gray-100">
                  <User className="w-4 h-4 text-[#1B2838]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#1B2838]">
                    {conversation.customerName || 'Unknown'}
                  </p>
                  <p className="text-xs text-gray-500">Customer name</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gray-100">
                  <Mail className="w-4 h-4 text-[#1B2838]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#1B2838]">{conversation.customerEmail}</p>
                  <p className="text-xs text-gray-500">Email address</p>
                </div>
              </div>
              {conversation.orderNumber && (
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gray-100">
                    <Package className="w-4 h-4 text-[#1B2838]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#1B2838]">#{conversation.orderNumber}</p>
                    <p className="text-xs text-gray-500">Order number</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gray-100">
                  <Clock className="w-4 h-4 text-[#1B2838]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#1B2838]">
                    {format(new Date(conversation.createdAt), 'MMM d, yyyy h:mm a')}
                  </p>
                  <p className="text-xs text-gray-500">Started at</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gray-100">
                  <Tag className="w-4 h-4 text-[#1B2838]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#1B2838]">{conversation.channel}</p>
                  <p className="text-xs text-gray-500">Channel</p>
                </div>
              </div>
            </div>
          </div>

          {/* Status Actions */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="font-bold text-[#1B2838] mb-4">Actions</h3>
            <div className="space-y-2">
              {status !== 'resolved' && (
                <button
                  onClick={() => handleStatusChange('resolved')}
                  disabled={isUpdating}
                  className="w-full flex items-center justify-center gap-2 p-3 bg-green-50 text-green-700 rounded-xl font-medium hover:bg-green-100 transition-colors disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4" />
                  Mark Resolved
                </button>
              )}
              {status !== 'escalated' && status !== 'resolved' && (
                <button
                  onClick={() => handleStatusChange('escalated')}
                  disabled={isUpdating}
                  className="w-full flex items-center justify-center gap-2 p-3 bg-red-50 text-red-700 rounded-xl font-medium hover:bg-red-100 transition-colors disabled:opacity-50"
                >
                  <AlertCircle className="w-4 h-4" />
                  Escalate
                </button>
              )}
              {status === 'resolved' && (
                <button
                  onClick={() => handleStatusChange('active')}
                  disabled={isUpdating}
                  className="w-full flex items-center justify-center gap-2 p-3 bg-blue-50 text-blue-700 rounded-xl font-medium hover:bg-blue-100 transition-colors disabled:opacity-50"
                >
                  <MessageSquare className="w-4 h-4" />
                  Reopen
                </button>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="font-bold text-[#1B2838] mb-4">Internal Notes</h3>
            
            {/* Add Note Form */}
            <form onSubmit={handleAddNote} className="mb-4">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a note..."
                rows={2}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm resize-none focus:border-[#1B2838] transition-colors"
              />
              <button
                type="submit"
                disabled={!note.trim() || addNoteMutation.isPending}
                className="mt-2 w-full py-2 bg-[#1B2838] text-white rounded-lg text-sm font-medium hover:bg-[#2D4A6F] transition-colors disabled:opacity-50"
              >
                {addNoteMutation.isPending ? 'Adding...' : 'Add Note'}
              </button>
            </form>

            {/* Notes List */}
            <div className="space-y-3 max-h-48 overflow-y-auto">
              {notes.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-2">No notes yet</p>
              ) : (
                notes.map((n) => (
                  <div key={n.id} className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-sm text-[#1B2838]">{n.content}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                      <FileText className="w-3 h-3" />
                      <span>{n.author}</span>
                      <span>•</span>
                      <span>{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
