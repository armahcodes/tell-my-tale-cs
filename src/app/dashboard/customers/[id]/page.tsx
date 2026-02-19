'use client';

import { use } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  ArrowLeft,
  Mail,
  Phone,
  Globe,
  Calendar,
  Ticket,
  MessageSquare,
  Clock,
  User,
  ExternalLink,
  Loader2,
  CheckCircle,
  AlertCircle,
  FileText,
  Headphones,
  ShoppingCart,
  MapPin,
} from 'lucide-react';
import { Header } from '@/components/dashboard/Header';
import { trpc } from '@/lib/trpc';

const statusColors: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  open: { bg: 'bg-amber-50', text: 'text-amber-700', icon: <AlertCircle className="w-4 h-4" /> },
  closed: { bg: 'bg-green-50', text: 'text-green-700', icon: <CheckCircle className="w-4 h-4" /> },
};

const channelIcons: Record<string, React.ReactNode> = {
  email: <Mail className="w-4 h-4" />,
  phone: <Phone className="w-4 h-4" />,
  chat: <MessageSquare className="w-4 h-4" />,
  helpdesk: <Headphones className="w-4 h-4" />,
};

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const customerId = parseInt(id, 10);

  const { data, isLoading, refetch } = trpc.dashboard.getGorgiasCustomerById.useQuery({
    id: customerId,
  }, {
    enabled: !isNaN(customerId),
  });

  const customer = data?.customer;
  const tickets = data?.tickets || [];

  const formatDate = (dateString: string | Date | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateString: string | Date | null) => {
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
    if (diffDays < 30) return `${diffDays}d ago`;
    return formatDate(dateString);
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

  const getDisplayName = () => {
    if (!customer) return 'Unknown';
    if (customer.name) return customer.name;
    if (customer.firstname || customer.lastname) {
      return `${customer.firstname || ''} ${customer.lastname || ''}`.trim();
    }
    return customer.email || 'Unknown Customer';
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-[#1B2838] mx-auto mb-4" />
          <p className="text-gray-500">Loading customer profile...</p>
        </div>
      </div>
    );
  }

  // Not found state
  if (!customer) {
    return (
      <div className="text-center py-20">
        <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-[#1B2838] mb-2">Customer Not Found</h2>
        <p className="text-gray-500 mb-6">This customer profile doesn't exist or has been removed.</p>
        <Link
          href="/dashboard/customers"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#1B2838] text-white rounded-lg font-medium hover:bg-[#2D4A6F] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Customers
        </Link>
      </div>
    );
  }

  const openTickets = tickets.filter(t => t.status === 'open');
  const closedTickets = tickets.filter(t => t.status === 'closed');

  return (
    <>
      {/* Back button and header */}
      <div className="mb-6">
        <Link
          href="/dashboard/customers"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-[#1B2838] transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Customers
        </Link>
      </div>

      {/* Customer Header Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm mb-6"
      >
        <div className="flex flex-col md:flex-row md:items-start gap-6">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-2xl">
              {getInitials(customer.firstname, customer.lastname, customer.name, customer.email)}
            </span>
          </div>

          {/* Main Info */}
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-[#1B2838]">{getDisplayName()}</h1>
              {customer.shopifyCustomerId && (
                <span className="px-2 py-1 bg-green-50 text-green-700 rounded-lg text-xs font-medium flex items-center gap-1">
                  <ShoppingCart className="w-3 h-3" />
                  Shopify Linked
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-4">
              {customer.email && (
                <a href={`mailto:${customer.email}`} className="flex items-center gap-1.5 hover:text-purple-600 transition-colors">
                  <Mail className="w-4 h-4" />
                  {customer.email}
                </a>
              )}
              {customer.language && (
                <span className="flex items-center gap-1.5">
                  <Globe className="w-4 h-4" />
                  {customer.language.toUpperCase()}
                </span>
              )}
              {customer.timezone && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  {customer.timezone}
                </span>
              )}
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-4">
              <div className="px-4 py-2 bg-purple-50 rounded-xl">
                <p className="text-xs text-gray-500">Total Tickets</p>
                <p className="text-xl font-bold text-purple-700">{tickets.length}</p>
              </div>
              <div className="px-4 py-2 bg-amber-50 rounded-xl">
                <p className="text-xs text-gray-500">Open</p>
                <p className="text-xl font-bold text-amber-700">{openTickets.length}</p>
              </div>
              <div className="px-4 py-2 bg-green-50 rounded-xl">
                <p className="text-xs text-gray-500">Closed</p>
                <p className="text-xl font-bold text-green-700">{closedTickets.length}</p>
              </div>
              <div className="px-4 py-2 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500">Customer Since</p>
                <p className="text-sm font-bold text-gray-700">{formatDate(customer.gorgiasCreatedAt)}</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <a
              href={`https://${process.env.NEXT_PUBLIC_GORGIAS_DOMAIN || 'tellmytale'}.gorgias.com/app/customers/${customer.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-[#1B2838] text-white rounded-lg text-sm font-medium hover:bg-[#2D4A6F] transition-colors flex items-center gap-2"
            >
              View in Gorgias
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </motion.div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Customer Details */}
        <div className="lg:col-span-1 space-y-6">
          {/* Contact Channels */}
          {customer.channels && customer.channels.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl p-5 border border-gray-200"
            >
              <h3 className="font-bold text-[#1B2838] mb-4 flex items-center gap-2">
                <Phone className="w-5 h-5" />
                Contact Channels
              </h3>
              <div className="space-y-3">
                {customer.channels.map((channel, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      channel.type === 'email' ? 'bg-blue-100 text-blue-600' :
                      channel.type === 'phone' ? 'bg-green-100 text-green-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {channel.type === 'email' ? <Mail className="w-4 h-4" /> :
                       channel.type === 'phone' ? <Phone className="w-4 h-4" /> :
                       <MessageSquare className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#1B2838] capitalize">{channel.type}</p>
                      <p className="text-xs text-gray-500 truncate">{channel.address}</p>
                    </div>
                    {channel.preferred && (
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-[10px] font-medium">
                        Preferred
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Customer Note */}
          {customer.note && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-white rounded-2xl p-5 border border-gray-200"
            >
              <h3 className="font-bold text-[#1B2838] mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Customer Note
              </h3>
              <div className="p-4 bg-amber-50 rounded-xl text-sm text-amber-900 whitespace-pre-wrap">
                {customer.note}
              </div>
            </motion.div>
          )}

          {/* Customer Data (if any) */}
          {customer.data && Object.keys(customer.data).length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl p-5 border border-gray-200"
            >
              <h3 className="font-bold text-[#1B2838] mb-3">Custom Data</h3>
              <div className="space-y-2">
                {Object.entries(customer.data).map(([key, value]) => (
                  <div key={key} className="flex justify-between text-sm">
                    <span className="text-gray-500 capitalize">{key.replace(/_/g, ' ')}</span>
                    <span className="text-[#1B2838] font-medium">{String(value)}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Meta info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-white rounded-2xl p-5 border border-gray-200"
          >
            <h3 className="font-bold text-[#1B2838] mb-3 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Timeline
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Created</span>
                <span className="text-[#1B2838]">{formatDateTime(customer.gorgiasCreatedAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Last Updated</span>
                <span className="text-[#1B2838]">{formatDateTime(customer.gorgiasUpdatedAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Last Synced</span>
                <span className="text-[#1B2838]">{formatDateTime(customer.syncedAt)}</span>
              </div>
              {customer.externalId && (
                <div className="flex justify-between">
                  <span className="text-gray-500">External ID</span>
                  <span className="text-[#1B2838] font-mono text-xs">{customer.externalId}</span>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Right Column - Tickets */}
        <div className="lg:col-span-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl p-5 border border-gray-200"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-[#1B2838] flex items-center gap-2">
                <Ticket className="w-5 h-5" />
                Support Tickets ({tickets.length})
              </h3>
            </div>

            {tickets.length === 0 ? (
              <div className="text-center py-12">
                <Ticket className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No tickets found for this customer</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tickets.map((ticket, i) => (
                  <motion.a
                    key={ticket.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + i * 0.03 }}
                    href={`https://${process.env.NEXT_PUBLIC_GORGIAS_DOMAIN || 'tellmytale'}.gorgias.com/app/ticket/${ticket.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-4 p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors group"
                  >
                    {/* Channel icon */}
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      ticket.channel === 'email' ? 'bg-blue-100 text-blue-600' :
                      ticket.channel === 'chat' ? 'bg-purple-100 text-purple-600' :
                      ticket.channel === 'phone' ? 'bg-green-100 text-green-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {channelIcons[ticket.channel || 'email'] || <Headphones className="w-5 h-5" />}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-gray-400 font-mono">#{ticket.id}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize flex items-center gap-1 ${statusColors[ticket.status || 'open']?.bg || 'bg-gray-50'} ${statusColors[ticket.status || 'open']?.text || 'text-gray-700'}`}>
                          {statusColors[ticket.status || 'open']?.icon}
                          {ticket.status || 'open'}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-xs bg-gray-200 text-gray-600 capitalize">
                          {ticket.channel || 'unknown'}
                        </span>
                      </div>

                      <h4 className="font-medium text-[#1B2838] mb-1 line-clamp-1 group-hover:text-purple-600 transition-colors">
                        {ticket.subject || 'No subject'}
                      </h4>

                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatTimeAgo(ticket.gorgiasCreatedAt)}
                        </span>
                        {ticket.messagesCount && (
                          <span className="flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            {ticket.messagesCount} messages
                          </span>
                        )}
                      </div>
                    </div>

                    {/* External link */}
                    <ExternalLink className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  </motion.a>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </>
  );
}
