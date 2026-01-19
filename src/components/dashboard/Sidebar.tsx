'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Home,
  MessageSquare,
  Package,
  Users,
  BarChart3,
  Settings,
  LogOut,
  Sparkles,
  Bell,
  X,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';

const navItems = [
  { icon: Home, label: 'Dashboard', href: '/dashboard' },
  { icon: MessageSquare, label: 'Conversations', href: '/dashboard/conversations' },
  { icon: Package, label: 'Orders', href: '/dashboard/orders' },
  { icon: Users, label: 'Customers', href: '/dashboard/customers' },
  { icon: BarChart3, label: 'Analytics', href: '/dashboard/analytics' },
  { icon: Sparkles, label: 'Test Chat', href: '/dashboard/chat' },
  { icon: Settings, label: 'Settings', href: '/dashboard/settings' },
];

interface SidebarProps {
  onClose?: () => void;
}

export function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname();
  
  // Get stats for badge counts
  const { data: stats } = trpc.dashboard.getStats.useQuery(undefined, {
    refetchInterval: 30000,
  });

  const activeNow = stats?.activeNow || 0;
  const aiResolutionRate = stats?.aiResolutionRate || 0;

  return (
    <aside className="w-72 bg-white border-r border-gray-200 flex flex-col h-screen">
      {/* Logo */}
      <div className="p-4 md:p-6 border-b border-gray-200 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center" onClick={onClose}>
          <img 
            src="https://tellmytale.com/cdn/shop/files/TEllmyTale_Logo_wide_1.png?v=1748162308&width=500" 
            alt="TellMyTale"
            className="h-10 md:h-12 w-auto"
          />
        </Link>
        {/* Close button for mobile */}
        <button 
          onClick={onClose}
          className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 md:p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/dashboard' && pathname.startsWith(item.href));
          
          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 md:px-4 py-2.5 md:py-3 rounded-lg transition-all duration-200 ${
                isActive 
                  ? 'bg-[#1B2838] text-white' 
                  : 'text-gray-600 hover:bg-gray-100 hover:text-[#1B2838]'
              }`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-500'}`} />
              <span className="font-medium text-sm md:text-base">{item.label}</span>
              {item.label === 'Conversations' && activeNow > 0 && (
                <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
                  isActive ? 'bg-white/20 text-white' : 'bg-[#1B2838] text-white'
                }`}>
                  {activeNow}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* AI Status Card */}
      <div className="p-3 md:p-4">
        <div className="p-3 md:p-4 rounded-xl bg-gray-50 border border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-[#1B2838] flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" />
            </div>
            <div>
              <span className="text-xs md:text-sm font-semibold text-[#1B2838]">Assistant</span>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] md:text-xs text-green-600">Active</span>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] md:text-xs">
              <span className="text-gray-500">Resolution Rate</span>
              <span className="text-[#1B2838] font-medium">{aiResolutionRate}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5 md:h-2 overflow-hidden">
              <motion.div 
                className="h-full rounded-full bg-[#1B2838]"
                initial={{ width: 0 }}
                animate={{ width: `${aiResolutionRate}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* User & Sign Out */}
      <div className="p-3 md:p-4 border-t border-gray-200">
        <div className="flex items-center gap-3 mb-3 md:mb-4">
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#1B2838] flex items-center justify-center text-white font-semibold text-sm">
            CS
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-xs md:text-sm text-[#1B2838] truncate">CS Manager</p>
            <p className="text-[10px] md:text-xs text-gray-500 truncate">Admin</p>
          </div>
          <button className="p-1.5 md:p-2 rounded-lg hover:bg-gray-100 transition-colors relative">
            <Bell className="w-4 h-4 md:w-5 md:h-5 text-gray-500" />
          </button>
        </div>
        <button className="w-full flex items-center justify-center gap-2 px-3 md:px-4 py-2 md:py-2.5 rounded-lg text-gray-500 hover:text-[#1B2838] hover:bg-gray-100 transition-colors border border-gray-200">
          <LogOut className="w-4 h-4" />
          <span className="text-xs md:text-sm font-medium">Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
