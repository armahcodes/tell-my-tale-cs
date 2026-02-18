'use client';

import { motion } from 'framer-motion';
import {
  MessageSquare,
  Clock,
  CheckCircle,
  Star,
  Users,
  Zap,
  ArrowUpRight,
  Loader2,
  RefreshCw,
  Mail,
  Phone,
  Headphones,
  Database,
  Ticket,
  Tag,
  UserCheck,
  Timer,
  TrendingUp,
  BarChart3,
} from 'lucide-react';
import { Header } from '@/components/dashboard/Header';
import { trpc } from '@/lib/trpc';

export default function AnalyticsPage() {
  const { data, isLoading, refetch, isFetching } = trpc.dashboard.getAnalytics.useQuery(undefined, {
    refetchInterval: 60000,
  });

  const { data: gorgiasAnalytics, isLoading: isGorgiasLoading } = trpc.dashboard.getGorgiasAnalytics.useQuery(undefined, {
    refetchInterval: 60000,
    refetchOnMount: true,
    staleTime: 0,
  });

  const { data: tagsData } = trpc.dashboard.getGorgiasTags.useQuery({ limit: 10 });
  const { data: agentsData } = trpc.dashboard.getGorgiasAgents.useQuery({ limit: 10 });

  const weeklyData = data?.weeklyData || [];
  const topQueries = data?.topQueries || [];
  const sentiment = data?.sentiment || { positive: 0, neutral: 0, negative: 0 };
  const stats = data?.stats;
  
  const tags = tagsData?.tags || [];
  const agents = agentsData?.agents || [];

  const maxConversations = Math.max(...weeklyData.map(d => d.conversations), 1);

  // Calculate metrics with fallbacks
  const totalConversations = stats?.totalConversations || 0;
  const aiResolutionRate = stats?.aiResolutionRate || 0;
  const avgResponseTime = stats?.avgResponseTime || '—';
  const csatScore = stats?.csatScore || 0;

  // Gorgias metrics
  const gorgiasTickets = gorgiasAnalytics?.totalTickets || 0;
  const gorgiasOpenTickets = gorgiasAnalytics?.openTickets || 0;
  const gorgiasCustomers = gorgiasAnalytics?.totalCustomers || 0;
  const gorgiasMessages = gorgiasAnalytics?.totalMessages || 0;
  const gorgiasAgents = gorgiasAnalytics?.totalAgents || 0;
  const gorgiasTags = gorgiasAnalytics?.totalTags || 0;
  const avgResponseTimeSec = gorgiasAnalytics?.avgResponseTimeSec || 0;
  const channelBreakdown = gorgiasAnalytics?.channelBreakdown || {};

  // Format response time
  const formatResponseTime = (seconds: number) => {
    if (!seconds) return '—';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${(seconds / 3600).toFixed(1)}h`;
  };

  // Channel icons
  const channelIcons: Record<string, React.ReactNode> = {
    email: <Mail className="w-4 h-4 text-blue-600" />,
    phone: <Phone className="w-4 h-4 text-green-600" />,
    chat: <MessageSquare className="w-4 h-4 text-purple-600" />,
    helpdesk: <Headphones className="w-4 h-4 text-amber-600" />,
  };

  // Total tickets across all channels
  const totalChannelTickets = Object.values(channelBreakdown).reduce((a, b) => a + b, 0) || 1;

  if (isLoading && isGorgiasLoading) {
    return (
      <>
        <Header title="Analytics" subtitle="Track performance and customer insights" />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#1B2838] mx-auto mb-4" />
            <p className="text-gray-500">Loading analytics...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header 
        title="Analytics" 
        subtitle="Track performance and customer insights"
        actions={
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        }
      />

      {/* Key Metrics - AI Conversations */}
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">AI Conversations</h3>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
        {[
          { label: 'Total Conversations', value: totalConversations.toLocaleString(), subtext: 'All time', icon: MessageSquare },
          { label: 'Resolution Rate', value: `${aiResolutionRate}%`, subtext: aiResolutionRate >= 70 ? 'Good' : 'Needs improvement', positive: aiResolutionRate >= 70, icon: CheckCircle },
          { label: 'Avg Response Time', value: avgResponseTime, subtext: 'Per message', icon: Clock },
          { label: 'CSAT Score', value: csatScore > 0 ? csatScore.toFixed(1) : '—', subtext: csatScore > 0 ? '/5.0' : 'No ratings', icon: Star },
        ].map((metric, i) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white rounded-xl md:rounded-2xl p-3 md:p-5 border border-gray-200"
          >
            <div className="flex items-center justify-between mb-2 md:mb-3">
              <div className="p-2 md:p-2.5 rounded-lg md:rounded-xl bg-gray-50">
                <metric.icon className="w-4 h-4 md:w-5 md:h-5 text-[#1B2838]" />
              </div>
              {metric.subtext && (
                <span className={`text-[10px] md:text-xs font-medium ${metric.positive === false ? 'text-amber-600' : 'text-gray-500'}`}>
                  {metric.subtext}
                </span>
              )}
            </div>
            <p className="text-xl md:text-3xl font-bold text-[#1B2838]">{metric.value}</p>
            <p className="text-[10px] md:text-sm text-gray-500 mt-1">{metric.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Gorgias Data Warehouse Metrics */}
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
        <Database className="w-4 h-4" />
        Gorgias Data Warehouse
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4 mb-6 md:mb-8">
        {[
          { label: 'Total Tickets', value: gorgiasTickets.toLocaleString(), icon: Ticket, color: 'blue' },
          { label: 'Open Tickets', value: gorgiasOpenTickets.toLocaleString(), icon: Clock, color: 'amber' },
          { label: 'Customers', value: gorgiasCustomers.toLocaleString(), icon: Users, color: 'purple' },
          { label: 'Messages', value: gorgiasMessages.toLocaleString(), icon: MessageSquare, color: 'green' },
          { label: 'Agents', value: gorgiasAgents.toLocaleString(), icon: UserCheck, color: 'indigo' },
          { label: 'Tags', value: gorgiasTags.toLocaleString(), icon: Tag, color: 'pink' },
        ].map((metric, i) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.05 }}
            className={`bg-${metric.color}-50 rounded-xl p-3 md:p-4 border border-${metric.color}-100`}
          >
            <div className="flex items-center gap-2 mb-1">
              <metric.icon className={`w-4 h-4 text-${metric.color}-600`} />
              <span className="text-[10px] md:text-xs text-gray-500">{metric.label}</span>
            </div>
            <p className={`text-lg md:text-2xl font-bold text-${metric.color}-700`}>{metric.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Response Time & Channel Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
        {/* Response Time Card */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl md:rounded-2xl p-4 md:p-6 border border-blue-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-blue-500/10">
              <Timer className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="font-bold text-base text-[#1B2838]">Average Response Time</h3>
          </div>
          <div className="text-center py-4">
            <p className="text-4xl md:text-5xl font-bold text-blue-600">{formatResponseTime(avgResponseTimeSec)}</p>
            <p className="text-sm text-gray-500 mt-2">First response time from Gorgias</p>
          </div>
          <div className="mt-4 pt-4 border-t border-blue-200">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Based on</span>
              <span className="font-semibold text-[#1B2838]">{gorgiasTickets.toLocaleString()} tickets</span>
            </div>
          </div>
        </div>

        {/* Channel Breakdown */}
        <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-gray-100">
              <BarChart3 className="w-5 h-5 text-[#1B2838]" />
            </div>
            <h3 className="font-bold text-base text-[#1B2838]">Channel Breakdown</h3>
          </div>
          {Object.keys(channelBreakdown).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(channelBreakdown)
                .sort(([, a], [, b]) => b - a)
                .map(([channel, count]) => {
                  const percentage = Math.round((count / totalChannelTickets) * 100);
                  return (
                    <div key={channel}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="flex items-center gap-2 text-sm font-medium text-[#1B2838] capitalize">
                          {channelIcons[channel] || <Headphones className="w-4 h-4 text-gray-400" />}
                          {channel}
                        </span>
                        <span className="text-xs text-gray-500">{count.toLocaleString()} ({percentage}%)</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ delay: 0.3, duration: 0.5 }}
                          className={`h-full rounded-full ${
                            channel === 'email' ? 'bg-blue-500' :
                            channel === 'phone' ? 'bg-green-500' :
                            channel === 'chat' ? 'bg-purple-500' :
                            'bg-amber-500'
                          }`}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-40 text-gray-500 text-sm">
              No channel data available
            </div>
          )}
        </div>
      </div>

      {/* Tags & Agents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
        {/* Top Tags */}
        <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-pink-50">
              <Tag className="w-5 h-5 text-pink-600" />
            </div>
            <h3 className="font-bold text-base text-[#1B2838]">Top Tags</h3>
          </div>
          {tags.length > 0 ? (
            <div className="space-y-2">
              {tags.slice(0, 8).map((tag, i) => (
                <motion.div
                  key={tag.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.05 }}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50"
                >
                  <span className="flex items-center gap-2">
                    {tag.emoji && <span>{tag.emoji}</span>}
                    <span 
                      className="px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{ 
                        backgroundColor: tag.color ? `${tag.color}20` : '#f3f4f6',
                        color: tag.color || '#374151'
                      }}
                    >
                      {tag.name}
                    </span>
                  </span>
                  <span className="text-xs text-gray-500">{(tag.ticketCount || 0).toLocaleString()} tickets</span>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-40 text-gray-500 text-sm">
              No tags data available
            </div>
          )}
        </div>

        {/* Agents */}
        <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-indigo-50">
              <UserCheck className="w-5 h-5 text-indigo-600" />
            </div>
            <h3 className="font-bold text-base text-[#1B2838]">Support Team</h3>
          </div>
          {agents.length > 0 ? (
            <div className="space-y-2">
              {agents.slice(0, 8).map((agent, i) => (
                <motion.div
                  key={agent.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.05 }}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50"
                >
                  <span className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                      <span className="text-xs font-semibold text-indigo-600">
                        {(agent.firstname?.[0] || '') + (agent.lastname?.[0] || '') || agent.name?.[0] || '?'}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#1B2838]">
                        {agent.name || `${agent.firstname || ''} ${agent.lastname || ''}`.trim() || 'Unknown'}
                      </p>
                      <p className="text-xs text-gray-500">{agent.roleName || 'Agent'}</p>
                    </div>
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${agent.active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {agent.active ? 'Active' : 'Inactive'}
                  </span>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-40 text-gray-500 text-sm">
              No agents data available
            </div>
          )}
        </div>
      </div>

      {/* Charts Row - Responsive */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
        {/* Weekly Chart */}
        <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-6 border border-gray-200">
          <h3 className="text-sm md:text-lg font-bold text-[#1B2838] mb-4 md:mb-6">Weekly AI Conversations</h3>
          {weeklyData.length > 0 ? (
            <>
              <div className="flex items-end justify-between gap-2 md:gap-3 h-32 md:h-48">
                {weeklyData.map((day) => (
                  <div key={day.day} className="flex-1 flex flex-col items-center gap-1 md:gap-2">
                    <div className="w-full relative" style={{ height: `${Math.max((day.conversations / maxConversations) * 100, 10)}%`, minHeight: '20px' }}>
                      <div 
                        className="absolute bottom-0 w-full rounded-t-md md:rounded-t-lg bg-[#1B2838]"
                        style={{ height: day.conversations > 0 ? `${(day.resolved / day.conversations) * 100}%` : '0%' }}
                      />
                      <div 
                        className="absolute bottom-0 w-full rounded-t-md md:rounded-t-lg bg-[#1B2838]/20"
                        style={{ height: '100%' }}
                      />
                    </div>
                    <span className="text-[10px] md:text-xs text-gray-500">{day.day}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-center gap-4 md:gap-6 mt-4 md:mt-6 text-[10px] md:text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-[#1B2838]" />
                  Resolved
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-[#1B2838]/20" />
                  Total
                </span>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-500 text-sm">
              No conversation data yet
            </div>
          )}
        </div>

        {/* Top Queries */}
        <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-6 border border-gray-200">
          <h3 className="text-sm md:text-lg font-bold text-[#1B2838] mb-4 md:mb-6">Top Customer Queries</h3>
          {topQueries.length > 0 ? (
            <div className="space-y-3 md:space-y-4">
              {topQueries.map((item, i) => (
                <div key={item.query}>
                  <div className="flex items-center justify-between mb-1.5 md:mb-2">
                    <span className="text-xs md:text-sm font-medium text-[#1B2838]">{item.query}</span>
                    <span className="text-[10px] md:text-xs text-gray-500">{item.count} queries</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5 md:h-2 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${item.percentage}%` }}
                      transition={{ delay: 0.5 + i * 0.1, duration: 0.5 }}
                      className="h-full rounded-full bg-[#1B2838]"
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-500 text-sm">
              No query data yet
            </div>
          )}
        </div>
      </div>

      {/* Bottom Cards - Responsive */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {/* AI Performance */}
        <div className="bg-green-50 rounded-xl md:rounded-2xl p-4 md:p-6 border border-green-100">
          <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
            <div className="p-2 md:p-2.5 rounded-lg md:rounded-xl bg-green-500/10">
              <Zap className="w-4 h-4 md:w-5 md:h-5 text-green-600" />
            </div>
            <h3 className="font-bold text-sm md:text-base text-[#1B2838]">AI Performance</h3>
          </div>
          <div className="space-y-2 md:space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs md:text-sm text-gray-600">Resolution rate</span>
              <span className="font-semibold text-sm md:text-base text-green-600">{aiResolutionRate}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs md:text-sm text-gray-600">Tool usage success</span>
              <span className="font-semibold text-sm md:text-base text-green-600">98%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs md:text-sm text-gray-600">Proper escalations</span>
              <span className="font-semibold text-sm md:text-base text-green-600">100%</span>
            </div>
          </div>
        </div>

        {/* Customer Sentiment */}
        <div className="bg-blue-50 rounded-xl md:rounded-2xl p-4 md:p-6 border border-blue-100">
          <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
            <div className="p-2 md:p-2.5 rounded-lg md:rounded-xl bg-blue-500/10">
              <Users className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
            </div>
            <h3 className="font-bold text-sm md:text-base text-[#1B2838]">Customer Sentiment</h3>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <div className="flex-1 text-center">
              <p className="text-lg md:text-2xl font-bold text-green-600">{sentiment.positive}%</p>
              <p className="text-[10px] md:text-xs text-gray-500">Positive</p>
            </div>
            <div className="flex-1 text-center">
              <p className="text-lg md:text-2xl font-bold text-gray-400">{sentiment.neutral}%</p>
              <p className="text-[10px] md:text-xs text-gray-500">Neutral</p>
            </div>
            <div className="flex-1 text-center">
              <p className="text-lg md:text-2xl font-bold text-red-500">{sentiment.negative}%</p>
              <p className="text-[10px] md:text-xs text-gray-500">Negative</p>
            </div>
          </div>
        </div>

        {/* Quick Insights */}
        <div className="bg-gray-50 rounded-xl md:rounded-2xl p-4 md:p-6 border border-gray-200">
          <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
            <div className="p-2 md:p-2.5 rounded-lg md:rounded-xl bg-[#1B2838]/10">
              <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-[#1B2838]" />
            </div>
            <h3 className="font-bold text-sm md:text-base text-[#1B2838]">Insights</h3>
          </div>
          <ul className="space-y-2 text-xs md:text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <span className="text-[#1B2838]">•</span>
              {gorgiasTickets > 0 
                ? `${((gorgiasAnalytics?.closedTickets || 0) / gorgiasTickets * 100).toFixed(1)}% ticket resolution rate`
                : 'Peak hours: 10am-2pm EST'}
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#1B2838]">•</span>
              {Object.keys(channelBreakdown).length > 0
                ? `Top channel: ${Object.entries(channelBreakdown).sort(([,a], [,b]) => b - a)[0]?.[0] || 'email'}`
                : 'Most common: Order status inquiries'}
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#1B2838]">•</span>
              {gorgiasCustomers > 0
                ? `${gorgiasCustomers.toLocaleString()} unique customers served`
                : 'Avg conversation length: 4 messages'}
            </li>
          </ul>
        </div>
      </div>
    </>
  );
}
