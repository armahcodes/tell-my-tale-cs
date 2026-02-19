'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  X,
  Check,
  AlertCircle,
  MessageSquare,
  Ticket,
  Users,
  RefreshCw,
  Trash2,
  Loader2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  link?: string;
  icon?: 'ticket' | 'customer' | 'sync' | 'message';
}

const iconMap = {
  ticket: Ticket,
  customer: Users,
  sync: RefreshCw,
  message: MessageSquare,
};

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  // Fetch real data from database
  const { data: statsData, isLoading: statsLoading } = trpc.dashboard.getStats.useQuery(undefined, {
    refetchInterval: 60000, // Refresh every minute
  });
  
  const { data: ticketsData, isLoading: ticketsLoading } = trpc.dashboard.getGorgiasTickets.useQuery(
    { status: 'open', limit: 5 },
    { refetchInterval: 60000 }
  );

  const { data: escalationsData } = trpc.escalations.getByStatus.useQuery(
    { status: 'pending', limit: 5 },
    { refetchInterval: 60000 }
  );

  // Load read state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('tellmytale_read_notifications');
    if (saved) {
      setReadIds(new Set(JSON.parse(saved)));
    }
  }, []);

  // Save read state to localStorage
  const saveReadIds = useCallback((ids: Set<string>) => {
    localStorage.setItem('tellmytale_read_notifications', JSON.stringify([...ids]));
  }, []);

  // Build notifications from real data
  useEffect(() => {
    const newNotifications: Notification[] = [];

    // Add escalations as high priority notifications
    if (escalationsData?.escalations && Array.isArray(escalationsData.escalations)) {
      escalationsData.escalations.forEach((escalation: {
        id: string;
        customerEmail: string;
        reason: string;
        createdAt: string | Date;
        conversationId?: string | null;
      }) => {
        newNotifications.push({
          id: `esc-${escalation.id}`,
          type: 'warning',
          title: 'Pending Escalation',
          message: `${escalation.customerEmail}: ${escalation.reason}`,
          timestamp: new Date(escalation.createdAt),
          read: readIds.has(`esc-${escalation.id}`),
          link: escalation.conversationId ? `/dashboard/conversations/${escalation.conversationId}` : '/dashboard/conversations',
          icon: 'message',
        });
      });
    }

    // Add open tickets that need attention
    if (ticketsData?.tickets) {
      ticketsData.tickets.slice(0, 3).forEach((ticket) => {
        newNotifications.push({
          id: `ticket-${ticket.id}`,
          type: 'info',
          title: `Open Ticket #${ticket.id}`,
          message: ticket.subject || `From ${ticket.customerEmail || 'Unknown'}`,
          timestamp: new Date(ticket.gorgiasCreatedAt),
          read: readIds.has(`ticket-${ticket.id}`),
          link: `/dashboard/orders/${ticket.id}`,
          icon: 'ticket',
        });
      });
    }

    // Add stats-based notifications
    if (statsData) {
      const openTickets = statsData.gorgiasOpenTickets || 0;
      
      if (openTickets > 10) {
        const notifId = `backlog-${new Date().toDateString()}`;
        newNotifications.push({
          id: notifId,
          type: openTickets > 50 ? 'error' : 'warning',
          title: 'Ticket Backlog',
          message: `${openTickets} open tickets need attention`,
          timestamp: new Date(),
          read: readIds.has(notifId),
          link: '/dashboard/orders',
          icon: 'ticket',
        });
      }

      if (statsData.pendingEscalations > 0) {
        const notifId = `pending-esc-${new Date().toDateString()}`;
        if (!newNotifications.some(n => n.id.startsWith('esc-'))) {
          newNotifications.push({
            id: notifId,
            type: 'warning',
            title: 'Pending Escalations',
            message: `${statsData.pendingEscalations} escalation(s) waiting for review`,
            timestamp: new Date(),
            read: readIds.has(notifId),
            link: '/dashboard/conversations',
            icon: 'message',
          });
        }
      }
    }

    // Sort by timestamp (newest first)
    newNotifications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    setNotifications(newNotifications);
  }, [escalationsData, ticketsData, statsData, readIds]);

  const isLoading = statsLoading || ticketsLoading;

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id: string) => {
    const newReadIds = new Set(readIds);
    newReadIds.add(id);
    setReadIds(newReadIds);
    saveReadIds(newReadIds);
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    const newReadIds = new Set(readIds);
    notifications.forEach(n => newReadIds.add(n.id));
    setReadIds(newReadIds);
    saveReadIds(newReadIds);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const dismissNotification = (id: string) => {
    const newReadIds = new Set(readIds);
    newReadIds.add(id);
    setReadIds(newReadIds);
    saveReadIds(newReadIds);
  };

  const clearAllRead = () => {
    const allIds = new Set(notifications.map(n => n.id));
    setReadIds(allIds);
    saveReadIds(allIds);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'success': return 'bg-green-100 text-green-600';
      case 'warning': return 'bg-amber-100 text-amber-600';
      case 'error': return 'bg-red-100 text-red-600';
      default: return 'bg-blue-100 text-blue-600';
    }
  };

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <Bell className="w-5 h-5 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 top-full mt-2 w-80 md:w-96 bg-white rounded-2xl shadow-xl border border-gray-200 z-50 overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                <h3 className="font-bold text-[#1B2838]">Notifications</h3>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Mark all read
                    </button>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              </div>

              {/* Notifications List */}
              <div className="max-h-[400px] overflow-y-auto">
                {isLoading ? (
                  <div className="p-8 text-center">
                    <Loader2 className="w-8 h-8 text-gray-300 mx-auto mb-3 animate-spin" />
                    <p className="text-sm text-gray-500">Loading notifications...</p>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <Bell className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">All caught up!</p>
                    <p className="text-xs text-gray-400 mt-1">No pending items need your attention</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {notifications.map((notification) => {
                      const Icon = notification.icon ? iconMap[notification.icon] : AlertCircle;
                      
                      const content = (
                        <div
                          className={`flex gap-3 p-4 hover:bg-gray-50 transition-colors ${
                            !notification.read ? 'bg-blue-50/50' : ''
                          }`}
                        >
                          <div className={`p-2 rounded-lg flex-shrink-0 ${getTypeColor(notification.type)}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className={`text-sm font-medium ${!notification.read ? 'text-[#1B2838]' : 'text-gray-700'}`}>
                                {notification.title}
                              </p>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  dismissNotification(notification.id);
                                }}
                                className="p-1 hover:bg-gray-200 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Dismiss"
                              >
                                <X className="w-3 h-3 text-gray-400" />
                              </button>
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                              {notification.message}
                            </p>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs text-gray-400">
                                {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                              </span>
                              {!notification.read && (
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    markAsRead(notification.id);
                                  }}
                                  className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                >
                                  <Check className="w-3 h-3" />
                                  Mark read
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );

                      return notification.link ? (
                        <Link
                          key={notification.id}
                          href={notification.link}
                          onClick={() => {
                            markAsRead(notification.id);
                            setIsOpen(false);
                          }}
                          className="block group"
                        >
                          {content}
                        </Link>
                      ) : (
                        <div key={notification.id} className="group">
                          {content}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              {notifications.length > 0 && unreadCount > 0 && (
                <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
                  <button
                    onClick={clearAllRead}
                    className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 mx-auto"
                  >
                    <Check className="w-3 h-3" />
                    Dismiss all notifications
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
