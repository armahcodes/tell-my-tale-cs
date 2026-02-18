'use client';

import { ExternalLink, Ticket, Clock, User, RefreshCw, AlertCircle } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { formatDistanceToNow } from 'date-fns';

interface GorgiasTicketCardProps {
  ticketId: number;
  ticketUrl?: string;
  localStatus?: string;
  lastSyncedAt?: Date | string | null;
  showRefresh?: boolean;
}

export function GorgiasTicketCard({
  ticketId,
  ticketUrl,
  localStatus,
  lastSyncedAt,
  showRefresh = true,
}: GorgiasTicketCardProps) {
  // Fetch ticket details from Gorgias
  const { data, isLoading, refetch, isRefetching } = trpc.gorgias.getTicket.useQuery(
    { ticketId },
    {
      enabled: !!ticketId,
      staleTime: 30000, // 30 seconds
      refetchOnWindowFocus: false,
    }
  );

  const ticket = data?.ticket;
  const isConfigured = data?.success !== false || data?.error !== 'Gorgias not configured';

  // Status badge styling
  const getStatusStyle = (status?: string) => {
    switch (status) {
      case 'open':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'closed':
        return 'bg-green-50 text-green-700 border-green-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  // Priority badge styling
  const getPriorityStyle = (priority?: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-50 text-red-700';
      case 'high':
        return 'bg-orange-50 text-orange-700';
      case 'normal':
        return 'bg-blue-50 text-blue-700';
      case 'low':
        return 'bg-gray-50 text-gray-600';
      default:
        return 'bg-gray-50 text-gray-600';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-5 animate-pulse">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 bg-gray-200 rounded" />
          <div className="h-5 w-32 bg-gray-200 rounded" />
        </div>
        <div className="space-y-3">
          <div className="h-4 w-24 bg-gray-100 rounded" />
          <div className="h-4 w-full bg-gray-100 rounded" />
          <div className="h-4 w-3/4 bg-gray-100 rounded" />
        </div>
      </div>
    );
  }

  if (!isConfigured) {
    return (
      <div className="bg-amber-50 rounded-2xl border border-amber-200 p-5">
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle className="w-5 h-5 text-amber-600" />
          <h3 className="font-bold text-amber-900">Gorgias Not Configured</h3>
        </div>
        <p className="text-sm text-amber-700">
          Gorgias integration is not configured. Add your Gorgias credentials to enable ticket sync.
        </p>
      </div>
    );
  }

  if (!ticket && localStatus) {
    // Show local status if Gorgias ticket not found
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Ticket className="w-5 h-5 text-[#1B2838]" />
            <h3 className="font-bold text-[#1B2838]">Gorgias Ticket</h3>
          </div>
          {ticketUrl && (
            <a
              href={ticketUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Open in Gorgias"
            >
              <ExternalLink className="w-4 h-4 text-gray-500" />
            </a>
          )}
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Ticket ID:</span>
            <span className="text-sm font-medium text-[#1B2838]">#{ticketId}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Status:</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusStyle(localStatus)} border`}>
              {localStatus}
            </span>
          </div>
          {lastSyncedAt && (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Clock className="w-3 h-3" />
              <span>
                Last synced {formatDistanceToNow(new Date(lastSyncedAt), { addSuffix: true })}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="bg-gray-50 rounded-2xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-2">
          <Ticket className="w-5 h-5 text-gray-400" />
          <h3 className="font-medium text-gray-600">Ticket Not Found</h3>
        </div>
        <p className="text-sm text-gray-500">
          Gorgias ticket #{ticketId} could not be found.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Ticket className="w-5 h-5 text-[#1B2838]" />
          <h3 className="font-bold text-[#1B2838]">Gorgias Ticket</h3>
        </div>
        <div className="flex items-center gap-1">
          {showRefresh && (
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              title="Refresh ticket"
            >
              <RefreshCw className={`w-4 h-4 text-gray-500 ${isRefetching ? 'animate-spin' : ''}`} />
            </button>
          )}
          {ticketUrl && (
            <a
              href={ticketUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Open in Gorgias"
            >
              <ExternalLink className="w-4 h-4 text-gray-500" />
            </a>
          )}
        </div>
      </div>

      {/* Ticket Info */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Ticket ID:</span>
          <span className="text-sm font-medium text-[#1B2838]">#{ticket.id}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Status:</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusStyle(ticket.status)} border`}>
            {ticket.status}
          </span>
        </div>

        {ticket.priority && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Priority:</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityStyle(ticket.priority)}`}>
              {ticket.priority}
            </span>
          </div>
        )}

        {ticket.subject && (
          <div>
            <span className="text-sm text-gray-500">Subject:</span>
            <p className="text-sm font-medium text-[#1B2838] mt-0.5 line-clamp-2">
              {ticket.subject}
            </p>
          </div>
        )}

        {ticket.assignee_user && (
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-[#1B2838]">
              {ticket.assignee_user.name || ticket.assignee_user.email}
            </span>
          </div>
        )}

        {ticket.messages_count !== undefined && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>{ticket.messages_count} messages</span>
          </div>
        )}

        {ticket.created_datetime && (
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Clock className="w-3 h-3" />
            <span>
              Created {formatDistanceToNow(new Date(ticket.created_datetime), { addSuffix: true })}
            </span>
          </div>
        )}
      </div>

      {/* Open in Gorgias Button */}
      {ticketUrl && (
        <a
          href={ticketUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 w-full flex items-center justify-center gap-2 p-3 bg-[#1B2838] text-white rounded-xl font-medium hover:bg-[#2D4A6F] transition-colors text-sm"
        >
          <ExternalLink className="w-4 h-4" />
          Open in Gorgias
        </a>
      )}
    </div>
  );
}

/**
 * Compact version for list views
 */
export function GorgiasTicketBadge({
  ticketId,
  ticketUrl,
  status,
}: {
  ticketId: number;
  ticketUrl?: string;
  status?: string;
}) {
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'open':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'closed':
        return 'bg-green-50 text-green-700 border-green-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <a
      href={ticketUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(status)} hover:opacity-80 transition-opacity`}
      title="View in Gorgias"
    >
      <Ticket className="w-3 h-3" />
      <span>#{ticketId}</span>
      <ExternalLink className="w-3 h-3" />
    </a>
  );
}
