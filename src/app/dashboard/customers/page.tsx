'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Search,
  Users,
  Mail,
  Phone,
  ShoppingBag,
  Calendar,
  ArrowRight,
  Loader2,
  AlertCircle,
  DollarSign,
  Database,
  ShoppingCart,
  MessageSquare,
  Globe,
  ExternalLink,
  Ticket,
} from 'lucide-react';
import { Header } from '@/components/dashboard/Header';
import { trpc } from '@/lib/trpc';

export default function CustomersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'shopify' | 'gorgias'>('shopify');

  // Fetch customers from Shopify Admin API
  const { data: customersData, isLoading, error, refetch } = trpc.shopify.getAllCustomers.useQuery({
    first: 50,
    query: searchQuery || undefined,
  });

  // Fetch customers from Gorgias data warehouse
  const { data: gorgiasData, isLoading: isGorgiasLoading, refetch: refetchGorgias } = trpc.dashboard.getGorgiasCustomers.useQuery({
    limit: 50,
    search: searchQuery || undefined,
  }, {
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const customers = customersData?.customers || [];
  const gorgiasCustomers = gorgiasData?.customers || [];

  const formatDate = (dateString: string | Date | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getInitials = (firstName?: string | null, lastName?: string | null, name?: string | null) => {
    if (firstName || lastName) {
      return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || '?';
    }
    if (name) {
      const parts = name.split(' ');
      return parts.length > 1 
        ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
        : name.substring(0, 2).toUpperCase();
    }
    return '?';
  };

  const handleRefresh = () => {
    refetch();
    refetchGorgias();
  };

  return (
    <>
      <Header
        title="Customers"
        subtitle="View customers from Shopify and Gorgias support history"
        onRefresh={handleRefresh}
      />

      {/* Tab Switcher */}
      <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('shopify')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
            activeTab === 'shopify'
              ? 'bg-white text-[#1B2838] shadow-sm'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          Shopify
          <span className={`px-1.5 py-0.5 rounded-full text-xs ${activeTab === 'shopify' ? 'bg-[#1B2838] text-white' : 'bg-gray-200 text-gray-600'}`}>
            {customers.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('gorgias')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
            activeTab === 'gorgias'
              ? 'bg-white text-[#1B2838] shadow-sm'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <Database className="w-4 h-4" />
          Gorgias
          <span className={`px-1.5 py-0.5 rounded-full text-xs ${activeTab === 'gorgias' ? 'bg-[#1B2838] text-white' : 'bg-gray-200 text-gray-600'}`}>
            {gorgiasCustomers.length}
          </span>
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-gray-400" />
        <input
          type="text"
          placeholder={activeTab === 'shopify' ? "Search Shopify customers..." : "Search Gorgias customers by name, email..."}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 md:pl-11 pr-4 py-2.5 md:py-3 rounded-lg md:rounded-xl border border-gray-200 bg-white text-sm focus:border-[#1B2838] transition-colors"
        />
      </div>

      {/* Stats Summary */}
      {activeTab === 'shopify' ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
          {[
            { label: 'Total Customers', value: customers.length, icon: Users, color: 'blue' },
            { label: 'Active', value: customers.filter(c => c.state === 'ENABLED').length, icon: ShoppingBag, color: 'green' },
            { label: 'With Orders', value: customers.filter(c => (c.numberOfOrders || 0) > 0).length, icon: DollarSign, color: 'purple' },
            { label: 'New This Month', value: customers.filter(c => {
              const created = new Date(c.createdAt);
              const now = new Date();
              return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
            }).length, icon: Calendar, color: 'amber' },
          ].map((stat) => (
            <div key={stat.label} className={`p-3 md:p-4 rounded-lg md:rounded-xl bg-${stat.color}-50 border border-${stat.color}-100`}>
              <div className="flex items-center gap-2 mb-1">
                <stat.icon className={`w-4 h-4 text-${stat.color}-600`} />
                <span className="text-xs text-gray-500">{stat.label}</span>
              </div>
              <p className={`text-lg md:text-2xl font-bold text-${stat.color}-700`}>{stat.value}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
          {[
            { label: 'Total Customers', value: gorgiasCustomers.length, icon: Users, color: 'blue' },
            { label: 'With Tickets', value: gorgiasCustomers.filter(c => (c.ticketCount || 0) > 0).length, icon: Ticket, color: 'purple' },
            { label: 'Open Tickets', value: gorgiasCustomers.reduce((sum, c) => sum + (c.openTicketCount || 0), 0), icon: MessageSquare, color: 'amber' },
            { label: 'With Email', value: gorgiasCustomers.filter(c => c.email).length, icon: Mail, color: 'green' },
          ].map((stat) => (
            <div key={stat.label} className={`p-3 md:p-4 rounded-lg md:rounded-xl bg-${stat.color}-50 border border-${stat.color}-100`}>
              <div className="flex items-center gap-2 mb-1">
                <stat.icon className={`w-4 h-4 text-${stat.color}-600`} />
                <span className="text-xs text-gray-500">{stat.label}</span>
              </div>
              <p className={`text-lg md:text-2xl font-bold text-${stat.color}-700`}>{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Shopify Customers Tab */}
      {activeTab === 'shopify' && (
        <>
          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#1B2838] mx-auto mb-4" />
                <p className="text-gray-500">Loading customers...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
              <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
              <h3 className="font-semibold text-red-800 mb-2">Failed to Load Customers</h3>
              <p className="text-sm text-red-600 mb-4">
                {customersData?.error || 'Make sure SHOPIFY_ADMIN_ACCESS_TOKEN is configured in your environment.'}
              </p>
              <button
                onClick={() => refetch()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && customers.length === 0 && (
            <div className="bg-white rounded-xl md:rounded-2xl p-8 md:p-12 text-center border border-gray-200">
              <Users className="w-10 h-10 md:w-12 md:h-12 text-gray-300 mx-auto mb-3 md:mb-4" />
              <h3 className="text-base md:text-lg font-semibold text-[#1B2838] mb-1 md:mb-2">
                {searchQuery ? 'No customers found' : 'No customers yet'}
              </h3>
              <p className="text-xs md:text-sm text-gray-500">
                {searchQuery ? 'Try adjusting your search query' : 'Customers from Shopify will appear here'}
              </p>
            </div>
          )}

          {/* Customers List */}
          {!isLoading && !error && customers.length > 0 && (
            <div className="space-y-3 md:space-y-4">
              {customers.map((customer, i) => (
                <motion.div
                  key={customer.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Link
                    href={`/dashboard/customers/${customer.legacyResourceId}`}
                    className="block bg-white rounded-xl md:rounded-2xl p-4 md:p-5 border border-gray-200 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-start gap-3 md:gap-4">
                      {/* Avatar */}
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-[#1B2838] flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-semibold text-sm md:text-base">
                          {getInitials(customer.firstName, customer.lastName)}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-sm md:text-base text-[#1B2838] truncate">
                            {customer.firstName || customer.lastName 
                              ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim()
                              : 'No Name'}
                          </h3>
                          {customer.verifiedEmail && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-50 text-green-700">
                              Verified
                            </span>
                          )}
                          {customer.state === 'DISABLED' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-50 text-red-700">
                              Disabled
                            </span>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-3 md:gap-4 text-xs md:text-sm text-gray-500">
                          {customer.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {customer.email}
                            </span>
                          )}
                          {customer.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {customer.phone}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 md:gap-4 mt-2 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <ShoppingBag className="w-3 h-3" />
                            {customer.numberOfOrders || 0} orders
                          </span>
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            ${customer.amountSpent?.amount || '0.00'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Joined {formatDate(customer.createdAt)}
                          </span>
                        </div>

                        {/* Last Order */}
                        {customer.lastOrder && (
                          <div className="mt-3 p-2 bg-gray-50 rounded-lg text-xs">
                            <span className="text-gray-500">Last order: </span>
                            <span className="font-medium text-[#1B2838]">{customer.lastOrder.name}</span>
                            <span className="text-gray-500"> • {formatDate(customer.lastOrder.createdAt)}</span>
                          </div>
                        )}

                        {/* Tags */}
                        {customer.tags && customer.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {customer.tags.slice(0, 3).map((tag) => (
                              <span key={tag} className="px-2 py-0.5 bg-gray-100 rounded-full text-[10px] text-gray-600">
                                {tag}
                              </span>
                            ))}
                            {customer.tags.length > 3 && (
                              <span className="px-2 py-0.5 bg-gray-100 rounded-full text-[10px] text-gray-600">
                                +{customer.tags.length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Arrow */}
                      <button className="p-1.5 md:p-2 hover:bg-gray-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                        <ArrowRight className="w-4 h-4 md:w-5 md:h-5 text-[#1B2838]" />
                      </button>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Gorgias Customers Tab */}
      {activeTab === 'gorgias' && (
        <>
          {/* Loading State */}
          {isGorgiasLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#1B2838] mx-auto mb-4" />
                <p className="text-gray-500">Loading Gorgias customers...</p>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!isGorgiasLoading && gorgiasCustomers.length === 0 && (
            <div className="bg-white rounded-xl md:rounded-2xl p-8 md:p-12 text-center border border-gray-200">
              <Database className="w-10 h-10 md:w-12 md:h-12 text-gray-300 mx-auto mb-3 md:mb-4" />
              <h3 className="text-base md:text-lg font-semibold text-[#1B2838] mb-1 md:mb-2">
                {searchQuery ? 'No customers found' : 'No Gorgias customers yet'}
              </h3>
              <p className="text-xs md:text-sm text-gray-500">
                {searchQuery ? 'Try adjusting your search query' : 'Customers from Gorgias will appear here after sync'}
              </p>
            </div>
          )}

          {/* Gorgias Customers List */}
          {!isGorgiasLoading && gorgiasCustomers.length > 0 && (
            <div className="space-y-3 md:space-y-4">
              {gorgiasCustomers.map((customer, i) => (
                <motion.div
                  key={customer.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <a
                    href={`https://${process.env.NEXT_PUBLIC_GORGIAS_DOMAIN || 'tellmytale'}.gorgias.com/app/customers/${customer.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block bg-white rounded-xl md:rounded-2xl p-4 md:p-5 border border-gray-200 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-start gap-3 md:gap-4">
                      {/* Avatar */}
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-semibold text-sm md:text-base">
                          {getInitials(customer.firstname, customer.lastname, customer.name)}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-sm md:text-base text-[#1B2838] truncate">
                            {customer.name || customer.firstname || customer.lastname 
                              ? customer.name || `${customer.firstname || ''} ${customer.lastname || ''}`.trim()
                              : customer.email || 'Unknown Customer'}
                          </h3>
                          {(customer.ticketCount || 0) > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-50 text-purple-700">
                              {customer.ticketCount} tickets
                            </span>
                          )}
                          {(customer.openTicketCount || 0) > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700">
                              {customer.openTicketCount} open
                            </span>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-3 md:gap-4 text-xs md:text-sm text-gray-500">
                          {customer.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {customer.email}
                            </span>
                          )}
                          {customer.language && (
                            <span className="flex items-center gap-1">
                              <Globe className="w-3 h-3" />
                              {customer.language.toUpperCase()}
                            </span>
                          )}
                          {customer.timezone && (
                            <span className="flex items-center gap-1 text-xs text-gray-400">
                              {customer.timezone}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 md:gap-4 mt-2 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Created {formatDate(customer.gorgiasCreatedAt)}
                          </span>
                          {customer.shopifyCustomerId && (
                            <span className="flex items-center gap-1 text-green-600">
                              <ShoppingCart className="w-3 h-3" />
                              Linked to Shopify
                            </span>
                          )}
                        </div>

                        {/* Contact Channels */}
                        {customer.channels && customer.channels.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {customer.channels.slice(0, 3).map((channel, idx) => (
                              <span key={idx} className="px-2 py-0.5 bg-gray-100 rounded-full text-[10px] text-gray-600 flex items-center gap-1">
                                {channel.type === 'email' && <Mail className="w-2.5 h-2.5" />}
                                {channel.type === 'phone' && <Phone className="w-2.5 h-2.5" />}
                                {channel.address}
                              </span>
                            ))}
                            {customer.channels.length > 3 && (
                              <span className="px-2 py-0.5 bg-gray-100 rounded-full text-[10px] text-gray-600">
                                +{customer.channels.length - 3} more
                              </span>
                            )}
                          </div>
                        )}

                        {/* Note */}
                        {customer.note && (
                          <div className="mt-3 p-2 bg-yellow-50 rounded-lg text-xs text-yellow-800 line-clamp-2">
                            {customer.note}
                          </div>
                        )}
                      </div>

                      {/* External Link */}
                      <button className="p-1.5 md:p-2 hover:bg-gray-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                        <ExternalLink className="w-4 h-4 md:w-5 md:h-5 text-[#1B2838]" />
                      </button>
                    </div>
                  </a>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Pagination Info */}
      {activeTab === 'shopify' && customersData?.pageInfo?.hasNextPage && (
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Showing {customers.length} customers. More customers available.
          </p>
        </div>
      )}
      {activeTab === 'gorgias' && gorgiasData?.hasMore && (
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Showing {gorgiasCustomers.length} customers. More customers available.
          </p>
        </div>
      )}
    </>
  );
}
