'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  MessageSquare,
  Users,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  ArrowUpRight,
  Star,
  Zap,
  BookOpen,
  ArrowDown,
  Package,
  DollarSign,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Header } from '@/components/dashboard/Header';

export default function DashboardPage() {
  // tRPC queries for real data
  const { data: statsData, refetch: refetchStats } = trpc.dashboard.getStats.useQuery(
    undefined,
    { refetchInterval: 30000 }
  );

  const { data: productsData } = trpc.shopify.getProducts.useQuery({ limit: 10 });
  const { data: ordersData } = trpc.shopify.getAllOrders.useQuery({ first: 5 });
  const { data: customersData } = trpc.shopify.getAllCustomers.useQuery({ first: 5 });

  const stats = statsData || {
    totalConversations: 0,
    activeNow: 0,
    resolvedToday: 0,
    avgResponseTime: '—',
    aiResolutionRate: 0,
    csatScore: 0,
    escalationRate: 0,
    pendingEscalations: 0,
    highPriorityCount: 0,
    mediumPriorityCount: 0,
  };

  const handleRefresh = async () => {
    await refetchStats();
  };

  return (
    <>
      <Header 
        title="Dashboard" 
        subtitle="Here's what's happening with your customers today"
        onRefresh={handleRefresh}
      />

      {/* Stats Grid - Responsive */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5 mb-6 md:mb-8">
        {[
          {
            icon: MessageSquare,
            label: 'Conversations',
            value: stats.totalConversations,
            change: '+12%',
            positive: true,
          },
          {
            icon: Users,
            label: 'Active Now',
            value: stats.activeNow,
            live: true,
          },
          {
            icon: Clock,
            label: 'Avg Response',
            value: stats.avgResponseTime,
            change: 'Fast',
            positive: true,
          },
          {
            icon: Star,
            label: 'CSAT Score',
            value: stats.csatScore > 0 ? stats.csatScore.toFixed(1) : '—',
            suffix: stats.csatScore > 0 ? '/5.0' : '',
          },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white rounded-xl md:rounded-2xl p-3 md:p-5 shadow-sm hover:shadow-md transition-all duration-300 border border-gray-200"
          >
            <div className="flex items-center justify-between mb-2 md:mb-4">
              <div className="p-2 md:p-3 rounded-lg md:rounded-xl bg-gray-50">
                <stat.icon className="w-4 h-4 md:w-5 md:h-5 text-[#1B2838]" />
              </div>
              {stat.change && (
                <span className={`hidden sm:flex items-center gap-1 text-[10px] md:text-xs font-semibold ${stat.positive ? 'text-green-600' : 'text-red-500'}`}>
                  {stat.positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                  {stat.change}
                </span>
              )}
              {stat.live && (
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[10px] md:text-xs font-medium text-green-600">Live</span>
                </div>
              )}
            </div>
            <div className="flex items-baseline gap-1">
              <p className="text-xl md:text-3xl font-bold text-[#1B2838]">{stat.value}</p>
              {stat.suffix && <span className="text-sm md:text-lg text-gray-500">{stat.suffix}</span>}
            </div>
            <p className="text-xs md:text-sm text-gray-500 mt-1">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Main Grid - Responsive */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
        {/* AI Performance */}
        <div className="lg:col-span-2 bg-white rounded-xl md:rounded-2xl p-4 md:p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <h3 className="text-base md:text-lg font-bold text-[#1B2838]">AI Performance</h3>
            <span className="text-xs md:text-sm text-gray-500">Last 24 hours</span>
          </div>
          <div className="grid grid-cols-3 gap-2 md:gap-4">
            <div className="text-center p-3 md:p-5 rounded-xl md:rounded-2xl bg-green-50 border border-green-100">
              <div className="w-10 h-10 md:w-14 md:h-14 mx-auto rounded-full bg-white shadow-sm flex items-center justify-center mb-2 md:mb-3">
                <CheckCircle className="w-5 h-5 md:w-7 md:h-7 text-green-600" />
              </div>
              <p className="text-lg md:text-3xl font-bold text-green-700">{stats.aiResolutionRate}%</p>
              <p className="text-[10px] md:text-sm text-gray-600 mt-1">Resolved by AI</p>
            </div>
            <div className="text-center p-3 md:p-5 rounded-xl md:rounded-2xl bg-amber-50 border border-amber-100">
              <div className="w-10 h-10 md:w-14 md:h-14 mx-auto rounded-full bg-white shadow-sm flex items-center justify-center mb-2 md:mb-3">
                <AlertCircle className="w-5 h-5 md:w-7 md:h-7 text-amber-600" />
              </div>
              <p className="text-lg md:text-3xl font-bold text-amber-700">{stats.escalationRate}%</p>
              <p className="text-[10px] md:text-sm text-gray-600 mt-1">Escalation</p>
            </div>
            <div className="text-center p-3 md:p-5 rounded-xl md:rounded-2xl bg-blue-50 border border-blue-100">
              <div className="w-10 h-10 md:w-14 md:h-14 mx-auto rounded-full bg-white shadow-sm flex items-center justify-center mb-2 md:mb-3">
                <TrendingUp className="w-5 h-5 md:w-7 md:h-7 text-blue-600" />
              </div>
              <p className="text-lg md:text-3xl font-bold text-blue-700">{stats.resolvedToday}</p>
              <p className="text-[10px] md:text-sm text-gray-600 mt-1">Resolved Today</p>
            </div>
          </div>
        </div>

        {/* Escalation Queue */}
        <div className="bg-[#1B2838] rounded-xl md:rounded-2xl p-4 md:p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-4 md:mb-5">
            <h3 className="text-base md:text-lg font-bold">Escalation Queue</h3>
            <Zap className="w-4 h-4 md:w-5 md:h-5 text-white/60" />
          </div>
          <div className="space-y-2 md:space-y-3">
            <div className="p-3 md:p-4 bg-white/10 rounded-lg md:rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs md:text-sm font-medium text-white/70">High Priority</span>
                <span className="text-xl md:text-2xl font-bold">{stats.highPriorityCount}</span>
              </div>
            </div>
            <div className="p-3 md:p-4 bg-white/5 rounded-lg md:rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs md:text-sm font-medium text-white/70">Medium Priority</span>
                <span className="text-xl md:text-2xl font-bold">{stats.mediumPriorityCount}</span>
              </div>
            </div>
            <a 
              href="/dashboard/conversations?filter=escalated"
              className="block w-full py-2.5 md:py-3 bg-white text-[#1B2838] rounded-lg md:rounded-xl font-semibold hover:bg-gray-100 transition-all text-center text-sm md:text-base"
            >
              View All Escalations
            </a>
          </div>
        </div>
      </div>

      {/* Recent Orders & Customers - Two Column */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
        {/* Recent Orders */}
        <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base md:text-lg font-bold text-[#1B2838]">Recent Orders</h3>
            <Link href="/dashboard/orders" className="text-xs md:text-sm text-[#1B2838] hover:underline font-medium">
              View all →
            </Link>
          </div>
          {ordersData?.orders && ordersData.orders.length > 0 ? (
            <div className="space-y-3">
              {ordersData.orders.slice(0, 4).map((order) => (
                <Link
                  key={order.orderId}
                  href={`/dashboard/orders/${order.orderId.replace('gid://shopify/Order/', '')}`}
                  className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-[#1B2838]/10 flex items-center justify-center flex-shrink-0">
                    <Package className="w-5 h-5 text-[#1B2838]/50" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-[#1B2838]">{order.orderName}</p>
                    <p className="text-xs text-gray-500 truncate">{order.customerName}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm text-[#1B2838]">${order.totalPrice}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full capitalize ${
                      order.status === 'delivered' ? 'bg-green-50 text-green-700' :
                      order.status === 'shipped' ? 'bg-purple-50 text-purple-700' :
                      order.status === 'processing' ? 'bg-blue-50 text-blue-700' :
                      'bg-amber-50 text-amber-700'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 text-sm">
              <Package className="w-10 h-10 mx-auto mb-2 text-gray-300" />
              No orders yet. Connect Shopify Admin API.
            </div>
          )}
        </div>

        {/* Recent Customers */}
        <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base md:text-lg font-bold text-[#1B2838]">Recent Customers</h3>
            <Link href="/dashboard/customers" className="text-xs md:text-sm text-[#1B2838] hover:underline font-medium">
              View all →
            </Link>
          </div>
          {customersData?.customers && customersData.customers.length > 0 ? (
            <div className="space-y-3">
              {customersData.customers.slice(0, 4).map((customer) => (
                <Link
                  key={customer.id}
                  href={`/dashboard/customers/${customer.legacyResourceId}`}
                  className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-[#1B2838] flex items-center justify-center flex-shrink-0 text-white font-semibold text-sm">
                    {(customer.firstName?.[0] || '') + (customer.lastName?.[0] || '')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-[#1B2838]">
                      {customer.firstName || customer.lastName 
                        ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim()
                        : 'No Name'}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{customer.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm text-[#1B2838]">${customer.amountSpent?.amount || '0.00'}</p>
                    <p className="text-[10px] text-gray-500">{customer.numberOfOrders || 0} orders</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 text-sm">
              <Users className="w-10 h-10 mx-auto mb-2 text-gray-300" />
              No customers yet. Connect Shopify Admin API.
            </div>
          )}
        </div>
      </div>

      {/* Products from Shopify - Responsive */}
      {productsData?.products && productsData.products.length > 0 && (
        <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-6 shadow-sm border border-gray-200 mb-6 md:mb-8">
          <div className="flex items-center justify-between mb-4 md:mb-5">
            <h3 className="text-base md:text-lg font-bold text-[#1B2838]">Products</h3>
            <a href="/dashboard/orders" className="text-xs md:text-sm text-[#1B2838] hover:underline font-medium">
              View all →
            </a>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
            {productsData.products.slice(0, 5).map((product) => (
              <div key={product.id} className="text-center p-3 md:p-4 rounded-lg md:rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer border border-gray-200">
                {product.images[0]?.url ? (
                  <img 
                    src={product.images[0].url} 
                    alt={product.title}
                    className="w-12 h-12 md:w-16 md:h-16 mx-auto rounded-lg md:rounded-xl object-cover mb-2 md:mb-3"
                  />
                ) : (
                  <div className="w-12 h-12 md:w-16 md:h-16 mx-auto rounded-lg md:rounded-xl bg-[#1B2838]/10 flex items-center justify-center mb-2 md:mb-3">
                    <BookOpen className="w-6 h-6 md:w-8 md:h-8 text-[#1B2838]" />
                  </div>
                )}
                <p className="text-xs md:text-sm font-medium text-[#1B2838] truncate">{product.title}</p>
                <p className="text-[10px] md:text-xs text-gray-500">${product.price}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions - Responsive */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
        {[
          { label: 'Conversations', href: '/dashboard/conversations', icon: MessageSquare },
          { label: 'Orders', href: '/dashboard/orders', icon: Package },
          { label: 'Customers', href: '/dashboard/customers', icon: Users },
          { label: 'Analytics', href: '/dashboard/analytics', icon: TrendingUp },
          { label: 'Settings', href: '/dashboard/settings', icon: AlertCircle },
        ].map((action) => (
          <a
            key={action.label}
            href={action.href}
            className="p-3 md:p-4 bg-white rounded-lg md:rounded-xl border border-gray-200 hover:shadow-md hover:border-[#1B2838]/20 transition-all flex items-center gap-2 md:gap-3 group"
          >
            <div className="p-1.5 md:p-2 rounded-md md:rounded-lg bg-gray-50 group-hover:bg-[#1B2838] transition-colors">
              <action.icon className="w-4 h-4 md:w-5 md:h-5 text-[#1B2838] group-hover:text-white transition-colors" />
            </div>
            <span className="text-xs md:text-sm font-medium text-[#1B2838]">
              {action.label}
            </span>
          </a>
        ))}
      </div>
    </>
  );
}
