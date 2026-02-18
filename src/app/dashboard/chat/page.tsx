'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Send,
  Sparkles,
  User,
  Loader2,
  RotateCcw,
  Copy,
  Check,
  Package,
  BookOpen,
  HelpCircle,
  MessageSquare,
  Shield,
  Zap,
} from 'lucide-react';
import { Header } from '@/components/dashboard/Header';
import Link from 'next/link';
import { useToast } from '@/components/ui/Toast';
import { useSession } from '@/lib/auth';
import { trpc } from '@/lib/trpc';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const quickPrompts = [
  { icon: Package, label: 'Track Order', prompt: 'Can you look up my recent orders?' },
  { icon: BookOpen, label: 'Product Info', prompt: 'What personalized books do you offer?' },
  { icon: HelpCircle, label: 'Return Policy', prompt: 'What is your return policy?' },
];

export default function ChatTestPage() {
  const { data: session, isPending: isSessionLoading } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [showEmailForm, setShowEmailForm] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { showToast } = useToast();
  
  // Auto-fill user info when session loads
  useEffect(() => {
    if (session?.user) {
      setCustomerEmail(session.user.email || '');
      setCustomerName(session.user.name || '');
      setShowEmailForm(false); // Skip email form for logged-in users
    }
  }, [session]);

  // Fetch user's recent conversations when logged in
  const { data: userConversations, refetch: refetchConversations } = trpc.conversations.getByEmail.useQuery(
    { email: session?.user?.email || '', limit: 5 },
    { enabled: !!session?.user?.email }
  );
  
  // Function to continue an existing conversation
  const continueConversation = async (convId: string) => {
    try {
      const response = await fetch(`/api/conversations?id=${convId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.messages && data.messages.length > 0) {
          setMessages(data.messages.map((m: { id: string; role: string; content: string; createdAt: string }) => ({
            id: m.id,
            role: m.role as 'user' | 'assistant',
            content: m.content,
            timestamp: new Date(m.createdAt),
          })));
          setConversationId(convId);
          setShowEmailForm(false);
          showToast('success', 'Conversation loaded');
        }
      }
    } catch {
      showToast('error', 'Failed to load conversation');
    }
  };

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const startConversation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerEmail.trim()) return;
    setShowEmailForm(false);
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content,
          })),
          conversationId,
          customerEmail: customerEmail || 'test@example.com',
          customerName: customerName || 'Test User',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to send message');
      }

      // Get conversation ID from header if new conversation
      const newConversationId = response.headers.get('X-Conversation-Id');
      if (newConversationId && !conversationId) {
        setConversationId(newConversationId);
        // Refetch user conversations to show new one in sidebar
        if (session?.user?.email) {
          refetchConversations();
        }
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          
          if (chunk) {
            setMessages(prev => 
              prev.map(m => 
                m.id === assistantMessage.id 
                  ? { ...m, content: m.content + chunk }
                  : m
              )
            );
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to get response';
      showToast('error', errorMessage);
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `Error: ${errorMessage}. Please try again.`,
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setConversationId(null);
    setShowEmailForm(true);
    showToast('info', 'Chat cleared');
  };

  const copyMessage = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopied(id);
    showToast('success', 'Message copied to clipboard');
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <>
      <Header 
        title="AI Assistant" 
        subtitle={session?.user ? `Personalized support for ${session.user.name || session.user.email}` : "Chat with our intelligent support assistant"}
        actions={
          <div className="flex items-center gap-2">
            {conversationId && (
              <Link
                href={`/dashboard/conversations/${conversationId}`}
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-white rounded-lg border border-gray-200 text-xs font-medium text-gray-500 hover:bg-gray-50 hover:text-[#1B2838] transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                View in Conversations
              </Link>
            )}
            <button
              onClick={clearChat}
              className="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 md:py-2.5 bg-white rounded-lg md:rounded-xl border border-gray-200 text-xs md:text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-[#1B2838] transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5 md:w-4 md:h-4" />
              <span className="hidden sm:inline">Clear Chat</span>
            </button>
          </div>
        }
      />

      <div className="flex flex-col lg:flex-row gap-4 md:gap-6 h-[calc(100vh-180px)] lg:h-[calc(100vh-200px)]">
        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-white rounded-xl md:rounded-2xl shadow-sm border border-gray-200 overflow-hidden min-h-0">
          {/* Loading State */}
          {isSessionLoading ? (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#1B2838] mx-auto mb-3" />
                <p className="text-sm text-gray-500">Loading...</p>
              </div>
            </div>
          ) : showEmailForm && !session?.user ? (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="max-w-sm w-full">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#1B2838] flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-[#1B2838] mb-2">Start Conversation</h3>
                  <p className="text-sm text-gray-500">
                    Enter your details to start chatting with our AI assistant.
                  </p>
                </div>
                <form onSubmit={startConversation} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#1B2838] mb-1">Email Address</label>
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#1B2838] transition-colors text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#1B2838] mb-1">Name (optional)</label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Your name"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#1B2838] transition-colors text-sm"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3 bg-[#1B2838] text-white rounded-xl font-medium hover:bg-[#2D4A6F] transition-colors"
                  >
                    Start Conversation
                  </button>
                  <div className="text-center">
                    <Link 
                      href="/login" 
                      className="text-sm text-[#1B2838] hover:underline"
                    >
                      Sign in for a personalized experience
                    </Link>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            <>
              {/* User Status Banner */}
              {session?.user ? (
                <div className="px-4 py-2.5 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-emerald-700">
                    <Shield className="w-4 h-4" />
                    <span>Signed in as <strong>{session.user.name || session.user.email}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                    <Zap className="w-3.5 h-3.5" />
                    <span>Personalized Experience</span>
                  </div>
                </div>
              ) : conversationId ? (
                <div className="px-4 py-2 bg-green-50 border-b border-green-100 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-green-700">
                    <Check className="w-4 h-4" />
                    <span>Conversation saved: {customerEmail}</span>
                  </div>
                  <span className="text-xs text-green-600 font-mono">{conversationId.slice(0, 8)}...</span>
                </div>
              ) : null}
              
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 md:space-y-4">
                {messages.length === 0 && (
                  <div className="text-center py-8 md:py-12">
                    <div className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-3 md:mb-4 rounded-full bg-gradient-to-br from-[#1B2838] to-[#2D4A6F] flex items-center justify-center shadow-lg">
                      <Sparkles className="w-8 h-8 md:w-10 md:h-10 text-white" />
                    </div>
                    <h3 className="text-lg md:text-xl font-bold text-[#1B2838] mb-2">
                      {session?.user ? `Hi ${session.user.name?.split(' ')[0] || 'there'}!` : 'How can I help?'}
                    </h3>
                    <p className="text-xs md:text-sm text-gray-500 max-w-md mx-auto px-4">
                      {session?.user 
                        ? "I'm your personal TellMyTale assistant. I can help with orders, products, and any questions you have."
                        : "I'm the TellMyTale AI assistant. Ask me about orders, products, shipping, or anything else!"}
                    </p>
                    {session?.user && (
                      <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 rounded-full text-xs text-emerald-700">
                        <Shield className="w-3 h-3" />
                        <span>Your order history is available</span>
                      </div>
                    )}
                    {/* Mobile Quick Prompts */}
                    <div className="mt-6 lg:hidden space-y-2 px-2">
                      {quickPrompts.map((prompt) => (
                        <button
                          key={prompt.label}
                          onClick={() => sendMessage(prompt.prompt)}
                          disabled={isLoading}
                          className="w-full text-left p-3 rounded-xl border border-gray-200 hover:border-[#1B2838]/30 hover:bg-gray-50 transition-all disabled:opacity-50"
                        >
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-gray-100">
                              <prompt.icon className="w-3.5 h-3.5 text-[#1B2838]" />
                            </div>
                            <span className="text-sm font-medium text-[#1B2838]">{prompt.label}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {message.role === 'assistant' && (
                      <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#1B2838] flex items-center justify-center mr-2 md:mr-3 flex-shrink-0">
                        <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-white" />
                      </div>
                    )}
                    <div className="max-w-[85%] md:max-w-[70%] group">
                      <div
                        className={`px-3 md:px-4 py-2 md:py-3 rounded-2xl ${
                          message.role === 'user'
                            ? 'bg-[#1B2838] text-white rounded-br-md'
                            : 'bg-gray-100 text-[#1B2838] rounded-bl-md'
                        }`}
                      >
                        <p className="text-xs md:text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                      </div>
                      <div className={`flex items-center gap-2 mt-1 ${message.role === 'user' ? 'justify-end' : ''}`}>
                        <span className="text-[10px] md:text-xs text-gray-500">
                          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <button
                          onClick={() => copyMessage(message.id, message.content)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 rounded"
                        >
                          {copied === message.id ? (
                            <Check className="w-3 h-3 text-green-500" />
                          ) : (
                            <Copy className="w-3 h-3 text-gray-500" />
                          )}
                        </button>
                      </div>
                    </div>
                    {message.role === 'user' && (
                      <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gray-200 flex items-center justify-center ml-2 md:ml-3 flex-shrink-0">
                        <User className="w-4 h-4 md:w-5 md:h-5 text-[#1B2838]" />
                      </div>
                    )}
                  </motion.div>
                ))}

                {isLoading && messages[messages.length - 1]?.role === 'user' && (
                  <div className="flex justify-start">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#1B2838] flex items-center justify-center mr-2 md:mr-3">
                      <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-white" />
                    </div>
                    <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 md:px-5 py-3 md:py-4">
                      <div className="flex gap-1.5">
                        <div className="w-2 h-2 bg-[#1B2838] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-[#1B2838] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-[#1B2838] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <form onSubmit={handleSubmit} className="p-3 md:p-4 border-t border-gray-200">
                <div className="flex items-end gap-2 md:gap-3">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a test message..."
                    rows={1}
                    className="flex-1 px-3 md:px-4 py-2.5 md:py-3 rounded-lg md:rounded-xl border border-gray-200 resize-none focus:border-[#1B2838] transition-colors text-sm"
                    style={{ maxHeight: '120px' }}
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    className="p-2.5 md:p-3 rounded-lg md:rounded-xl bg-[#1B2838] text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#2D4A6F]"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 md:w-5 md:h-5" />
                    )}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>

        {/* Quick Prompts Sidebar - Desktop Only */}
        <div className="hidden lg:block w-72 xl:w-80 bg-white rounded-2xl shadow-sm border border-gray-200 p-5 xl:p-6 h-fit">
          <h3 className="font-bold text-[#1B2838] mb-4">Quick Test Prompts</h3>
          <div className="space-y-3">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt.label}
                onClick={() => {
                  if (showEmailForm) {
                    setCustomerEmail('test@example.com');
                    setCustomerName('Test User');
                    setShowEmailForm(false);
                  }
                  setTimeout(() => sendMessage(prompt.prompt), 100);
                }}
                disabled={isLoading}
                className="w-full text-left p-4 rounded-xl border border-gray-200 hover:border-[#1B2838]/30 hover:bg-gray-50 transition-all group disabled:opacity-50"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-gray-100 group-hover:bg-[#1B2838]/10 transition-colors">
                    <prompt.icon className="w-4 h-4 text-[#1B2838]" />
                  </div>
                  <span className="font-medium text-[#1B2838]">{prompt.label}</span>
                </div>
                <p className="text-xs text-gray-500 line-clamp-2">{prompt.prompt}</p>
              </button>
            ))}
          </div>

          <hr className="my-6 border-gray-200" />

          {session?.user ? (
            <>
              <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-100">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  <h4 className="font-medium text-emerald-800">Personalized Mode</h4>
                </div>
                <ul className="text-xs text-emerald-700 space-y-1">
                  <li>• Your orders are automatically available</li>
                  <li>• No need to provide email for lookups</li>
                  <li>• Conversation history is saved</li>
                </ul>
              </div>
              
              {/* Recent Conversations */}
              {userConversations?.conversations && userConversations.conversations.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium text-[#1B2838] mb-3 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Your Recent Chats
                  </h4>
                  <div className="space-y-2">
                    {userConversations.conversations.slice(0, 3).map((conv) => (
                      <button
                        key={conv.id}
                        onClick={() => continueConversation(conv.id)}
                        disabled={conversationId === conv.id}
                        className={`w-full text-left p-3 rounded-lg transition-colors border ${
                          conversationId === conv.id 
                            ? 'bg-[#1B2838]/5 border-[#1B2838]/30' 
                            : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full capitalize ${
                            conv.status === 'resolved' ? 'bg-green-100 text-green-700' :
                            conv.status === 'active' ? 'bg-blue-100 text-blue-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {conv.status}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {new Date(conv.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 truncate">
                          {conv.messageCount} messages
                          {conversationId === conv.id && ' (current)'}
                        </p>
                      </button>
                    ))}
                  </div>
                  <Link
                    href="/dashboard/conversations"
                    className="block mt-3 text-center text-xs text-[#1B2838] hover:underline"
                  >
                    View all conversations →
                  </Link>
                </div>
              )}
            </>
          ) : (
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <h4 className="font-medium text-[#1B2838] mb-2">Pro Tip</h4>
              <p className="text-xs text-gray-500 mb-3">
                Sign in for a personalized experience with automatic order lookup.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#1B2838] hover:underline"
              >
                <Shield className="w-3.5 h-3.5" />
                Sign in now
              </Link>
            </div>
          )}

          {conversationId && (
            <div className="mt-4 p-4 bg-green-50 rounded-xl border border-green-100">
              <h4 className="font-medium text-green-800 mb-1 text-sm">Conversation Saved</h4>
              <p className="text-xs text-green-600 font-mono break-all">{conversationId}</p>
              <Link
                href={`/dashboard/conversations/${conversationId}`}
                className="mt-2 inline-flex items-center gap-1 text-xs text-green-700 hover:underline"
              >
                <MessageSquare className="w-3 h-3" />
                View in conversations
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
