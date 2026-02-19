'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  X,
  Ticket,
  User,
  MessageSquare,
  ArrowRight,
  Loader2,
  Command,
  Clock,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { useDebounce } from '@/lib/hooks/use-debounce';

interface SearchResult {
  type: 'ticket' | 'customer' | 'conversation';
  id: string | number;
  title: string;
  subtitle: string;
  url: string;
}

export function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Search tickets
  const { data: ticketsData, isFetching: isFetchingTickets } = trpc.gorgiasWarehouse.listTickets.useQuery(
    { search: debouncedQuery, pageSize: 5 },
    { enabled: debouncedQuery.length > 2 }
  );

  // Search customers
  const { data: customersData, isFetching: isFetchingCustomers } = trpc.gorgiasWarehouse.listCustomers.useQuery(
    { search: debouncedQuery, pageSize: 5 },
    { enabled: debouncedQuery.length > 2 }
  );

  // Combine search results
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 3) {
      setResults([]);
      return;
    }

    const combinedResults: SearchResult[] = [];

    // Add tickets
    if (ticketsData?.data) {
      ticketsData.data.forEach(ticket => {
        combinedResults.push({
          type: 'ticket',
          id: ticket.id,
          title: ticket.subject || `Ticket #${ticket.id}`,
          subtitle: `${ticket.customerEmail || 'Unknown'} • ${ticket.status}`,
          url: `/dashboard/orders/${ticket.id}`,
        });
      });
    }

    // Add customers
    if (customersData?.data) {
      customersData.data.forEach(customer => {
        combinedResults.push({
          type: 'customer',
          id: customer.id,
          title: customer.name || `${customer.firstname || ''} ${customer.lastname || ''}`.trim() || customer.email || 'Unknown',
          subtitle: customer.email || 'No email',
          url: `/dashboard/customers/${customer.id}`,
        });
      });
    }

    setResults(combinedResults);
    setSelectedIndex(0);
  }, [ticketsData, customersData, debouncedQuery]);

  // Update searching state
  useEffect(() => {
    setIsSearching(isFetchingTickets || isFetchingCustomers);
  }, [isFetchingTickets, isFetchingCustomers]);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('tellmytale_recent_searches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  // Keyboard shortcut to open search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus input when opening
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Handle navigation
  const handleNavigate = useCallback((result: SearchResult) => {
    // Save to recent searches
    const newRecent = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5);
    setRecentSearches(newRecent);
    localStorage.setItem('tellmytale_recent_searches', JSON.stringify(newRecent));

    router.push(result.url);
    setIsOpen(false);
    setQuery('');
  }, [query, recentSearches, router]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      handleNavigate(results[selectedIndex]);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'ticket': return Ticket;
      case 'customer': return User;
      case 'conversation': return MessageSquare;
      default: return Search;
    }
  };

  return (
    <>
      {/* Search Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors text-sm text-gray-500"
      >
        <Search className="w-4 h-4" />
        <span className="hidden md:inline">Search...</span>
        <kbd className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-white rounded text-xs font-mono border border-gray-200">
          <Command className="w-3 h-3" />K
        </kbd>
      </button>

      {/* Search Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/50 z-50"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-xl bg-white rounded-2xl shadow-2xl z-50 overflow-hidden"
            >
              {/* Search Input */}
              <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-200">
                {isSearching ? (
                  <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                ) : (
                  <Search className="w-5 h-5 text-gray-400" />
                )}
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search tickets, customers..."
                  className="flex-1 text-base outline-none placeholder:text-gray-400"
                />
                {query && (
                  <button onClick={() => setQuery('')} className="p-1 hover:bg-gray-100 rounded">
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-500 hover:bg-gray-200"
                >
                  ESC
                </button>
              </div>

              {/* Results */}
              <div className="max-h-[400px] overflow-y-auto">
                {query.length < 3 ? (
                  <div className="p-4">
                    {recentSearches.length > 0 && (
                      <>
                        <p className="text-xs text-gray-500 uppercase font-medium mb-2">Recent Searches</p>
                        <div className="space-y-1">
                          {recentSearches.map((search, i) => (
                            <button
                              key={i}
                              onClick={() => setQuery(search)}
                              className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-gray-50 rounded-lg transition-colors"
                            >
                              <Clock className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-700">{search}</span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                    {recentSearches.length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-4">
                        Type at least 3 characters to search
                      </p>
                    )}
                  </div>
                ) : results.length > 0 ? (
                  <div className="p-2">
                    {results.map((result, index) => {
                      const Icon = getIcon(result.type);
                      return (
                        <button
                          key={`${result.type}-${result.id}`}
                          onClick={() => handleNavigate(result)}
                          className={`flex items-center gap-3 w-full px-3 py-3 text-left rounded-xl transition-colors ${
                            index === selectedIndex ? 'bg-[#1B2838] text-white' : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className={`p-2 rounded-lg ${
                            index === selectedIndex ? 'bg-white/20' : 'bg-gray-100'
                          }`}>
                            <Icon className={`w-4 h-4 ${index === selectedIndex ? 'text-white' : 'text-gray-500'}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${
                              index === selectedIndex ? 'text-white' : 'text-[#1B2838]'
                            }`}>
                              {result.title}
                            </p>
                            <p className={`text-xs truncate ${
                              index === selectedIndex ? 'text-white/70' : 'text-gray-500'
                            }`}>
                              {result.subtitle}
                            </p>
                          </div>
                          <span className={`text-xs capitalize px-2 py-1 rounded-full ${
                            index === selectedIndex 
                              ? 'bg-white/20 text-white' 
                              : result.type === 'ticket' 
                                ? 'bg-blue-50 text-blue-600'
                                : 'bg-purple-50 text-purple-600'
                          }`}>
                            {result.type}
                          </span>
                          <ArrowRight className={`w-4 h-4 ${
                            index === selectedIndex ? 'text-white' : 'text-gray-300'
                          }`} />
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <Search className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">No results found for &quot;{query}&quot;</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-white rounded border border-gray-200">↑</kbd>
                    <kbd className="px-1.5 py-0.5 bg-white rounded border border-gray-200">↓</kbd>
                    navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-white rounded border border-gray-200">↵</kbd>
                    select
                  </span>
                </div>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-white rounded border border-gray-200">esc</kbd>
                  close
                </span>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
