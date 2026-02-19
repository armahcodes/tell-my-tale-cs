'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  RefreshCw,
  Database,
  Users,
  Tag,
  Ticket,
  MessageSquare,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Loader2,
  Zap,
  Calendar,
} from 'lucide-react';
import { Header } from '@/components/dashboard/Header';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/components/ui/Toast';
import { formatDistanceToNow, format } from 'date-fns';

const entityTypes = [
  { id: 'users', label: 'Agents', icon: Users, color: 'indigo' },
  { id: 'tags', label: 'Tags', icon: Tag, color: 'pink' },
  { id: 'customers', label: 'Customers', icon: Users, color: 'purple' },
  { id: 'tickets', label: 'Tickets', icon: Ticket, color: 'blue' },
] as const;

export default function SyncManagementPage() {
  const { showToast } = useToast();
  const [isSyncing, setIsSyncing] = useState<string | null>(null);

  // Fetch warehouse status
  const { data: statusData, isLoading: isStatusLoading, refetch: refetchStatus } = trpc.gorgiasWarehouse.status.useQuery(undefined, {
    refetchInterval: 10000,
  });

  // Full sync mutation
  const fullSyncMutation = trpc.gorgiasWarehouse.fullSync.useMutation({
    onSuccess: (data) => {
      setIsSyncing(null);
      refetchStatus();
      if (data.success) {
        showToast('success', 'Full sync completed successfully');
      } else {
        showToast('error', 'Some sync operations failed');
      }
    },
    onError: (error) => {
      setIsSyncing(null);
      showToast('error', error.message);
    },
  });

  // Entity sync mutation
  const entitySyncMutation = trpc.gorgiasWarehouse.syncEntity.useMutation({
    onSuccess: () => {
      setIsSyncing(null);
      refetchStatus();
      showToast('success', 'Sync completed');
    },
    onError: (error) => {
      setIsSyncing(null);
      showToast('error', error.message);
    },
  });

  const handleFullSync = () => {
    setIsSyncing('full');
    fullSyncMutation.mutate();
  };

  const handleEntitySync = (entityType: 'users' | 'tags' | 'customers' | 'tickets') => {
    setIsSyncing(entityType);
    entitySyncMutation.mutate({ entityType });
  };

  const stats = statusData?.stats;
  const syncStatus = statusData?.syncStatus || [];

  if (isStatusLoading) {
    return (
      <>
        <Header title="Data Sync" subtitle="Manage Gorgias data warehouse synchronization" />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#1B2838] mx-auto mb-4" />
            <p className="text-gray-500">Loading sync status...</p>
          </div>
        </div>
      </>
    );
  }

  if (!statusData?.configured) {
    return (
      <>
        <Header title="Data Sync" subtitle="Manage Gorgias data warehouse synchronization" />
        <div className="bg-amber-50 rounded-2xl p-8 border border-amber-200 text-center">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-amber-900 mb-2">Gorgias Not Configured</h3>
          <p className="text-amber-700 mb-4">
            Please configure your Gorgias credentials to enable data synchronization.
          </p>
          <div className="bg-amber-100 rounded-xl p-4 text-left max-w-md mx-auto">
            <p className="text-sm font-medium text-amber-900 mb-2">Required environment variables:</p>
            <ul className="text-sm text-amber-800 font-mono space-y-1">
              <li>GORGIAS_DOMAIN</li>
              <li>GORGIAS_EMAIL</li>
              <li>GORGIAS_API_KEY</li>
            </ul>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header 
        title="Data Sync" 
        subtitle="Manage Gorgias data warehouse synchronization"
        actions={
          <button
            onClick={handleFullSync}
            disabled={isSyncing !== null}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#1B2838] text-white rounded-xl font-medium hover:bg-[#2D4A6F] transition-colors disabled:opacity-50"
          >
            {isSyncing === 'full' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
            Full Sync
          </button>
        }
      />

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 md:gap-4 mb-6">
        {[
          { label: 'Tickets', value: stats?.totalTickets || 0, icon: Ticket, color: 'bg-blue-50 border-blue-100 text-blue-700' },
          { label: 'Open', value: stats?.openTickets || 0, icon: Clock, color: 'bg-amber-50 border-amber-100 text-amber-700' },
          { label: 'Closed', value: stats?.closedTickets || 0, icon: CheckCircle, color: 'bg-green-50 border-green-100 text-green-700' },
          { label: 'Customers', value: stats?.totalCustomers || 0, icon: Users, color: 'bg-purple-50 border-purple-100 text-purple-700' },
          { label: 'Messages', value: stats?.totalMessages || 0, icon: MessageSquare, color: 'bg-emerald-50 border-emerald-100 text-emerald-700' },
          { label: 'Agents', value: stats?.totalUsers || 0, icon: Users, color: 'bg-indigo-50 border-indigo-100 text-indigo-700' },
          { label: 'Tags', value: stats?.totalTags || 0, icon: Tag, color: 'bg-pink-50 border-pink-100 text-pink-700' },
        ].map((stat) => (
          <div key={stat.label} className={`rounded-xl p-3 md:p-4 border ${stat.color}`}>
            <div className="flex items-center gap-2 mb-1">
              <stat.icon className="w-4 h-4" />
              <span className="text-xs opacity-80">{stat.label}</span>
            </div>
            <p className="text-lg md:text-2xl font-bold">
              {stat.value.toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sync Controls */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h3 className="font-bold text-[#1B2838] mb-4 flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Sync Controls
          </h3>
          <div className="space-y-3">
            {entityTypes.map((entity) => {
              const syncInfo = syncStatus.find(s => s.entityType === entity.id);
              const lastSynced = syncInfo?.lastSyncedAt;
              const totalSynced = syncInfo?.totalSynced || 0;

              return (
                <div 
                  key={entity.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-${entity.color}-100`}>
                      <entity.icon className={`w-5 h-5 text-${entity.color}-600`} />
                    </div>
                    <div>
                      <p className="font-medium text-[#1B2838]">{entity.label}</p>
                      <p className="text-xs text-gray-500">
                        {Number(totalSynced).toLocaleString()} records
                        {lastSynced && (
                          <> • Last synced {formatDistanceToNow(new Date(lastSynced), { addSuffix: true })}</>
                        )}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleEntitySync(entity.id)}
                    disabled={isSyncing !== null}
                    className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors disabled:opacity-50"
                  >
                    {isSyncing === entity.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    Sync
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sync Status */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h3 className="font-bold text-[#1B2838] mb-4 flex items-center gap-2">
            <Database className="w-5 h-5" />
            Sync Status
          </h3>
          {syncStatus.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Database className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">No sync data available</p>
              <p className="text-xs text-gray-400 mt-1">Run a sync to see status</p>
            </div>
          ) : (
            <div className="space-y-3">
              {syncStatus.map((cursor) => {
                const entity = entityTypes.find(e => e.id === cursor.entityType);
                const Icon = entity?.icon || Database;
                
                return (
                  <div 
                    key={cursor.entityType}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
                  >
                    <div className="p-2 rounded-lg bg-green-100">
                      <Icon className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-[#1B2838] capitalize">{cursor.entityType}</p>
                        <span className="text-xs text-gray-500">
                          {Number(cursor.totalSynced || 0).toLocaleString()} synced
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        {cursor.lastSyncedAt 
                          ? format(new Date(cursor.lastSyncedAt), 'MMM d, h:mm a')
                          : 'Never synced'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Last Sync Times */}
      <div className="mt-6 bg-white rounded-2xl border border-gray-200 p-5">
        <h3 className="font-bold text-[#1B2838] mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Last Sync Times
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {entityTypes.map((entity) => {
            const syncInfo = syncStatus.find(s => s.entityType === entity.id);
            const lastSynced = syncInfo?.lastSyncedAt;

            return (
              <div key={entity.id} className="text-center p-4 bg-gray-50 rounded-xl">
                <entity.icon className={`w-8 h-8 text-${entity.color}-500 mx-auto mb-2`} />
                <p className="font-medium text-[#1B2838] text-sm">{entity.label}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {lastSynced 
                    ? format(new Date(lastSynced), 'MMM d, h:mm a')
                    : 'Never synced'}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Info Card */}
      <div className="mt-6 bg-blue-50 rounded-2xl border border-blue-100 p-5">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900 mb-1">About Data Sync</h4>
            <p className="text-sm text-blue-700">
              Syncing pulls the latest data from Gorgias into your local data warehouse. 
              This enables fast queries and analytics without hitting the Gorgias API directly.
              For large accounts, a full sync may take several minutes.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
