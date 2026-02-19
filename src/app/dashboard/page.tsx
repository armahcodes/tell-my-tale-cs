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
  Ticket,
  Mail,
  Phone,
  Headphones,
  ExternalLink,
  RefreshCw,
  Timer,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Header } from '@/components/dashboard/Header';

const channelIcons: Record<string, React.ReactNode> = {
  email: <Mail className="w-4 h-4" />,
  phone: <Phone className="w-4 h-4" />,
  chat: <MessageSquare className="w-4 h-4" />,
  helpdesk: <Headphones className="w-4 h-4" />,
};

export default function DashboardPage() {
  // Gorgias data warehouse stats
  const { data: statsData, refetch: refetchStats, isLoading: isStatsLoading, isFetching } = trpc.dashboard.getStats.useQuery(
    undefined,
    { 
      refetchInterval: 30000,
      refetchOnMount: true,
      refetchOnWindowFocus: true,
      staleTime: 0,
    }
  );

  // Recent tickets from Gorgias
  const { data: ticketsData, refetch: refetchTickets } = trpc.dashboard.getGorgiasTickets.useQuery({
    status: 'all',
    limit: 5,
  }, {
    refetchOnMount: true,
    staleTime: 0,
  });

  // Recent customers from Gorgias
  const { data: customersData, refetch: refetchCustomers } = trpc.dashboard.getGorgiasCustomers.useQuery({
    limit: 5,
  }, {
    refetchOnMount: true,
    staleTime: 0,
  });

  const stats = statsData || {
    gorgiasTickets: 0,
    gorgiasOpenTickets: 0,
    gorgiasClosedTickets: 0,
    gorgiasCustomers: 0,
    gorgiasMessages: 0,
    gorgiasAgents: 0,
    gorgiasTicketsToday: 0,
    gorgiasAvgResponseSec: null as number | null,
    gorgiasChannels: {} as Record<string, number>,
  };

  const tickets = ticketsData?.tickets || [];
  const customers = customersData?.customers || [];

  const handleRefresh = async () => {
    await Promise.all([refetchStats(), refetchTickets(), refetchCustomers()]);
  };

  const formatResponseTime = (seconds: number | null) => {
    if (!seconds) return '—';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${(seconds / 3600).toFixed(1)}h`;
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
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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

  // Calculate resolution rate
  const resolutionRate = stats.gorgiasTickets > 0 
    ? Math.round((stats.gorgiasClosedTickets / stats.gorgiasTickets) * 100) 
    : 0;

  return (
    <>
      <Header 
        title="Dashboard" 
        subtitle="Support metrics from Gorgias data warehouse"
        onRefresh={handleRefresh}
      />

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5 mb-6 md:mb-8">
        {[
          {
            icon: Ticket,
            label: 'Total Tickets',
            value: stats.gorgiasTickets.toLocaleString(),
            subtext: stats.gorgiasTicketsToday > 0 ? `+${stats.gorgiasTicketsToday} today` : undefined,
            color: 'purple',
          },
          {
            icon: AlertCircle,
            label: 'Open Tickets',
            value: stats.gorgiasOpenTickets.toLocaleString(),
            live: stats.gorgiasOpenTickets > 0,
            color: 'amber',
          },
          {
            icon: Users,
            label: 'Customers',
            value: stats.gorgiasCustomers.toLocaleString(),
            color: 'blue',
          },
          {
            icon: Timer,
            label: 'Avg Response',
            value: formatResponseTime(stats.gorgiasAvgResponseSec),
            subtext: stats.gorgiasMessages > 0 ? `${stats.gorgiasMessages.toLocaleString()} messages` : undefined,
            color: 'teal',
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
              <div className={`p-2 md:p-3 rounded-lg md:rounded-xl bg-${stat.color}-50`}>
                <stat.icon className={`w-4 h-4 md:w-5 md:h-5 text-${stat.color}-600`} />
              </div>
              {stat.subtext && (
                <span className="hidden sm:flex items-center gap-1 text-[10px] md:text-xs font-medium text-gray-500">
                  {stat.subtext}
                </span>
              )}
              {stat.live && (
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-[10px] md:text-xs font-medium text-amber-600">Active</span>
                </div>
              )}
            </div>
            <div className="flex items-baseline gap-1">
              <p className="text-xl md:text-3xl font-bold text-[#1B2838]">{stat.value}</p>
            </div>
            <p className="text-xs md:text-sm text-gray-500 mt-1">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Performance & Channels Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
        {/* Resolution Stats */}
        <div className="lg:col-span-2 bg-white rounded-xl md:rounded-2xl p-4 md:p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <h3 className="text-base md:text-lg font-bold text-[#1B2838]">Ticket Resolution</h3>
            <span className="text-xs md:text-sm text-gray-500">All time</span>
          </div>
          <div className="grid grid-cols-3 gap-2 md:gap-4">
            <div className="text-center p-3 md:p-5 rounded-xl md:rounded-2xl bg-green-50 border border-green-100">
              <div className="w-10 h-10 md:w-14 md:h-14 mx-auto rounded-full bg-white shadow-sm flex items-center justify-center mb-2 md:mb-3">
                <CheckCircle className="w-5 h-5 md:w-7 md:h-7 text-green-600" />
              </div>
              <p className="text-lg md:text-3xl font-bold text-green-700">{resolutionRate}%</p>
              <p className="text-[10px] md:text-sm text-gray-600 mt-1">Resolution Rate</p>
            </div>
            <div className="text-center p-3 md:p-5 rounded-xl md:rounded-2xl bg-green-50 border border-green-100">
              <div className="w-10 h-10 md:w-14 md:h-14 mx-auto rounded-full bg-white shadow-sm flex items-center justify-center mb-2 md:mb-3">
                <Ticket className="w-5 h-5 md:w-7 md:h-7 text-green-600" />
              </div>
              <p className="text-lg md:text-3xl font-bold text-green-700">{stats.gorgiasClosedTickets.toLocaleString()}</p>
              <p className="text-[10px] md:text-sm text-gray-600 mt-1">Closed</p>
            </div>
            <div className="text-center p-3 md:p-5 rounded-xl md:rounded-2xl bg-amber-50 border border-amber-100">
              <div className="w-10 h-10 md:w-14 md:h-14 mx-auto rounded-full bg-white shadow-sm flex items-center justify-center mb-2 md:mb-3">
                <Clock className="w-5 h-5 md:w-7 md:h-7 text-amber-600" />
              </div>
              <p className="text-lg md:text-3xl font-bold text-amber-700">{stats.gorgiasOpenTickets.toLocaleString()}</p>
              <p className="text-[10px] md:text-sm text-gray-600 mt-1">Open</p>
            </div>
          </div>
        </div>

        {/* Channel Breakdown */}
        <div className="bg-[#1B2838] rounded-xl md:rounded-2xl p-4 md:p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-4 md:mb-5">
            <h3 className="text-base md:text-lg font-bold">Channels</h3>
            <Mail className="w-4 h-4 md:w-5 md:h-5 text-white/60" />
          </div>
          {Object.keys(stats.gorgiasChannels).length > 0 ? (
            <div className="space-y-2 md:space-y-3">
              {Object.entries(stats.gorgiasChannels)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 4)
                .map(([channel, count]) => {
                  const total = Object.values(stats.gorgiasChannels).reduce((a, b) => a + b, 0);
                  const percentage = Math.round((count / total) * 100);
                  return (
                    <div key={channel} className="p-3 md:p-4 bg-white/10 rounded-lg md:rounded-xl">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs md:text-sm font-medium text-white/70 capitalize flex items-center gap-2">
                          {channelIcons[channel] || <MessageSquare className="w-4 h-4" />}
                          {channel}
                        </span>
                        <span className="text-sm md:text-lg font-bold">{count}</span>
                      </div>
                      <div className="w-full bg-white/20 rounded-full h-1.5">
                        <div 
                          className="bg-white h-1.5 rounded-full transition-all" 
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="text-center py-6 text-white/60 text-sm">
              No channel data yet
            </div>
          )}
        </div>
      </div>

      {/* Recent Tickets & Customers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
        {/* Recent Tickets */}
        <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base md:text-lg font-bold text-[#1B2838]">Recent Tickets</h3>
            <Link href="/dashboard/orders" className="text-xs md:text-sm text-[#1B2838] hover:underline font-medium">
              View all →
            </Link>
          </div>
          {tickets.length > 0 ? (
            <div className="space-y-3">
              {tickets.map((ticket) => (
                <a
                  key={ticket.id}
                  href={`https://${process.env.NEXT_PUBLIC_GORGIAS_DOMAIN || 'tellmytale'}.gorgias.com/app/ticket/${ticket.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors group"
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    ticket.channel === 'email' ? 'bg-blue-50 text-blue-600' :
                    ticket.channel === 'chat' ? 'bg-purple-50 text-purple-600' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    {channelIcons[ticket.channel || 'email'] || <Headphones className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-[#1B2838] truncate">{ticket.subject || 'No subject'}</p>
                    <p className="text-xs text-gray-500 truncate">{ticket.customerName || ticket.customerEmail}</p>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full capitalize ${
                        ticket.status === 'closed' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {ticket.status}
                      </span>
                      <p className="text-[10px] text-gray-400 mt-1">{formatTimeAgo(ticket.gorgiasCreatedAt)}</p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 text-sm">
              <Ticket className="w-10 h-10 mx-auto mb-2 text-gray-300" />
              No tickets synced yet
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
          {customers.length > 0 ? (
            <div className="space-y-3">
              {customers.map((customer) => (
                <a
                  key={customer.id}
                  href={`https://${process.env.NEXT_PUBLIC_GORGIAS_DOMAIN || 'tellmytale'}.gorgias.com/app/customers/${customer.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors group"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center flex-shrink-0 text-white font-semibold text-sm">
                    {getInitials(customer.firstname, customer.lastname, customer.name, customer.email)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-[#1B2838]">
                      {customer.name || customer.firstname || customer.lastname 
                        ? customer.name || `${customer.firstname || ''} ${customer.lastname || ''}`.trim()
                        : customer.email || 'Unknown'}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{customer.email}</p>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <div>
                      {(customer.ticketCount || 0) > 0 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">
                          {customer.ticketCount} tickets
                        </span>
                      )}
                      {(customer.openTicketCount || 0) > 0 && (
                        <p className="text-[10px] text-amber-600 mt-1">{customer.openTicketCount} open</p>
                      )}
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 text-sm">
              <Users className="w-10 h-10 mx-auto mb-2 text-gray-300" />
              No customers synced yet
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {[
          { label: 'Tickets', href: '/dashboard/orders', icon: Ticket },
          { label: 'Customers', href: '/dashboard/customers', icon: Users },
          { label: 'Analytics', href: '/dashboard/analytics', icon: TrendingUp },
          { label: 'Conversations', href: '/dashboard/conversations', icon: MessageSquare },
        ].map((action) => (
          <Link
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
          </Link>
        ))}
      </div>

      {/* Empty State - Show if no Gorgias data */}
      {!isStatsLoading && stats.gorgiasTickets === 0 && (
        <div className="mt-8 bg-gradient-to-br from-gray-50 to-slate-50 rounded-2xl p-6 md:p-8 border border-gray-200 text-center">
          <Ticket className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-bold text-[#1B2838] mb-2">No Gorgias Data Yet</h3>
          <p className="text-sm text-gray-600 mb-4 max-w-md mx-auto">
            Sync your Gorgias tickets, customers, and messages to see your support metrics here.
          </p>
          <code className="block bg-gray-100 p-3 rounded-lg text-xs text-gray-700 font-mono max-w-md mx-auto">
            npx ts-node scripts/sync-warehouse.ts
          </code>
        </div>
      )}
    </>
  );
}
