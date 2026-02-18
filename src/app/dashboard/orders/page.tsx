'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  BookOpen,
  Package,
  ExternalLink,
  Search,
  Clock,
  DollarSign,
  User,
  ArrowRight,
  Loader2,
  AlertCircle,
  Truck,
  CheckCircle,
  Mail,
  Phone,
  MessageCircle,
  Headphones,
  ShoppingCart,
  Database,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Header } from '@/components/dashboard/Header';

const statusColors: Record<string, { bg: string; text: string }> = {
  pending: { bg: 'bg-amber-50', text: 'text-amber-700' },
  processing: { bg: 'bg-blue-50', text: 'text-blue-700' },
  shipped: { bg: 'bg-purple-50', text: 'text-purple-700' },
  delivered: { bg: 'bg-green-50', text: 'text-green-700' },
  cancelled: { bg: 'bg-red-50', text: 'text-red-700' },
  PAID: { bg: 'bg-green-50', text: 'text-green-700' },
  PENDING: { bg: 'bg-amber-50', text: 'text-amber-700' },
  UNFULFILLED: { bg: 'bg-amber-50', text: 'text-amber-700' },
  FULFILLED: { bg: 'bg-green-50', text: 'text-green-700' },
  PARTIALLY_FULFILLED: { bg: 'bg-blue-50', text: 'text-blue-700' },
  open: { bg: 'bg-amber-50', text: 'text-amber-700' },
  closed: { bg: 'bg-green-50', text: 'text-green-700' },
};

const channelIcons: Record<string, React.ReactNode> = {
  email: <Mail className="w-3.5 h-3.5" />,
  phone: <Phone className="w-3.5 h-3.5" />,
  chat: <MessageCircle className="w-3.5 h-3.5" />,
  helpdesk: <Headphones className="w-3.5 h-3.5" />,
};

