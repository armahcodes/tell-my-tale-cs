'use client';

import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  MessageSquare,
  Clock,
  CheckCircle,
  Star,
  Users,
  Zap,
  ArrowUpRight,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { Header } from '@/components/dashboard/Header';
import { trpc } from '@/lib/trpc';

export default function AnalyticsPage() {
  const { data, isLoading, refetch, isFetching } = trpc.dashboard.getAnalytics.useQuery(undefined, {
    refetchInterval: 60000, // Refresh every minute
  });

  const weeklyData = data?.weeklyData || [];
  const topQueries = data?.topQueries || [];
  const sentiment = data?.sentiment || { positive: 0, neutral: 0, negative: 0 };
  const stats = data?.stats;

  const maxConversations = Math.max(...weeklyData.map(d => d.conversations), 1);

  // Calculate metrics with fallbacks
  const totalConversations = stats?.totalConversations || 0;
  const aiResolutionRate = stats?.aiResolutionRate || 0;
  const avgResponseTime = stats?.avgResponseTime || '—';
  const csatScore = stats?.csatScore || 0;

  if (isLoading) {
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

      {/* Key Metrics - Responsive Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
        {[
          { label: 'Total Conversations', value: totalConversations.toLocaleString(), change: '+18%', positive: true, icon: MessageSquare },
          { label: 'Resolution Rate', value: `${aiResolutionRate}%`, change: '+5%', positive: true, icon: CheckCircle },
          { label: 'Avg Response Time', value: avgResponseTime, change: 'Fast', positive: true, icon: Clock },
          { label: 'CSAT Score', value: csatScore > 0 ? csatScore.toFixed(1) : '—', change: '+0.2', positive: true, icon: Star },
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
              <span className={`flex items-center gap-0.5 text-[10px] md:text-xs font-semibold ${metric.positive ? 'text-green-600' : 'text-red-500'}`}>
                {metric.positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {metric.change}
              </span>
            </div>
            <p className="text-xl md:text-3xl font-bold text-[#1B2838]">{metric.value}</p>
            <p className="text-[10px] md:text-sm text-gray-500 mt-1">{metric.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Charts Row - Responsive */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
        {/* Weekly Chart */}
        <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-6 border border-gray-200">
          <h3 className="text-sm md:text-lg font-bold text-[#1B2838] mb-4 md:mb-6">Weekly Overview</h3>
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

        {/* Quick Actions */}
        <div className="bg-gray-50 rounded-xl md:rounded-2xl p-4 md:p-6 border border-gray-200">
          <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
            <div className="p-2 md:p-2.5 rounded-lg md:rounded-xl bg-[#1B2838]/10">
              <ArrowUpRight className="w-4 h-4 md:w-5 md:h-5 text-[#1B2838]" />
            </div>
            <h3 className="font-bold text-sm md:text-base text-[#1B2838]">Insights</h3>
          </div>
          <ul className="space-y-2 text-xs md:text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <span className="text-[#1B2838]">•</span>
              Peak hours: 10am-2pm EST
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#1B2838]">•</span>
              Most common: Order status inquiries
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#1B2838]">•</span>
              Avg conversation length: 4 messages
            </li>
          </ul>
        </div>
      </div>
    </>
  );
}
