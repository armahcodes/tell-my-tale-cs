'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  ShoppingBag,
  DollarSign,
  Tag,
  FileText,
  Clock,
  ExternalLink,
  Copy,
  Check,
  Loader2,
  AlertCircle,
  Package,
  CreditCard,
  MessageSquare,
  Edit3,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';

type ViewTab = 'overview' | 'orders' | 'addresses' | 'notes';

const tabs: { id: ViewTab; label: string; icon: typeof User }[] = [
  { id: 'overview', label: 'Overview', icon: User },
  { id: 'orders', label: 'Orders', icon: ShoppingBag },
  { id: 'addresses', label: 'Addresses', icon: MapPin },
  { id: 'notes', label: 'Notes', icon: FileText },
];

export default function CustomerDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ViewTab>('overview');
  const [copied, setCopied] = useState(false);

  const customerId = params.id as string;

  // Fetch customer data from Shopify Admin API
  const { data: customerData, isLoading, error } = trpc.shopify.getAdminCustomerById.useQuery({
    customerId: customerId,
  });

  const customer = customerData?.customer;

  const copyEmail = () => {
    if (customer?.email) {
      navigator.clipboard.writeText(customer.email);
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
    });
  };

  const formatMoney = (amount: string | undefined, currency: string = 'USD') => {
    if (!amount) return '$0.00';
    // Handle amount that might be like "$123.45" or "123.45"
    const numericAmount = parseFloat(amount.replace(/[^0-9.-]/g, ''));
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(numericAmount);
  };

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || '?';
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#1B2838] mx-auto mb-4" />
          <p className="text-gray-500">Loading customer details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !customer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-[#1B2838] mb-2">Customer Not Found</h2>
        <p className="text-gray-500 mb-4">
          {customerData?.error || 'Unable to load customer details. Make sure SHOPIFY_ADMIN_ACCESS_TOKEN is configured.'}
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

  const orders = customer.orders?.edges || [];

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
            <h1 className="text-xl md:text-2xl font-bold text-[#1B2838]">
              {customer.firstName || customer.lastName 
                ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim()
                : 'Customer'}
            </h1>
            {customer.verifiedEmail && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                Verified
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500">Customer since {formatDate(customer.createdAt)}</p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`https://admin.shopify.com/store/tellmytale/customers/${customer.legacyResourceId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            View in Shopify
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Customer Header Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[#1B2838] flex items-center justify-center text-white text-2xl font-semibold">
            {getInitials(customer.firstName, customer.lastName)}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-[#1B2838]">
              {customer.firstName || customer.lastName 
                ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim()
                : 'No Name'}
            </h2>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-600">
              {customer.email && (
                <div className="flex items-center gap-1">
                  <Mail className="w-4 h-4" />
                  <span>{customer.email}</span>
                  <button onClick={copyEmail} className="p-1 hover:bg-gray-100 rounded">
                    {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 text-gray-400" />}
                  </button>
                </div>
              )}
              {customer.phone && (
                <div className="flex items-center gap-1">
                  <Phone className="w-4 h-4" />
                  <span>{customer.phone}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-4 md:gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-[#1B2838]">{customer.numberOfOrders || 0}</p>
              <p className="text-xs text-gray-500">Orders</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-[#1B2838]">${customer.amountSpent?.amount || '0.00'}</p>
              <p className="text-xs text-gray-500">Total Spent</p>
            </div>
          </div>
        </div>
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
            {tab.id === 'orders' && orders.length > 0 && (
              <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${
                activeTab === tab.id ? 'bg-white/20' : 'bg-gray-100'
              }`}>
                {orders.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {activeTab === 'overview' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Total Orders', value: customer.numberOfOrders || 0, icon: ShoppingBag },
                  { label: 'Total Spent', value: `$${customer.amountSpent?.amount || '0.00'}`, icon: DollarSign },
                  { label: 'Status', value: customer.state === 'ENABLED' ? 'Active' : 'Disabled', icon: User },
                  { label: 'Tax Exempt', value: customer.taxExempt ? 'Yes' : 'No', icon: CreditCard },
                ].map((stat) => (
                  <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <stat.icon className="w-4 h-4 text-gray-400" />
                      <span className="text-xs text-gray-500">{stat.label}</span>
                    </div>
                    <p className="font-semibold text-[#1B2838]">{stat.value}</p>
                  </div>
                ))}
              </div>

              {/* Recent Orders */}
              {orders.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-[#1B2838]">Recent Orders</h3>
                    <button
                      onClick={() => setActiveTab('orders')}
                      className="text-sm text-[#1B2838] hover:underline"
                    >
                      View All →
                    </button>
                  </div>
                  <div className="space-y-3">
                    {orders.slice(0, 3).map((order) => (
                      <Link
                        key={order.node.id}
                        href={`/dashboard/orders/${order.node.legacyResourceId}`}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-[#1B2838]/10 flex items-center justify-center">
                            <Package className="w-5 h-5 text-[#1B2838]/50" />
                          </div>
                          <div>
                            <p className="font-medium text-sm text-[#1B2838]">{order.node.name}</p>
                            <p className="text-xs text-gray-500">{formatDate(order.node.createdAt)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-sm text-[#1B2838]">
                            {formatMoney(order.node.totalPriceSet.shopMoney.amount, order.node.totalPriceSet.shopMoney.currencyCode)}
                          </p>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            order.node.displayFulfillmentStatus === 'FULFILLED' 
                              ? 'bg-green-50 text-green-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}>
                            {order.node.displayFulfillmentStatus}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              {customer.tags && customer.tags.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="font-semibold text-[#1B2838] mb-4">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {customer.tags.map((tag) => (
                      <span key={tag} className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 rounded-full text-sm text-gray-700">
                        <Tag className="w-3 h-3" />
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'orders' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              {orders.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                  <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="font-semibold text-[#1B2838] mb-2">No Orders Yet</h3>
                  <p className="text-sm text-gray-500">This customer hasn't placed any orders.</p>
                </div>
              ) : (
                orders.map((order) => (
                  <Link
                    key={order.node.id}
                    href={`/dashboard/orders/${order.node.legacyResourceId}`}
                    className="block bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-[#1B2838]">{order.node.name}</h4>
                        <p className="text-sm text-gray-500">{formatDate(order.node.createdAt)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-[#1B2838]">
                          {formatMoney(order.node.totalPriceSet.shopMoney.amount, order.node.totalPriceSet.shopMoney.currencyCode)}
                        </p>
                        <div className="flex gap-2 mt-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            order.node.displayFinancialStatus === 'PAID' 
                              ? 'bg-green-50 text-green-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}>
                            {order.node.displayFinancialStatus}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            order.node.displayFulfillmentStatus === 'FULFILLED' 
                              ? 'bg-green-50 text-green-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}>
                            {order.node.displayFulfillmentStatus}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Line Items Preview */}
                    {order.node.lineItems?.edges && order.node.lineItems.edges.length > 0 && (
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                        {order.node.lineItems.edges.slice(0, 3).map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                            {item.node.image?.url ? (
                              <img src={item.node.image.url} alt="" className="w-8 h-8 rounded object-cover" />
                            ) : (
                              <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center">
                                <Package className="w-4 h-4 text-gray-400" />
                              </div>
                            )}
                            <span className="truncate max-w-[150px]">{item.node.name}</span>
                            <span className="text-gray-400">×{item.node.quantity}</span>
                          </div>
                        ))}
                        {order.node.lineItems.edges.length > 3 && (
                          <span className="text-xs text-gray-500">
                            +{order.node.lineItems.edges.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </Link>
                ))
              )}
            </motion.div>
          )}

          {activeTab === 'addresses' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              {/* Default Address */}
              {customer.defaultAddress && (
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <h3 className="font-semibold text-[#1B2838]">Default Address</h3>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                      Primary
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p className="font-medium text-[#1B2838]">
                      {customer.defaultAddress.firstName} {customer.defaultAddress.lastName}
                    </p>
                    {customer.defaultAddress.company && <p>{customer.defaultAddress.company}</p>}
                    <p>{customer.defaultAddress.address1}</p>
                    {customer.defaultAddress.address2 && <p>{customer.defaultAddress.address2}</p>}
                    <p>
                      {customer.defaultAddress.city}, {customer.defaultAddress.provinceCode} {customer.defaultAddress.zip}
                    </p>
                    <p>{customer.defaultAddress.country}</p>
                    {customer.defaultAddress.phone && (
                      <p className="flex items-center gap-1 mt-2">
                        <Phone className="w-3 h-3" />
                        {customer.defaultAddress.phone}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Other Addresses */}
              {customer.addresses && customer.addresses.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-[#1B2838]">Other Addresses</h3>
                  {customer.addresses
                    .filter(addr => addr.id !== customer.defaultAddress?.id)
                    .map((address) => (
                      <div key={address.id} className="bg-white rounded-xl border border-gray-200 p-4">
                        <div className="text-sm text-gray-600 space-y-1">
                          <p className="font-medium text-[#1B2838]">
                            {address.firstName} {address.lastName}
                          </p>
                          {address.company && <p>{address.company}</p>}
                          <p>{address.address1}</p>
                          {address.address2 && <p>{address.address2}</p>}
                          <p>{address.city}, {address.provinceCode} {address.zip}</p>
                          <p>{address.country}</p>
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {!customer.defaultAddress && (!customer.addresses || customer.addresses.length === 0) && (
                <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                  <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="font-semibold text-[#1B2838] mb-2">No Addresses</h3>
                  <p className="text-sm text-gray-500">This customer hasn't added any addresses.</p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'notes' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-semibold text-[#1B2838] mb-4">Customer Notes</h3>
                {customer.note ? (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{customer.note}</p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No notes for this customer.</p>
                )}
              </div>

              {/* Metafields */}
              {customer.metafields?.edges && customer.metafields.edges.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="font-semibold text-[#1B2838] mb-4">Additional Information</h3>
                  <div className="space-y-3">
                    {customer.metafields.edges.map((metafield) => (
                      <div key={`${metafield.node.namespace}-${metafield.node.key}`} className="flex justify-between text-sm">
                        <span className="text-gray-500">{metafield.node.key}</span>
                        <span className="text-[#1B2838] font-medium">{metafield.node.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-[#1B2838] mb-4">Customer Details</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-gray-500">Member since</p>
                  <p className="font-medium text-[#1B2838]">{formatDate(customer.createdAt)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-gray-500">Last updated</p>
                  <p className="font-medium text-[#1B2838]">{formatDate(customer.updatedAt)}</p>
                </div>
              </div>
              {customer.locale && (
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-gray-500">Locale</p>
                    <p className="font-medium text-[#1B2838]">{customer.locale}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-[#1B2838] mb-4">Quick Actions</h3>
            <div className="space-y-2">
              {customer.email && (
                <a
                  href={`mailto:${customer.email}`}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 text-sm font-medium text-[#1B2838] hover:bg-gray-50 transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  Send Email
                </a>
              )}
              <a
                href={`https://admin.shopify.com/store/tellmytale/customers/${customer.legacyResourceId}`}
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
