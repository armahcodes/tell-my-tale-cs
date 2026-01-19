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
} from 'lucide-react';
import { Header } from '@/components/dashboard/Header';
import { trpc } from '@/lib/trpc';

export default function CustomersPage() {
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch customers from Shopify Admin API
  const { data: customersData, isLoading, error, refetch } = trpc.shopify.getAllCustomers.useQuery({
    first: 50,
    query: searchQuery || undefined,
  });

  const customers = customersData?.customers || [];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || '?';
  };

  return (
    <>
      <Header
        title="Customers"
        subtitle="View and manage your customers from Shopify"
        onRefresh={() => refetch()}
      />

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search customers by name, email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 md:pl-11 pr-4 py-2.5 md:py-3 rounded-lg md:rounded-xl border border-gray-200 bg-white text-sm focus:border-[#1B2838] transition-colors"
        />
      </div>

      {/* Stats Summary */}
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
                      {getInitials(customer.firstName || undefined, customer.lastName || undefined)}
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

      {/* Pagination Info */}
      {customersData?.pageInfo?.hasNextPage && (
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Showing {customers.length} customers. More customers available.
          </p>
        </div>
      )}
    </>
  );
}
