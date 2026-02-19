'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Clock,
  User,
  Loader2,
  ArrowRight,
  Mail,
  Phone,
  MessageCircle,
  Headphones,
  CheckCircle,
  Ticket,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { Header } from '@/components/dashboard/Header';

const PAGE_SIZE = 50;

const statusColors: Record<string, { bg: string; text: string }> = {
  open: { bg: 'bg-amber-50', text: 'text-amber-700' },
  closed: { bg: 'bg-green-50', text: 'text-green-700' },
};

const channelIcons: Record<string, React.ReactNode> = {
  email: <Mail className="w-4 h-4" />,
  phone: <Phone className="w-4 h-4" />,
  chat: <MessageCircle className="w-4 h-4" />,
  helpdesk: <Headphones className="w-4 h-4" />,
};

const channelColors: Record<string, string> = {
  email: 'bg-blue-50 text-blue-600',
  phone: 'bg-green-50 text-green-600',
  chat: 'bg-purple-50 text-purple-600',
  helpdesk: 'bg-amber-50 text-amber-600',
};

export default function TicketsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'closed'>('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);

  const offset = (currentPage - 1) * PAGE_SIZE;

  // Fetch Gorgias tickets from data warehouse
  const { data, isLoading, refetch, isFetching } = trpc.dashboard.getGorgiasTickets.useQuery({
    status: statusFilter,
    limit: PAGE_SIZE,
    offset,
  });

  const allTickets = data?.tickets || [];
  const totalTickets = data?.total || 0;
  const totalPages = Math.ceil(totalTickets / PAGE_SIZE);

  // Filter tickets by search (client-side)
  const tickets = debouncedSearch
    ? allTickets.filter(t => 
        t.subject?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        t.customerEmail?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        t.customerName?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        t.id?.toString().includes(debouncedSearch)
      )
    : allTickets;

  const formatDate = (dateString: string | Date | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatTimeAgo = (dateString: string | Date | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateString);
  };

  // Stats for current page
  const openCount = tickets.filter(t => t.status === 'open').length;
  const closedCount = tickets.filter(t => t.status === 'closed').length;
  const emailCount = tickets.filter(t => t.channel === 'email').length;

  // Pagination helpers
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const showPages = 5;
    
    if (totalPages <= showPages + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      
      if (currentPage > 3) pages.push('...');
      
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) pages.push(i);
      
      if (currentPage < totalPages - 2) pages.push('...');
      
      pages.push(totalPages);
    }
    
    return pages;
  };

  return (
    <>
      <Header
        title="Support Tickets"
        subtitle={`${totalTickets.toLocaleString()} tickets from Gorgias`}
        onRefresh={() => refetch()}
      />

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
          <div className="flex items-center gap-2 mb-1">
            <Ticket className="w-4 h-4 text-blue-600" />
            <span className="text-xs text-gray-500">Total Tickets</span>
          </div>
          <p className="text-2xl font-bold text-blue-700">{totalTickets.toLocaleString()}</p>
        </div>
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-100">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-amber-600" />
            <span className="text-xs text-gray-500">Open (page)</span>
          </div>
          <p className="text-2xl font-bold text-amber-700">{openCount}</p>
        </div>
        <div className="p-4 rounded-xl bg-green-50 border border-green-100">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-xs text-gray-500">Closed (page)</span>
          </div>
          <p className="text-2xl font-bold text-green-700">{closedCount}</p>
        </div>
        <div className="p-4 rounded-xl bg-purple-50 border border-purple-100">
          <div className="flex items-center gap-2 mb-1">
            <Mail className="w-4 h-4 text-purple-600" />
            <span className="text-xs text-gray-500">Email (page)</span>
          </div>
          <p className="text-2xl font-bold text-purple-700">{emailCount}</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search tickets by subject, email, customer name, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:border-[#1B2838] focus:ring-1 focus:ring-[#1B2838] transition-all"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'open', 'closed'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium capitalize whitespace-nowrap transition-all ${
                statusFilter === status
                  ? 'bg-[#1B2838] text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
        {isFetching && !isLoading && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading...
          </div>
        )}
      </div>

      {/* Pagination Info */}
      {!isLoading && totalTickets > 0 && (
        <div className="flex items-center justify-between mb-4 text-sm text-gray-600">
          <span>
            Showing {offset + 1}-{Math.min(offset + tickets.length, totalTickets)} of {totalTickets.toLocaleString()}
          </span>
          <span>
            Page {currentPage} of {totalPages.toLocaleString()}
          </span>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <Loader2 className="w-10 h-10 animate-spin text-[#1B2838] mx-auto mb-4" />
            <p className="text-gray-500">Loading support tickets...</p>
          </div>
        </div>
      )}

      {/* Tickets List */}
      {!isLoading && tickets.length > 0 && (
        <div className="space-y-3 mb-8">
          {tickets.map((ticket, i) => (
            <motion.div
              key={ticket.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.02, 0.3) }}
            >
              <Link
                href={`/dashboard/orders/${ticket.id}`}
                className="block bg-white rounded-2xl p-5 border border-gray-200 hover:shadow-lg hover:border-gray-300 transition-all group"
              >
                <div className="flex items-start gap-4">
                  {/* Channel Icon */}
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${channelColors[ticket.channel || 'email'] || 'bg-gray-100 text-gray-500'}`}>
                    {channelIcons[ticket.channel || 'email'] || <Headphones className="w-5 h-5" />}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs text-gray-400 font-mono">#{ticket.id}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColors[ticket.status || 'open']?.bg || 'bg-gray-50'} ${statusColors[ticket.status || 'open']?.text || 'text-gray-700'}`}>
                        {ticket.status || 'open'}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 capitalize">
                        {ticket.channel || 'unknown'}
                      </span>
                      <span className="text-xs text-gray-400 ml-auto">
                        {formatTimeAgo(ticket.gorgiasCreatedAt)}
                      </span>
                    </div>

                    <h3 className="font-semibold text-[#1B2838] mb-2 line-clamp-1 group-hover:text-purple-600 transition-colors">
                      {ticket.subject || 'No subject'}
                    </h3>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" />
                        {ticket.customerName || ticket.customerEmail || 'Unknown customer'}
                      </span>
                      {ticket.customerEmail && ticket.customerName && (
                        <span className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5" />
                          {ticket.customerEmail}
                        </span>
                      )}
                      {ticket.messagesCount && (
                        <span className="flex items-center gap-1.5">
                          <MessageCircle className="w-3.5 h-3.5" />
                          {ticket.messagesCount} messages
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Arrow Icon */}
                  <div className="p-2 hover:bg-gray-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                    <ArrowRight className="w-5 h-5 text-[#1B2838]" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && tickets.length === 0 && (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-200">
          <Headphones className="w-14 h-14 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[#1B2838] mb-2">
            {searchQuery || statusFilter !== 'all' ? 'No tickets found' : 'No support tickets'}
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            {searchQuery || statusFilter !== 'all' 
              ? 'Try adjusting your search or filters' 
              : 'Support tickets from Gorgias will appear here after syncing'}
          </p>
          <button
            onClick={() => { setSearchQuery(''); setStatusFilter('all'); refetch(); }}
            disabled={isFetching}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#1B2838] text-white rounded-lg text-sm font-medium hover:bg-[#2D4A6F] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            {searchQuery || statusFilter !== 'all' ? 'Clear & Refresh' : 'Refresh'}
          </button>
        </div>
      )}

      {/* Pagination Controls */}
      {!isLoading && totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-1">
            {getPageNumbers().map((page, i) => (
              typeof page === 'number' ? (
                <button
                  key={i}
                  onClick={() => goToPage(page)}
                  className={`w-10 h-10 rounded-lg font-medium transition-colors ${
                    currentPage === page
                      ? 'bg-[#1B2838] text-white'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  {page}
                </button>
              ) : (
                <span key={i} className="px-2 text-gray-400">...</span>
              )
            ))}
          </div>

          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Jump to page */}
          <div className="ml-4 flex items-center gap-2">
            <span className="text-sm text-gray-500">Go to:</span>
            <input
              type="number"
              min={1}
              max={totalPages}
              value={currentPage}
              onChange={(e) => {
                const page = parseInt(e.target.value);
                if (!isNaN(page)) goToPage(page);
              }}
              className="w-16 px-2 py-1.5 rounded-lg border border-gray-200 text-sm text-center focus:border-[#1B2838] focus:outline-none"
            />
          </div>
        </div>
      )}
    </>
  );
}
