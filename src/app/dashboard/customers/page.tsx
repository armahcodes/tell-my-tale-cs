'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Search,
  Users,
  Mail,
  Phone,
  Calendar,
  Loader2,
  Globe,
  Ticket,
  MessageSquare,
  RefreshCw,
  Clock,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Header } from '@/components/dashboard/Header';
import { trpc } from '@/lib/trpc';

const PAGE_SIZE = 50;

export default function CustomersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const offset = (currentPage - 1) * PAGE_SIZE;

  // Fetch customers with pagination
  const { data, isLoading, refetch, isFetching } = trpc.dashboard.getGorgiasCustomers.useQuery({
    limit: PAGE_SIZE,
    offset,
    search: debouncedSearch || undefined,
  });

  const customers = data?.customers || [];
  const totalCustomers = data?.total || 0;
  const totalPages = Math.ceil(totalCustomers / PAGE_SIZE);

  const formatDate = (dateString: string | Date | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getInitials = (firstname?: string | null, lastname?: string | null, name?: string | null, email?: string | null) => {
    if (firstname || lastname) {
      return `${firstname?.[0] || ''}${lastname?.[0] || ''}`.toUpperCase() || '?';
    }
    if (name) {
      const parts = name.split(' ');
      return parts.length > 1 
        ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
        : name.substring(0, 2).toUpperCase();
    }
    if (email) {
      return email.substring(0, 2).toUpperCase();
    }
    return '?';
  };

  const getDisplayName = (customer: typeof customers[0]) => {
    if (customer.name) return customer.name;
    if (customer.firstname || customer.lastname) {
      return `${customer.firstname || ''} ${customer.lastname || ''}`.trim();
    }
    return customer.email || 'Unknown Customer';
  };

  // Stats from current page
  const withTickets = customers.filter(c => Number(c.ticketCount || 0) > 0).length;
  const totalOpenTickets = customers.reduce((sum, c) => sum + Number(c.openTicketCount || 0), 0);
  const withEmail = customers.filter(c => c.email).length;

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
        title="Customers"
        subtitle={`${totalCustomers.toLocaleString()} customer profiles from Gorgias`}
        onRefresh={() => refetch()}
      />

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-blue-600" />
            <span className="text-xs text-gray-500">Total Customers</span>
          </div>
          <p className="text-2xl font-bold text-blue-700">{totalCustomers.toLocaleString()}</p>
        </div>
        <div className="p-4 rounded-xl bg-purple-50 border border-purple-100">
          <div className="flex items-center gap-2 mb-1">
            <Ticket className="w-4 h-4 text-purple-600" />
            <span className="text-xs text-gray-500">With Tickets (page)</span>
          </div>
          <p className="text-2xl font-bold text-purple-700">{withTickets}</p>
        </div>
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-100">
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare className="w-4 h-4 text-amber-600" />
            <span className="text-xs text-gray-500">Open Tickets (page)</span>
          </div>
          <p className="text-2xl font-bold text-amber-700">{totalOpenTickets}</p>
        </div>
        <div className="p-4 rounded-xl bg-green-50 border border-green-100">
          <div className="flex items-center gap-2 mb-1">
            <Mail className="w-4 h-4 text-green-600" />
            <span className="text-xs text-gray-500">With Email (page)</span>
          </div>
          <p className="text-2xl font-bold text-green-700">{withEmail}</p>
        </div>
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search customers by name, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:border-[#1B2838] focus:ring-1 focus:ring-[#1B2838] transition-all"
          />
        </div>
        {isFetching && !isLoading && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading...
          </div>
        )}
      </div>

      {/* Pagination Info */}
      {!isLoading && totalCustomers > 0 && (
        <div className="flex items-center justify-between mb-4 text-sm text-gray-600">
          <span>
            Showing {offset + 1}-{Math.min(offset + customers.length, totalCustomers)} of {totalCustomers.toLocaleString()}
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
            <p className="text-gray-500">Loading customers...</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && customers.length === 0 && (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-200">
          <Users className="w-14 h-14 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[#1B2838] mb-2">
            {searchQuery ? 'No customers found' : 'No customers yet'}
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            {searchQuery 
              ? 'Try adjusting your search query' 
              : 'Customer profiles from Gorgias will appear here after syncing'}
          </p>
          <button
            onClick={() => { setSearchQuery(''); refetch(); }}
            disabled={isFetching}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#1B2838] text-white rounded-lg text-sm font-medium hover:bg-[#2D4A6F] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            {searchQuery ? 'Clear & Refresh' : 'Refresh'}
          </button>
        </div>
      )}

      {/* Customers List */}
      {!isLoading && customers.length > 0 && (
        <div className="space-y-3">
          {customers.map((customer, i) => (
            <motion.div
              key={customer.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.02, 0.3) }}
            >
              <Link
                href={`/dashboard/customers/${customer.id}`}
                className="block bg-white rounded-2xl p-5 border border-gray-200 hover:shadow-lg hover:border-gray-300 transition-all group"
              >
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-semibold">
                      {getInitials(customer.firstname, customer.lastname, customer.name, customer.email)}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <h3 className="font-semibold text-[#1B2838] truncate group-hover:text-purple-600 transition-colors">
                        {getDisplayName(customer)}
                      </h3>
                      {Number(customer.ticketCount || 0) > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 flex items-center gap-1">
                          <Ticket className="w-3 h-3" />
                          {customer.ticketCount}
                        </span>
                      )}
                      {Number(customer.openTicketCount || 0) > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {customer.openTicketCount} open
                        </span>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-2">
                      {customer.email && (
                        <span className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5" />
                          {customer.email}
                        </span>
                      )}
                      {customer.language && (
                        <span className="flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5" />
                          {customer.language.toUpperCase()}
                        </span>
                      )}
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(customer.gorgiasCreatedAt)}
                      </span>
                    </div>

                    {/* Contact Channels */}
                    {customer.channels && customer.channels.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {customer.channels.slice(0, 3).map((channel, idx) => (
                          <span key={idx} className="px-2 py-1 bg-gray-100 rounded-lg text-xs text-gray-600 flex items-center gap-1">
                            {channel.type === 'email' && <Mail className="w-3 h-3" />}
                            {channel.type === 'phone' && <Phone className="w-3 h-3" />}
                            <span className="truncate max-w-[150px]">{channel.address}</span>
                          </span>
                        ))}
                        {customer.channels.length > 3 && (
                          <span className="px-2 py-1 bg-gray-100 rounded-lg text-xs text-gray-600">
                            +{customer.channels.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Arrow */}
                  <div className="p-2 hover:bg-gray-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                    <ArrowRight className="w-5 h-5 text-[#1B2838]" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
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
