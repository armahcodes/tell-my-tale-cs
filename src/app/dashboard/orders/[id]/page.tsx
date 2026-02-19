'use client';

import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Mail,
  Phone,
  MessageCircle,
  Headphones,
  Clock,
  User,
  Calendar,
  Tag,
  AlertCircle,
  CheckCircle,
  Loader2,
  Globe,
  Hash,
  UserCircle,
  Send,
  FileText,
  ExternalLink,
} from 'lucide-react';
import { Header } from '@/components/dashboard/Header';
import { trpc } from '@/lib/trpc';
import Link from 'next/link';

const statusColors: Record<string, { bg: string; text: string; icon: typeof CheckCircle }> = {
  open: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', icon: Clock },
  closed: { bg: 'bg-green-50 border-green-200', text: 'text-green-700', icon: CheckCircle },
};

const priorityColors: Record<string, { bg: string; text: string }> = {
  low: { bg: 'bg-gray-100', text: 'text-gray-600' },
  normal: { bg: 'bg-blue-100', text: 'text-blue-700' },
  high: { bg: 'bg-orange-100', text: 'text-orange-700' },
  urgent: { bg: 'bg-red-100', text: 'text-red-700' },
};

const channelIcons: Record<string, typeof Mail> = {
  email: Mail,
  phone: Phone,
  chat: MessageCircle,
  helpdesk: Headphones,
  'facebook-messenger': MessageCircle,
  'instagram-direct-message': MessageCircle,
  sms: MessageCircle,
};

const channelColors: Record<string, string> = {
  email: 'bg-blue-100 text-blue-700',
  phone: 'bg-green-100 text-green-700',
  chat: 'bg-purple-100 text-purple-700',
  helpdesk: 'bg-amber-100 text-amber-700',
};

