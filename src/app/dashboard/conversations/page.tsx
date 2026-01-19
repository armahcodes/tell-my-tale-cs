'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  MessageSquare,
  User,
  Clock,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { Header } from '@/components/dashboard/Header';
import { trpc } from '@/lib/trpc';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

type ConversationStatus = 'active' | 'escalated' | 'resolved' | 'closed';
type Sentiment = 'positive' | 'neutral' | 'negative';

const statusColors: Record<ConversationStatus, { bg: string; text: string; dot: string }> = {
  active: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  escalated: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  resolved: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  closed: { bg: 'bg-gray-50', text: 'text-gray-700', dot: 'bg-gray-500' },
};

const sentimentIcons: Record<Sentiment, { icon: typeof CheckCircle; color: string }> = {
  positive: { icon: CheckCircle, color: 'text-green-500' },
  neutral: { icon: MessageSquare, color: 'text-gray-400' },
  negative: { icon: AlertCircle, color: 'text-red-500' },
};

export default function ConversationsPage() {
  const [filter, setFilter] = useState<'all' | ConversationStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch conversations from database
  const statusQuery = filter === 'all' ? 'all' : filter === 'closed' ? 'all' : filter;
  const { data, isLoading, refetch } = trpc.dashboard.getConversations.useQuery({
    status: statusQuery as 'all' | 'active' | 'escalated' | 'resolved',
    limit: 50,
  });

  // Fetch status counts
  const { data: countsData } = trpc.dashboard.getStatusCounts.useQuery();

  const conversations = data?.conversations || [];
  const counts = countsData?.counts || { active: 0, escalated: 0, resolved: 0, closed: 0 };

  // Filter locally by search query
  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      (conv.customerName?.toLowerCase().includes(query) || false) ||
      conv.customerEmail.toLowerCase().includes(query) ||
      (conv.orderNumber?.toLowerCase().includes(query) || false)
    );
  });

  const handleRefresh = () => {
    refetch();
  };

  return (
    <>
      <Header 
        title="Conversations" 
        subtitle="Manage customer conversations and escalations"
        onRefresh={handleRefresh}
      />

      {/* Filters - Responsive */}
      <div className="flex flex-col sm:flex-row gap-3 md:gap-4 mb-6">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, or order..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 md:pl-11 pr-4 py-2.5 md:py-3 rounded-lg md:rounded-xl border border-gray-200 bg-white text-sm focus:border-[#1B2838] transition-colors"
          />
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
          {(['all', 'active', 'escalated', 'resolved'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-3 md:px-4 py-2 md:py-2.5 rounded-lg md:rounded-xl text-xs md:text-sm font-medium capitalize whitespace-nowrap transition-all ${
                filter === status
                  ? 'bg-[#1B2838] text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-[#1B2838]/30'
              }`}
            >
              {status === 'all' ? 'All' : status}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Summary - Responsive */}
      <div className="grid grid-cols-3 gap-2 md:gap-4 mb-6">
        {[
          { label: 'Active', count: counts.active || 0, color: 'blue' },
          { label: 'Escalated', count: counts.escalated || 0, color: 'red' },
          { label: 'Resolved', count: counts.resolved || 0, color: 'green' },
        ].map((stat) => (
          <div key={stat.label} className={`p-3 md:p-4 rounded-lg md:rounded-xl bg-${stat.color}-50 border border-${stat.color}-100`}>
            <p className={`text-lg md:text-2xl font-bold text-${stat.color}-600`}>{stat.count}</p>
            <p className="text-[10px] md:text-xs text-gray-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Conversations List - Responsive */}
      <div className="space-y-3 md:space-y-4">
        {isLoading ? (
          <div className="bg-white rounded-xl md:rounded-2xl p-8 md:p-12 text-center border border-gray-200">
            <Loader2 className="w-8 h-8 animate-spin text-[#1B2838] mx-auto mb-4" />
            <p className="text-sm text-gray-500">Loading conversations...</p>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="bg-white rounded-xl md:rounded-2xl p-8 md:p-12 text-center border border-gray-200">
            <MessageSquare className="w-10 h-10 md:w-12 md:h-12 text-gray-300 mx-auto mb-3 md:mb-4" />
            <h3 className="text-base md:text-lg font-semibold text-[#1B2838] mb-1 md:mb-2">No conversations found</h3>
            <p className="text-xs md:text-sm text-gray-500 mb-4">
              {searchQuery ? 'Try adjusting your search query' : 'Conversations will appear here when customers start chatting'}
            </p>
            <Link
              href="/dashboard/chat"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#1B2838] text-white rounded-lg text-sm font-medium hover:bg-[#1B2838]/90 transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              Test Chat
            </Link>
          </div>
        ) : (
          filteredConversations.map((conversation, i) => {
            const sentiment = (conversation.sentiment as Sentiment) || 'neutral';
            const status = conversation.status as ConversationStatus;
            const SentimentIcon = sentimentIcons[sentiment].icon;
            const statusStyle = statusColors[status] || statusColors.active;

            return (
              <motion.div
                key={conversation.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white rounded-xl md:rounded-2xl p-4 md:p-5 border border-gray-200 hover:shadow-md transition-all cursor-pointer group"
              >
                <Link href={`/dashboard/conversations/${conversation.id}`}>
                  <div className="flex items-start gap-3 md:gap-4">
                    {/* Avatar */}
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-[#1B2838] flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 md:w-6 md:h-6 text-white" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-sm md:text-base text-[#1B2838] truncate">
                          {conversation.customerName || conversation.customerEmail}
                        </h3>
                        <span className={`hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] md:text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                          {status}
                        </span>
                      </div>
                      <p className="text-xs md:text-sm text-gray-500 mb-2 truncate">
                        {conversation.customerEmail}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 md:gap-3 text-[10px] md:text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(new Date(conversation.createdAt), { addSuffix: true })}
                        </span>
                        <span className="hidden sm:flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          {conversation.messageCount} messages
                        </span>
                        {conversation.orderNumber && (
                          <span className="bg-gray-100 px-2 py-0.5 rounded-full">
                            #{conversation.orderNumber}
                          </span>
                        )}
                        {/* Mobile status badge */}
                        <span className={`sm:hidden inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                          {status}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <SentimentIcon className={`w-4 h-4 md:w-5 md:h-5 ${sentimentIcons[sentiment].color}`} />
                      <div className="p-1.5 md:p-2 hover:bg-gray-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                        <ArrowRight className="w-4 h-4 md:w-5 md:h-5 text-[#1B2838]" />
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })
        )}
      </div>
    </>
  );
}
