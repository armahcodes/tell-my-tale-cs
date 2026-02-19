'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HelpCircle,
  Book,
  MessageSquare,
  Mail,
  ExternalLink,
  ChevronDown,
  Search,
  Zap,
  Database,
  Users,
  Ticket,
  Settings,
  Bot,
  RefreshCw,
  Shield,
} from 'lucide-react';
import { Header } from '@/components/dashboard/Header';
import Link from 'next/link';

const faqs = [
  {
    question: 'How do I sync data from Gorgias?',
    answer: 'Navigate to the Data Sync page in the sidebar. You can trigger a full sync or sync individual entity types (tickets, customers, tags, agents). The sync process runs in the background and updates your local data warehouse.',
    category: 'sync',
  },
  {
    question: 'How does the AI assistant work?',
    answer: 'The AI assistant uses advanced language models to understand customer queries and provide helpful responses. It can look up orders, answer FAQs, and escalate complex issues to human agents when needed.',
    category: 'ai',
  },
  {
    question: 'Can I customize the AI responses?',
    answer: 'Yes! Go to Settings > Assistant to configure the AI personality, response length, and escalation sensitivity. You can also enable features like emoji usage and auto-translation.',
    category: 'ai',
  },
  {
    question: 'How do I view ticket details?',
    answer: 'Click on any ticket from the Tickets page to view its full details, including all messages, customer information, and timeline. You can also access tickets directly from the customer profile.',
    category: 'tickets',
  },
  {
    question: 'What data is stored in the warehouse?',
    answer: 'The data warehouse stores tickets, customers, messages, agents, and tags from Gorgias. This enables fast queries and analytics without hitting the Gorgias API for every request.',
    category: 'sync',
  },
  {
    question: 'How often should I sync data?',
    answer: 'It depends on your ticket volume. For most businesses, a daily sync is sufficient. High-volume support teams may want to sync more frequently. You can also set up automated syncs via the API.',
    category: 'sync',
  },
  {
    question: 'How do I add team members?',
    answer: 'Go to Settings > Team to invite new team members. You can assign roles (Admin, Agent, Viewer) to control access levels. Invitations are sent via email.',
    category: 'team',
  },
  {
    question: 'What analytics are available?',
    answer: 'The Analytics page shows key metrics including ticket volume, response times, channel breakdown, and team performance. You can also view trends over time and identify top customers.',
    category: 'analytics',
  },
];

const categories = [
  { id: 'all', label: 'All', icon: HelpCircle },
  { id: 'sync', label: 'Data Sync', icon: RefreshCw },
  { id: 'ai', label: 'AI Assistant', icon: Bot },
  { id: 'tickets', label: 'Tickets', icon: Ticket },
  { id: 'team', label: 'Team', icon: Users },
  { id: 'analytics', label: 'Analytics', icon: Database },
];

const quickLinks = [
  { label: 'Dashboard', href: '/dashboard', icon: Zap },
  { label: 'Tickets', href: '/dashboard/orders', icon: Ticket },
  { label: 'Customers', href: '/dashboard/customers', icon: Users },
  { label: 'Analytics', href: '/dashboard/analytics', icon: Database },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
  { label: 'Data Sync', href: '/dashboard/sync', icon: RefreshCw },
];

export default function HelpPage() {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFaqs = faqs.filter(faq => {
    const matchesCategory = activeCategory === 'all' || faq.category === activeCategory;
    const matchesSearch = !searchQuery || 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <>
      <Header 
        title="Help Center" 
        subtitle="Find answers and learn how to use TellMyTale"
      />

      {/* Search */}
      <div className="mb-8">
        <div className="relative max-w-xl mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for help..."
            className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-200 text-base focus:border-[#1B2838] transition-colors"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Category Filters */}
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  activeCategory === category.id
                    ? 'bg-[#1B2838] text-white'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                <category.icon className="w-4 h-4" />
                {category.label}
              </button>
            ))}
          </div>

          {/* FAQs */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-bold text-[#1B2838] flex items-center gap-2">
                <Book className="w-5 h-5" />
                Frequently Asked Questions
              </h3>
            </div>
            <div className="divide-y divide-gray-100">
              {filteredFaqs.length === 0 ? (
                <div className="p-8 text-center">
                  <HelpCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No FAQs found matching your criteria</p>
                </div>
              ) : (
                filteredFaqs.map((faq, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <button
                      onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                    >
                      <span className="font-medium text-[#1B2838] pr-4">{faq.question}</span>
                      <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ${
                        expandedFaq === index ? 'rotate-180' : ''
                      }`} />
                    </button>
                    <AnimatePresence>
                      {expandedFaq === index && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 text-sm text-gray-600 leading-relaxed">
                            {faq.answer}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Links */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="font-bold text-[#1B2838] mb-4">Quick Links</h3>
            <div className="space-y-2">
              {quickLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group"
                >
                  <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-[#1B2838]/10 transition-colors">
                    <link.icon className="w-4 h-4 text-[#1B2838]" />
                  </div>
                  <span className="text-sm font-medium text-[#1B2838]">{link.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Contact Support */}
          <div className="bg-gradient-to-br from-[#1B2838] to-[#2D4A6F] rounded-2xl p-6 text-white">
            <MessageSquare className="w-8 h-8 mb-4" />
            <h3 className="font-bold text-lg mb-2">Need More Help?</h3>
            <p className="text-white/80 text-sm mb-4">
              Our support team is here to help you get the most out of TellMyTale.
            </p>
            <a
              href="mailto:support@tellmytale.com"
              className="flex items-center justify-center gap-2 w-full py-3 bg-white text-[#1B2838] rounded-xl font-medium hover:bg-gray-100 transition-colors"
            >
              <Mail className="w-4 h-4" />
              Contact Support
            </a>
          </div>

          {/* Documentation */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="font-bold text-[#1B2838] mb-4">Resources</h3>
            <div className="space-y-3">
              <a
                href="https://gorgias.com/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-xl border border-gray-200 hover:border-[#1B2838]/30 transition-colors"
              >
                <span className="text-sm font-medium text-[#1B2838]">Gorgias Documentation</span>
                <ExternalLink className="w-4 h-4 text-gray-400" />
              </a>
              <a
                href="https://mastra.ai/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-xl border border-gray-200 hover:border-[#1B2838]/30 transition-colors"
              >
                <span className="text-sm font-medium text-[#1B2838]">Mastra AI Docs</span>
                <ExternalLink className="w-4 h-4 text-gray-400" />
              </a>
              <a
                href="https://better-auth.com/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-xl border border-gray-200 hover:border-[#1B2838]/30 transition-colors"
              >
                <span className="text-sm font-medium text-[#1B2838]">Better Auth Docs</span>
                <ExternalLink className="w-4 h-4 text-gray-400" />
              </a>
            </div>
          </div>

          {/* Keyboard Shortcuts */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="font-bold text-[#1B2838] mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Keyboard Shortcuts
            </h3>
            <div className="space-y-2 text-sm">
              {[
                { keys: ['⌘', 'K'], action: 'Open search' },
                { keys: ['⌘', '/'], action: 'Toggle help' },
                { keys: ['Esc'], action: 'Close modal' },
              ].map((shortcut, i) => (
                <div key={i} className="flex items-center justify-between py-2">
                  <span className="text-gray-600">{shortcut.action}</span>
                  <div className="flex items-center gap-1">
                    {shortcut.keys.map((key, j) => (
                      <kbd key={j} className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">
                        {key}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