export default function TicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const ticketId = parseInt(params.id as string);

  const { data, isLoading, refetch } = trpc.dashboard.getGorgiasTicketById.useQuery({
    id: ticketId,
  });

  const ticket = data?.ticket;
  const messages = data?.messages || [];
  const customer = data?.customer;

  const formatDate = (dateString: string | Date | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
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

  const ChannelIcon = channelIcons[ticket?.channel || 'email'] || Headphones;
  const StatusIcon = statusColors[ticket?.status || 'open']?.icon || Clock;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-[#1B2838] mx-auto mb-4" />
          <p className="text-gray-500">Loading ticket...</p>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <AlertCircle className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-[#1B2838] mb-2">Ticket not found</h2>
        <p className="text-gray-500 mb-4">The ticket you&apos;re looking for doesn&apos;t exist.</p>
        <Link
          href="/dashboard/orders"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#1B2838] text-white rounded-lg hover:bg-[#2D4A6F] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Tickets
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-[#1B2838]" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-bold text-[#1B2838]">
              Ticket #{ticket.id}
            </h1>
            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${statusColors[ticket.status]?.bg} ${statusColors[ticket.status]?.text}`}>
              <StatusIcon className="w-4 h-4 inline mr-1" />
              {ticket.status}
            </span>
            {ticket.priority && (
              <span className={`px-2 py-1 rounded-lg text-xs font-medium ${priorityColors[ticket.priority]?.bg} ${priorityColors[ticket.priority]?.text}`}>
                {ticket.priority}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Created {formatTimeAgo(ticket.gorgiasCreatedAt)}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Refresh"
        >
          <Loader2 className={`w-5 h-5 text-gray-500`} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - Messages */}
        <div className="lg:col-span-2 space-y-4">
          {/* Subject Card */}
          <div className="bg-white rounded-2xl p-5 border border-gray-200">
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${channelColors[ticket.channel] || 'bg-gray-100 text-gray-600'}`}>
                <ChannelIcon className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-[#1B2838] mb-1">
                  {ticket.subject || 'No subject'}
                </h2>
                {ticket.excerpt && (
                  <p className="text-sm text-gray-600 line-clamp-2">{ticket.excerpt}</p>
                )}
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-[#1B2838] flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                Messages ({messages.length})
              </h3>
            </div>

            <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
              {messages.length === 0 ? (
                <div className="p-8 text-center">
                  <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No messages found for this ticket</p>
                </div>
              ) : (
                messages.map((message, i) => {
                  const isFromAgent = message.senderEmail?.includes('@') && !message.senderEmail?.includes(ticket.customerEmail || '');
                  const MsgChannelIcon = channelIcons[message.channel] || Mail;

                  return (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.05, 0.5) }}
                      className={`p-5 ${isFromAgent ? 'bg-blue-50/30' : 'bg-white'}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          isFromAgent ? 'bg-blue-100' : 'bg-purple-100'
                        }`}>
                          {isFromAgent ? (
                            <UserCircle className="w-5 h-5 text-blue-600" />
                          ) : (
                            <User className="w-5 h-5 text-purple-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-medium text-[#1B2838]">
                              {message.senderName || message.senderEmail || 'Unknown'}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-xs ${
                              isFromAgent ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                            }`}>
                              {isFromAgent ? 'Agent' : 'Customer'}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-gray-400">
                              <MsgChannelIcon className="w-3 h-3" />
                              {message.channel}
                            </span>
                            <span className="text-xs text-gray-400 ml-auto">
                              {formatTimeAgo(message.gorgiasCreatedAt)}
                            </span>
                          </div>

                          {message.subject && message.subject !== ticket.subject && (
                            <p className="text-sm font-medium text-gray-700 mb-2">
                              Re: {message.subject}
                            </p>
                          )}

                          {/* Message body */}
                          <div className="text-sm text-gray-700 leading-relaxed">
                            {message.bodyText ? (
                              <div className="whitespace-pre-wrap">{message.bodyText}</div>
                            ) : message.bodyHtml ? (
                              <div 
                                className="prose prose-sm max-w-none"
                                dangerouslySetInnerHTML={{ __html: message.bodyHtml }}
                              />
                            ) : (
                              <p className="text-gray-400 italic">No content</p>
                            )}
                          </div>

                          {/* Source info */}
                          {message.source && (
                            <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
                              {message.source.from && (
                                <p>From: {message.source.from.name || message.source.from.address}</p>
                              )}
                              {message.source.to && message.source.to.length > 0 && (
                                <p>To: {message.source.to.map(t => t.name || t.address).join(', ')}</p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Sidebar - Ticket Details */}
        <div className="space-y-4">
          {/* Customer Info */}
          {customer && (
            <div className="bg-white rounded-2xl p-5 border border-gray-200">
              <h3 className="font-semibold text-[#1B2838] mb-4 flex items-center gap-2">
                <User className="w-5 h-5" />
                Customer
              </h3>
              <Link
                href={`/dashboard/customers/${customer.id}`}
                className="block hover:bg-gray-50 -mx-2 px-2 py-2 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
                    <span className="text-white font-semibold">
                      {(customer.firstname?.[0] || customer.email?.[0] || '?').toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[#1B2838] truncate">
                      {customer.name || `${customer.firstname || ''} ${customer.lastname || ''}`.trim() || 'Unknown'}
                    </p>
                    <p className="text-sm text-gray-500 truncate">{customer.email}</p>
                  </div>
                </div>
              </Link>
              {customer.language && (
                <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                  <Globe className="w-4 h-4" />
                  {customer.language.toUpperCase()}
                </div>
              )}
            </div>
          )}

          {/* Ticket Details */}
          <div className="bg-white rounded-2xl p-5 border border-gray-200">
            <h3 className="font-semibold text-[#1B2838] mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Ticket Details
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-500 flex items-center gap-2">
                  <Hash className="w-4 h-4" />
                  Ticket ID
                </span>
                <span className="font-mono text-sm">{ticket.id}</span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-500 flex items-center gap-2">
                  <ChannelIcon className="w-4 h-4" />
                  Channel
                </span>
                <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${channelColors[ticket.channel] || 'bg-gray-100'}`}>
                  {ticket.channel}
                </span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-500 flex items-center gap-2">
                  <StatusIcon className="w-4 h-4" />
                  Status
                </span>
                <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${statusColors[ticket.status]?.bg} ${statusColors[ticket.status]?.text}`}>
                  {ticket.status}
                </span>
              </div>

              {ticket.priority && (
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-500 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Priority
                  </span>
                  <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${priorityColors[ticket.priority]?.bg} ${priorityColors[ticket.priority]?.text}`}>
                    {ticket.priority}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-500 flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" />
                  Messages
                </span>
                <span className="font-medium">{ticket.messagesCount || messages.length}</span>
              </div>

              {ticket.assigneeTeamName && (
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-500 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Team
                  </span>
                  <span className="text-sm">{ticket.assigneeTeamName}</span>
                </div>
              )}

              {ticket.language && (
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-500 flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Language
                  </span>
                  <span className="text-sm uppercase">{ticket.language}</span>
                </div>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-2xl p-5 border border-gray-200">
            <h3 className="font-semibold text-[#1B2838] mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Timeline
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 mt-1.5 rounded-full bg-green-500"></div>
                <div>
                  <p className="text-gray-700">Created</p>
                  <p className="text-xs text-gray-500">{formatDate(ticket.gorgiasCreatedAt)}</p>
                </div>
              </div>

              {ticket.openedDatetime && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 mt-1.5 rounded-full bg-blue-500"></div>
                  <div>
                    <p className="text-gray-700">Opened</p>
                    <p className="text-xs text-gray-500">{formatDate(ticket.openedDatetime)}</p>
                  </div>
                </div>
              )}

              {ticket.lastMessageDatetime && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 mt-1.5 rounded-full bg-purple-500"></div>
                  <div>
                    <p className="text-gray-700">Last Message</p>
                    <p className="text-xs text-gray-500">{formatDate(ticket.lastMessageDatetime)}</p>
                  </div>
                </div>
              )}

              {ticket.closedDatetime && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 mt-1.5 rounded-full bg-gray-500"></div>
                  <div>
                    <p className="text-gray-700">Closed</p>
                    <p className="text-xs text-gray-500">{formatDate(ticket.closedDatetime)}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <div className="w-2 h-2 mt-1.5 rounded-full bg-gray-300"></div>
                <div>
                  <p className="text-gray-700">Last Synced</p>
                  <p className="text-xs text-gray-500">{formatDate(ticket.syncedAt)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* View in Gorgias */}
          <a
            href={`https://${process.env.NEXT_PUBLIC_GORGIAS_DOMAIN || 'app'}.gorgias.com/app/ticket/${ticket.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full p-3 bg-purple-50 text-purple-700 rounded-xl hover:bg-purple-100 transition-colors font-medium"
          >
            <ExternalLink className="w-4 h-4" />
            View in Gorgias
          </a>
        </div>
      </div>
    </>
  );
}