export default function OrdersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'shopify' | 'gorgias'>('shopify');
  const [gorgiasFilter, setGorgiasFilter] = useState<'all' | 'open' | 'closed'>('all');

  // Fetch orders from Shopify Admin API
  const { data: ordersData, isLoading, error, refetch } = trpc.shopify.getAllOrders.useQuery({
    first: 50,
    query: searchQuery || undefined,
  });

  // Fetch products from Storefront API
  const { data: productsData } = trpc.shopify.getProducts.useQuery({ limit: 10 });

  // Fetch Gorgias tickets
  const { data: gorgiasData, isLoading: isGorgiasLoading, refetch: refetchGorgias } = trpc.dashboard.getGorgiasTickets.useQuery({
    status: gorgiasFilter,
    limit: 50,
  }, {
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const orders = ordersData?.orders || [];
  const products = productsData?.products || [];
  const gorgiasTickets = gorgiasData?.tickets || [];

  // Filter orders by status
  const filteredOrders = statusFilter === 'all' 
    ? orders 
    : orders.filter(o => o.status === statusFilter || o.fulfillmentStatus === statusFilter);

  // Filter Gorgias tickets by search
  const filteredGorgiasTickets = searchQuery
    ? gorgiasTickets.filter(t => 
        t.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.customerEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.customerName?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : gorgiasTickets;

  const formatDate = (dateString: string | Date | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatMoney = (amount: string, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(parseFloat(amount));
  };

  const handleRefresh = () => {
    refetch();
    refetchGorgias();
  };

  return (
    <>
      <Header
        title="Orders & Support"
        subtitle="View Shopify orders and Gorgias support tickets"
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
          Shopify Orders
          <span className={`px-1.5 py-0.5 rounded-full text-xs ${activeTab === 'shopify' ? 'bg-[#1B2838] text-white' : 'bg-gray-200 text-gray-600'}`}>
            {orders.length}
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
          Support Tickets
          <span className={`px-1.5 py-0.5 rounded-full text-xs ${activeTab === 'gorgias' ? 'bg-[#1B2838] text-white' : 'bg-gray-200 text-gray-600'}`}>
            {gorgiasTickets.length}
          </span>
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-gray-400" />
          <input
            type="text"
            placeholder={activeTab === 'shopify' ? "Search orders by number, customer..." : "Search tickets by subject, email..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 md:pl-11 pr-4 py-2.5 md:py-3 rounded-lg md:rounded-xl border border-gray-200 bg-white text-sm focus:border-[#1B2838] transition-colors"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {activeTab === 'shopify' ? (
            ['all', 'pending', 'processing', 'shipped', 'delivered'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium capitalize whitespace-nowrap transition-all ${
                  statusFilter === status
                    ? 'bg-[#1B2838] text-white'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {status}
              </button>
            ))
          ) : (
            ['all', 'open', 'closed'].map((status) => (
              <button
                key={status}
                onClick={() => setGorgiasFilter(status as 'all' | 'open' | 'closed')}
                className={`px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium capitalize whitespace-nowrap transition-all ${
                  gorgiasFilter === status
                    ? 'bg-[#1B2838] text-white'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {status}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Stats Summary */}
      {activeTab === 'shopify' ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
          {[
            { label: 'Total Orders', value: orders.length, icon: Package, color: 'blue' },
            { label: 'Processing', value: orders.filter(o => o.status === 'processing').length, icon: Clock, color: 'amber' },
            { label: 'Shipped', value: orders.filter(o => o.status === 'shipped').length, icon: Truck, color: 'purple' },
            { label: 'Delivered', value: orders.filter(o => o.status === 'delivered').length, icon: CheckCircle, color: 'green' },
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
            { label: 'Total Tickets', value: gorgiasTickets.length, icon: Headphones, color: 'blue' },
            { label: 'Open', value: gorgiasTickets.filter(t => t.status === 'open').length, icon: Clock, color: 'amber' },
            { label: 'Closed', value: gorgiasTickets.filter(t => t.status === 'closed').length, icon: CheckCircle, color: 'green' },
            { label: 'Email', value: gorgiasTickets.filter(t => t.channel === 'email').length, icon: Mail, color: 'purple' },
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

      {/* Shopify Orders Tab Content */}
      {activeTab === 'shopify' && (
        <>
          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#1B2838] mx-auto mb-4" />
                <p className="text-gray-500">Loading orders...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center mb-6">
              <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
              <h3 className="font-semibold text-red-800 mb-2">Failed to Load Orders</h3>
              <p className="text-sm text-red-600 mb-4">
                {ordersData?.error || 'Make sure SHOPIFY_ADMIN_ACCESS_TOKEN is configured in your environment.'}
              </p>
              <button
                onClick={() => refetch()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Orders List */}
          {!isLoading && !error && filteredOrders.length > 0 && (
            <div className="space-y-3 md:space-y-4 mb-8">
              {filteredOrders.map((order, i) => (
                <motion.div
                  key={order.orderId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Link
                    href={`/dashboard/orders/${order.orderId.replace('gid://shopify/Order/', '')}`}
                    className="block bg-white rounded-xl md:rounded-2xl p-4 md:p-5 border border-gray-200 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-start gap-3 md:gap-4">
                      {/* Order Icon */}
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-[#1B2838]/10 flex items-center justify-center flex-shrink-0">
                        <Package className="w-5 h-5 md:w-6 md:h-6 text-[#1B2838]/50" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-sm md:text-base text-[#1B2838]">
                            {order.orderName}
                          </h3>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] md:text-xs font-medium capitalize ${statusColors[order.status]?.bg || 'bg-gray-50'} ${statusColors[order.status]?.text || 'text-gray-700'}`}>
                            {order.status}
                          </span>
                          {order.fulfillmentStatus && (
                            <span className={`hidden sm:inline px-2 py-0.5 rounded-full text-[10px] md:text-xs font-medium ${statusColors[order.fulfillmentStatus]?.bg || 'bg-gray-50'} ${statusColors[order.fulfillmentStatus]?.text || 'text-gray-700'}`}>
                              {order.fulfillmentStatus}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 md:gap-4 text-xs md:text-sm text-gray-500 mb-2">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {order.customerName}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(order.processedAt)}
                          </span>
                          <span className="flex items-center gap-1 font-medium text-[#1B2838]">
                            <DollarSign className="w-3 h-3" />
                            {formatMoney(order.totalPrice, order.currencyCode)}
                          </span>
                        </div>

                        {/* Items Preview */}
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>{order.items.length} item{order.items.length !== 1 ? 's' : ''}</span>
                          {order.items.slice(0, 2).map((item, idx) => (
                            <span key={idx} className="truncate max-w-[150px]">
                              • {item.name}
                            </span>
                          ))}
                          {order.items.length > 2 && (
                            <span>+{order.items.length - 2} more</span>
                          )}
                        </div>
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

          {/* Empty State */}
          {!isLoading && !error && filteredOrders.length === 0 && (
            <div className="bg-white rounded-xl md:rounded-2xl p-8 md:p-12 text-center border border-gray-200 mb-8">
              <Package className="w-10 h-10 md:w-12 md:h-12 text-gray-300 mx-auto mb-3 md:mb-4" />
              <h3 className="text-base md:text-lg font-semibold text-[#1B2838] mb-1 md:mb-2">
                {searchQuery || statusFilter !== 'all' ? 'No orders found' : 'No orders yet'}
              </h3>
              <p className="text-xs md:text-sm text-gray-500">
                {searchQuery || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Orders from Shopify will appear here'}
              </p>
            </div>
          )}
        </>
      )}

      {/* Gorgias Tickets Tab Content */}
      {activeTab === 'gorgias' && (
        <>
          {/* Loading State */}
          {isGorgiasLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#1B2838] mx-auto mb-4" />
                <p className="text-gray-500">Loading support tickets...</p>
              </div>
            </div>
          )}

          {/* Tickets List */}
          {!isGorgiasLoading && filteredGorgiasTickets.length > 0 && (
            <div className="space-y-3 md:space-y-4 mb-8">
              {filteredGorgiasTickets.map((ticket, i) => (
                <motion.div
                  key={ticket.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <a
                    href={`https://${process.env.NEXT_PUBLIC_GORGIAS_DOMAIN || 'tellmytale'}.gorgias.com/app/ticket/${ticket.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block bg-white rounded-xl md:rounded-2xl p-4 md:p-5 border border-gray-200 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-start gap-3 md:gap-4">
                      {/* Channel Icon */}
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                        {channelIcons[ticket.channel || 'email'] || <Headphones className="w-5 h-5 md:w-6 md:h-6 text-purple-500" />}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-sm md:text-base text-[#1B2838] truncate">
                            {ticket.subject || 'No subject'}
                          </h3>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] md:text-xs font-medium capitalize ${statusColors[ticket.status || 'open']?.bg || 'bg-gray-50'} ${statusColors[ticket.status || 'open']?.text || 'text-gray-700'}`}>
                            {ticket.status || 'open'}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] md:text-xs font-medium bg-gray-100 text-gray-600 capitalize">
                            {ticket.channel || 'unknown'}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 md:gap-4 text-xs md:text-sm text-gray-500 mb-2">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {ticket.customerName || ticket.customerEmail || 'Unknown'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(ticket.gorgiasCreatedAt)}
                          </span>
                          {ticket.messagesCount && (
                            <span className="flex items-center gap-1">
                              <MessageCircle className="w-3 h-3" />
                              {ticket.messagesCount} messages
                            </span>
                          )}
                        </div>

                        {/* Ticket ID */}
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <span>Ticket #{ticket.id}</span>
                          {ticket.customerEmail && (
                            <span className="truncate max-w-[200px]">• {ticket.customerEmail}</span>
                          )}
                        </div>
                      </div>

                      {/* External Link Icon */}
                      <button className="p-1.5 md:p-2 hover:bg-gray-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                        <ExternalLink className="w-4 h-4 md:w-5 md:h-5 text-[#1B2838]" />
                      </button>
                    </div>
                  </a>
                </motion.div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isGorgiasLoading && filteredGorgiasTickets.length === 0 && (
            <div className="bg-white rounded-xl md:rounded-2xl p-8 md:p-12 text-center border border-gray-200 mb-8">
              <Headphones className="w-10 h-10 md:w-12 md:h-12 text-gray-300 mx-auto mb-3 md:mb-4" />
              <h3 className="text-base md:text-lg font-semibold text-[#1B2838] mb-1 md:mb-2">
                {searchQuery || gorgiasFilter !== 'all' ? 'No tickets found' : 'No support tickets'}
              </h3>
              <p className="text-xs md:text-sm text-gray-500">
                {searchQuery || gorgiasFilter !== 'all' ? 'Try adjusting your filters' : 'Gorgias support tickets will appear here'}
              </p>
            </div>
          )}
        </>
      )}

      {/* Products Section */}
      {products.length > 0 && (
        <>
          <h3 className="text-base md:text-lg font-bold text-[#1B2838] mb-4">Products</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 mb-8">
            {products.slice(0, 8).map((product, i) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white rounded-xl md:rounded-2xl p-3 md:p-5 border border-gray-200 hover:shadow-md transition-all group cursor-pointer"
              >
                <div className="relative w-full aspect-square mb-3 md:mb-4 rounded-lg md:rounded-xl overflow-hidden bg-gray-50">
                  {product.images[0]?.url ? (
                    <img
                      src={product.images[0].url}
                      alt={product.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                      <BookOpen className="w-8 h-8 md:w-12 md:h-12 text-[#1B2838]/30" />
                    </div>
                  )}
                  {product.compareAtPrice && parseFloat(product.compareAtPrice) > parseFloat(product.price) && (
                    <span className="absolute top-2 left-2 bg-[#1B2838] text-white text-[10px] md:text-xs font-bold px-2 py-0.5 rounded-full">
                      SALE
                    </span>
                  )}
                </div>

                <h3 className="font-semibold text-xs md:text-sm text-[#1B2838] mb-1 md:mb-2 line-clamp-2 group-hover:text-[#2D4A6F] transition-colors">
                  {product.title}
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-sm md:text-lg font-bold text-[#1B2838]">${product.price}</span>
                  {product.compareAtPrice && parseFloat(product.compareAtPrice) > parseFloat(product.price) && (
                    <span className="text-[10px] md:text-xs text-gray-400 line-through">${product.compareAtPrice}</span>
                  )}
                </div>

                <a
                  href={`https://tellmytale.com/products/${product.handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="mt-2 md:mt-3 flex items-center justify-center gap-1.5 w-full py-2 md:py-2.5 rounded-lg md:rounded-xl bg-gray-100 text-gray-600 text-xs md:text-sm font-medium hover:bg-[#1B2838] hover:text-white transition-colors"
                >
                  View on Store
                  <ExternalLink className="w-3 h-3 md:w-4 md:h-4" />
                </a>
              </motion.div>
            ))}
          </div>
        </>
      )}

      {/* Info Card */}
      <div className="p-4 md:p-6 bg-gray-50 rounded-xl md:rounded-2xl border border-gray-200">
        <h3 className="font-semibold text-sm md:text-base text-[#1B2838] mb-2">About Order Management</h3>
        <p className="text-xs md:text-sm text-gray-500">
          Orders are synced from Shopify in real-time. Click on any order to view full details, 
          track shipments, and manage customer communications. Orders can also be looked up 
          using customer email addresses through the chat interface.
        </p>
      </div>
    </>
  );
}
