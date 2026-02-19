'use client';

import { useState } from 'react';
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
  Filter,
} from 'lucide-react';
import { Header } from '@/components/dashboard/Header';
import { trpc } from '@/lib/trpc';

export default function CustomersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'with-tickets' | 'open-tickets'>('all');

  // Fetch all customers from Gorgias data warehouse
  const { data: customersData, isLoading, refetch, isFetching } = trpc.dashboard.getGorgiasCustomers.useQuery({
    limit: 500,
    search: searchQuery || undefined,
  }, {
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const allCustomers = customersData?.customers || [];
  
  // Apply filters
  const customers = allCustomers.filter(c => {
    if (filterType === 'with-tickets') return (c.ticketCount || 0) > 0;
    if (filterType === 'open-tickets') return (c.openTicketCount || 0) > 0;
    return true;
  });

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

  // Stats
  const totalCustomers = allCustomers.length;
  const withTickets = allCustomers.filter(c => (c.ticketCount || 0) > 0).length;
  const totalOpenTickets = allCustomers.reduce((sum, c) => sum + (c.openTicketCount || 0), 0);
  const withEmail = allCustomers.filter(c => c.email).length;

  return (
    <>
      <Header
        title="Customers"
        subtitle={`${totalCustomers} customer profiles from Gorgias`}
        onRefresh={() => refetch()}
      />

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        <button
          onClick={() => setFilterType('all')}
          className={`p-4 rounded-xl border transition-all text-left ${
            filterType === 'all' 
              ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-500' 
              : 'bg-white border-gray-200 hover:border-blue-200'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-blue-600" />
            <span className="text-xs text-gray-500">Total Customers</span>
          </div>
          <p className="text-2xl font-bold text-blue-700">{totalCustomers}</p>
        </button>
        <button
          onClick={() => setFilterType('with-tickets')}
          className={`p-4 rounded-xl border transition-all text-left ${
            filterType === 'with-tickets' 
              ? 'bg-purple-50 border-purple-200 ring-2 ring-purple-500' 
              : 'bg-white border-gray-200 hover:border-purple-200'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <Ticket className="w-4 h-4 text-purple-600" />
            <span className="text-xs text-gray-500">With Tickets</span>
          </div>
          <p className="text-2xl font-bold text-purple-700">{withTickets}</p>
        </button>
        <button
          onClick={() => setFilterType('open-tickets')}
          className={`p-4 rounded-xl border transition-all text-left ${
            filterType === 'open-tickets' 
              ? 'bg-amber-50 border-amber-200 ring-2 ring-amber-500' 
              : 'bg-white border-gray-200 hover:border-amber-200'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare className="w-4 h-4 text-amber-600" />
            <span className="text-xs text-gray-500">Open Tickets</span>
          </div>
          <p className="text-2xl font-bold text-amber-700">{totalOpenTickets}</p>
        </button>
        <div className="p-4 rounded-xl bg-white border border-gray-200">
          <div className="flex items-center gap-2 mb-1">
            <Mail className="w-4 h-4 text-green-600" />
            <span className="text-xs text-gray-500">With Email</span>
          </div>
          <p className="text-2xl font-bold text-green-700">{withEmail}</p>
        </div>
      </div>

      {/* Search & Filter Info */}
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
        {filterType !== 'all' && (
          <button
            onClick={() => setFilterType('all')}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Clear filter
          </button>
        )}
      </div>

      {/* Filter indicator */}
      {filterType !== 'all' && (
        <div className="mb-4 px-3 py-2 bg-gray-100 rounded-lg text-sm text-gray-600 inline-flex items-center gap-2">
          <Filter className="w-4 h-4" />
          Showing: {filterType === 'with-tickets' ? 'Customers with tickets' : 'Customers with open tickets'}
          <span className="font-medium">({customers.length})</span>
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
            {searchQuery || filterType !== 'all' ? 'No customers found' : 'No customers yet'}
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            {searchQuery 
              ? 'Try adjusting your search query' 
              : filterType !== 'all'
                ? 'No customers match this filter'
                : 'Customer profiles from Gorgias will appear here after syncing'}
          </p>
          <button
            onClick={() => { setSearchQuery(''); setFilterType('all'); refetch(); }}
            disabled={isFetching}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#1B2838] text-white rounded-lg text-sm font-medium hover:bg-[#2D4A6F] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            {searchQuery || filterType !== 'all' ? 'Clear & Refresh' : 'Refresh'}
          </button>
        </div>
      )}

      {/* Customers List */}
      {!isLoading && customers.length > 0 && (
        <div className="space-y-3">
          {customers.map((customer, i) => (
            <motion.div
              key={customer.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.02, 0.5) }}
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
                      {(customer.ticketCount || 0) > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 flex items-center gap-1">
                          <Ticket className="w-3 h-3" />
                          {customer.ticketCount}
                        </span>
                      )}
                      {(customer.openTicketCount || 0) > 0 && (
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

                    {/* Note preview */}
                    {customer.note && (
                      <div className="mt-2 p-2 bg-amber-50 rounded-lg text-xs text-amber-800 line-clamp-1">
                        {customer.note}
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

      {/* Results count */}
      {!isLoading && customers.length > 0 && (
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Showing {customers.length} customer{customers.length !== 1 ? 's' : ''}
            {filterType !== 'all' && ` (filtered from ${totalCustomers})`}
          </p>
        </div>
      )}
    </>
  );
}
