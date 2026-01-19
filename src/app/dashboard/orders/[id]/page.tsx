'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Package,
  Truck,
  Clock,
  CheckCircle,
  AlertCircle,
  MapPin,
  CreditCard,
  User,
  MessageSquare,
  FileText,
  Edit3,
  Copy,
  Check,
  ExternalLink,
  BookOpen,
  DollarSign,
  Mail,
  Phone,
  Loader2,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';

type ViewTab = 'overview' | 'items' | 'timeline' | 'shipping' | 'notes';

const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
  pending: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  processing: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  shipped: { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500' },
  delivered: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  cancelled: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  PAID: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  PENDING: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  UNFULFILLED: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  FULFILLED: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  PARTIALLY_FULFILLED: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
};

const tabs: { id: ViewTab; label: string; icon: typeof Package }[] = [
  { id: 'overview', label: 'Overview', icon: FileText },
  { id: 'items', label: 'Items', icon: Package },
  { id: 'timeline', label: 'Timeline', icon: Clock },
  { id: 'shipping', label: 'Shipping', icon: Truck },
  { id: 'notes', label: 'Notes', icon: MessageSquare },
];

export default function OrderDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ViewTab>('overview');
  const [copied, setCopied] = useState(false);
  const [newNote, setNewNote] = useState('');

  const orderId = params.id as string;

  // Fetch order data from Shopify Admin API
  const { data: orderData, isLoading, error } = trpc.shopify.getAdminOrderById.useQuery({ 
    orderId: orderId 
  });

  const order = orderData?.order;

  const copyOrderId = () => {
    if (order?.name) {
      navigator.clipboard.writeText(order.name);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatMoney = (amount: string | undefined, currency: string = 'USD') => {
    if (!amount) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(parseFloat(amount));
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#1B2838] mx-auto mb-4" />
          <p className="text-gray-500">Loading order details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-[#1B2838] mb-2">Order Not Found</h2>
        <p className="text-gray-500 mb-4">
          {orderData?.error || 'Unable to load order details. Make sure SHOPIFY_ADMIN_ACCESS_TOKEN is configured.'}
        </p>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 bg-[#1B2838] text-white rounded-lg hover:bg-[#2D4A6F] transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  // Build timeline from events
  const timeline = order.events?.edges?.map(e => ({
    id: e.node.id,
    event: e.node.message,
    timestamp: e.node.createdAt,
    status: 'completed' as const,
  })) || [];

  return (
    <>
      {/* Back Button & Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-[#1B2838]" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xl md:text-2xl font-bold text-[#1B2838]">Order {order.name}</h1>
            <button
              onClick={copyOrderId}
              className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
              title="Copy order ID"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4 text-gray-400" />
              )}
            </button>
          </div>
          <p className="text-sm text-gray-500">Placed on {formatDate(order.createdAt)}</p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`https://admin.shopify.com/store/tellmytale/orders/${order.legacyResourceId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            View in Shopify
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Status Badges */}
      <div className="flex flex-wrap gap-2 mb-6">
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${statusColors[order.displayFinancialStatus]?.bg || 'bg-gray-50'} ${statusColors[order.displayFinancialStatus]?.text || 'text-gray-700'}`}>
          <CreditCard className="w-3.5 h-3.5" />
          {order.displayFinancialStatus}
        </span>
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${statusColors[order.displayFulfillmentStatus]?.bg || 'bg-gray-50'} ${statusColors[order.displayFulfillmentStatus]?.text || 'text-gray-700'}`}>
          <Package className="w-3.5 h-3.5" />
          {order.displayFulfillmentStatus}
        </span>
        {order.test && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-purple-50 text-purple-700">
            Test Order
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-[#1B2838] text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {activeTab === 'overview' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              {/* Order Summary */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-semibold text-[#1B2838] mb-4">Order Summary</h3>
                <div className="space-y-3">
                  {order.lineItems.edges.map((item) => (
                    <div key={item.node.id} className="flex gap-4 p-3 bg-gray-50 rounded-lg">
                      {item.node.image?.url ? (
                        <img 
                          src={item.node.image.url} 
                          alt={item.node.name}
                          className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-[#1B2838]/10 flex items-center justify-center flex-shrink-0">
                          <BookOpen className="w-6 h-6 text-[#1B2838]/50" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-[#1B2838]">{item.node.name}</p>
                        {item.node.variantTitle && (
                          <p className="text-xs text-gray-500">{item.node.variantTitle}</p>
                        )}
                        <p className="text-xs text-gray-500">Qty: {item.node.quantity}</p>
                      </div>
                      <p className="font-semibold text-[#1B2838]">
                        {formatMoney(item.node.originalTotalSet.shopMoney.amount, item.node.originalTotalSet.shopMoney.currencyCode)}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Subtotal</span>
                    <span className="text-[#1B2838]">{formatMoney(order.subtotalPriceSet.shopMoney.amount, order.subtotalPriceSet.shopMoney.currencyCode)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Shipping</span>
                    <span className="text-[#1B2838]">{formatMoney(order.totalShippingPriceSet.shopMoney.amount, order.totalShippingPriceSet.shopMoney.currencyCode)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Tax</span>
                    <span className="text-[#1B2838]">{formatMoney(order.totalTaxSet.shopMoney.amount, order.totalTaxSet.shopMoney.currencyCode)}</span>
                  </div>
                  {parseFloat(order.totalDiscountsSet.shopMoney.amount) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Discount {order.discountCode && `(${order.discountCode})`}</span>
                      <span className="text-green-600">-{formatMoney(order.totalDiscountsSet.shopMoney.amount, order.totalDiscountsSet.shopMoney.currencyCode)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-semibold pt-2 border-t border-gray-200">
                    <span className="text-[#1B2838]">Total</span>
                    <span className="text-[#1B2838]">{formatMoney(order.totalPriceSet.shopMoney.amount, order.totalPriceSet.shopMoney.currencyCode)}</span>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Items', value: order.lineItems.edges.length, icon: Package },
                  { label: 'Status', value: order.displayFulfillmentStatus, icon: Clock },
                  { label: 'Total', value: formatMoney(order.totalPriceSet.shopMoney.amount, order.totalPriceSet.shopMoney.currencyCode), icon: DollarSign },
                  { label: 'Customer Orders', value: order.customer?.numberOfOrders || 0, icon: User },
                ].map((stat) => (
                  <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <stat.icon className="w-4 h-4 text-gray-400" />
                      <span className="text-xs text-gray-500">{stat.label}</span>
                    </div>
                    <p className="font-semibold text-[#1B2838] capitalize text-sm">{stat.value}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'items' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              {order.lineItems.edges.map((item) => (
                <div key={item.node.id} className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex gap-4 mb-4">
                    {item.node.image?.url ? (
                      <img 
                        src={item.node.image.url} 
                        alt={item.node.name}
                        className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-xl bg-[#1B2838]/10 flex items-center justify-center flex-shrink-0">
                        <BookOpen className="w-8 h-8 text-[#1B2838]/50" />
                      </div>
                    )}
                    <div className="flex-1">
                      <h4 className="font-semibold text-[#1B2838] mb-1">{item.node.name}</h4>
                      {item.node.variantTitle && (
                        <p className="text-sm text-gray-500 mb-2">{item.node.variantTitle}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-gray-500">Qty: {item.node.quantity}</span>
                        <span className="font-semibold text-[#1B2838]">
                          {formatMoney(item.node.originalTotalSet.shopMoney.amount, item.node.originalTotalSet.shopMoney.currencyCode)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {item.node.customAttributes && item.node.customAttributes.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h5 className="font-medium text-sm text-[#1B2838] mb-3">Customization Details</h5>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {item.node.customAttributes.map((attr) => (
                          <div key={attr.key}>
                            <span className="text-gray-500">{attr.key}:</span>
                            <p className="font-medium text-[#1B2838]">{attr.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </motion.div>
          )}

          {activeTab === 'timeline' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-semibold text-[#1B2838] mb-6">Order Timeline</h3>
                {timeline.length > 0 ? (
                  <div className="relative">
                    {timeline.map((event, i) => (
                      <div key={event.id} className="flex gap-4 pb-6 last:pb-0">
                        {i < timeline.length - 1 && (
                          <div className="absolute left-[15px] top-8 w-0.5 h-[calc(100%-32px)] bg-gray-200" />
                        )}
                        <div className="relative z-10 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-green-100">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        </div>
                        <div className="flex-1 pt-1">
                          <p className="font-medium text-sm text-[#1B2838]">{event.event}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{formatDate(event.timestamp)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No timeline events available.</p>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'shipping' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              {/* Shipping Status */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-semibold text-[#1B2838] mb-4">Shipping Information</h3>
                <div className="space-y-4">
                  {order.fulfillments && order.fulfillments.length > 0 ? (
                    order.fulfillments.map((fulfillment) => (
                      <div key={fulfillment.id} className="p-4 bg-green-50 rounded-lg border border-green-100">
                        <div className="flex items-center gap-3">
                          <Truck className="w-5 h-5 text-green-600" />
                          <div>
                            <p className="font-medium text-green-800">{fulfillment.displayStatus || fulfillment.status}</p>
                            {fulfillment.trackingInfo && fulfillment.trackingInfo.length > 0 && (
                              <div className="mt-2">
                                {fulfillment.trackingInfo.map((tracking, idx) => (
                                  <div key={idx} className="text-sm text-green-700">
                                    {tracking.company && <span>{tracking.company}: </span>}
                                    {tracking.url ? (
                                      <a href={tracking.url} target="_blank" rel="noopener noreferrer" className="underline">
                                        {tracking.number}
                                      </a>
                                    ) : (
                                      <span>{tracking.number}</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-lg border border-amber-100">
                      <Clock className="w-5 h-5 text-amber-600" />
                      <div>
                        <p className="font-medium text-amber-800">Awaiting Shipment</p>
                        <p className="text-sm text-amber-600">Order is being prepared for shipping</p>
                      </div>
                    </div>
                  )}
                  
                  {order.shippingLine && (
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div>
                        <span className="text-xs text-gray-500">Shipping Method</span>
                        <p className="font-medium text-sm text-[#1B2838]">{order.shippingLine.title}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Addresses */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {order.shippingAddress && (
                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <h4 className="font-semibold text-[#1B2838]">Shipping Address</h4>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p className="font-medium text-[#1B2838]">
                        {order.shippingAddress.firstName} {order.shippingAddress.lastName}
                      </p>
                      <p>{order.shippingAddress.address1}</p>
                      {order.shippingAddress.address2 && <p>{order.shippingAddress.address2}</p>}
                      <p>{order.shippingAddress.city}, {order.shippingAddress.provinceCode} {order.shippingAddress.zip}</p>
                      <p>{order.shippingAddress.country}</p>
                    </div>
                  </div>
                )}

                {order.billingAddress && (
                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <CreditCard className="w-4 h-4 text-gray-400" />
                      <h4 className="font-semibold text-[#1B2838]">Billing Address</h4>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p className="font-medium text-[#1B2838]">
                        {order.billingAddress.firstName} {order.billingAddress.lastName}
                      </p>
                      <p>{order.billingAddress.address1}</p>
                      {order.billingAddress.address2 && <p>{order.billingAddress.address2}</p>}
                      <p>{order.billingAddress.city}, {order.billingAddress.provinceCode} {order.billingAddress.zip}</p>
                      <p>{order.billingAddress.country}</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'notes' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              {/* Add Note */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-semibold text-[#1B2838] mb-4">Add Note</h3>
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a note about this order..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 text-sm resize-none focus:border-[#1B2838] transition-colors"
                />
                <div className="flex justify-end mt-3">
                  <button className="px-4 py-2 bg-[#1B2838] text-white rounded-lg text-sm font-medium hover:bg-[#2D4A6F] transition-colors">
                    Add Note
                  </button>
                </div>
              </div>

              {/* Existing Note */}
              {order.note && (
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm text-[#1B2838]">Order Note</span>
                  </div>
                  <p className="text-sm text-gray-600">{order.note}</p>
                </div>
              )}

              {/* Tags */}
              {order.tags && order.tags.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <span className="font-medium text-sm text-[#1B2838] mb-2 block">Tags</span>
                  <div className="flex flex-wrap gap-2">
                    {order.tags.map((tag) => (
                      <span key={tag} className="px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-600">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer Card */}
          {order.customer && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-[#1B2838]">Customer</h3>
                <a
                  href={`/dashboard/customers/${order.customer.legacyResourceId}`}
                  className="text-sm text-[#1B2838] hover:underline"
                >
                  View Profile →
                </a>
              </div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-[#1B2838] flex items-center justify-center text-white font-semibold">
                  {(order.customer.firstName?.[0] || '') + (order.customer.lastName?.[0] || '')}
                </div>
                <div>
                  <p className="font-medium text-[#1B2838]">
                    {order.customer.firstName} {order.customer.lastName}
                  </p>
                  <p className="text-sm text-gray-500">{order.customer.numberOfOrders || 0} orders</p>
                </div>
              </div>
              <div className="space-y-2">
                {order.customer.email && (
                  <a href={`mailto:${order.customer.email}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#1B2838]">
                    <Mail className="w-4 h-4" />
                    {order.customer.email}
                  </a>
                )}
                {order.customer.phone && (
                  <a href={`tel:${order.customer.phone}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#1B2838]">
                    <Phone className="w-4 h-4" />
                    {order.customer.phone}
                  </a>
                )}
              </div>
              {order.customer.amountSpent && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Total Spent</span>
                    <span className="font-medium text-[#1B2838]">${order.customer.amountSpent.amount}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quick Actions */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-[#1B2838] mb-4">Quick Actions</h3>
            <div className="space-y-2">
              {order.email && (
                <a
                  href={`mailto:${order.email}`}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 text-sm font-medium text-[#1B2838] hover:bg-gray-50 transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  Send Email
                </a>
              )}
              <a
                href={`https://admin.shopify.com/store/tellmytale/orders/${order.legacyResourceId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 text-sm font-medium text-[#1B2838] hover:bg-gray-50 transition-colors"
              >
                <Edit3 className="w-4 h-4" />
                Edit in Shopify
              </a>
              <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 text-sm font-medium text-[#1B2838] hover:bg-gray-50 transition-colors">
                <MessageSquare className="w-4 h-4" />
                Start Chat
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
