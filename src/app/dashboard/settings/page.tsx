'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  Bell,
  Link2,
  Users,
  Save,
  Check,
  X,
  Plus,
  Mail,
  ExternalLink,
  RefreshCw,
  Shield,
  Trash2,
  Ticket,
} from 'lucide-react';
import { Header } from '@/components/dashboard/Header';
import { useToast } from '@/components/ui/Toast';
import { trpc } from '@/lib/trpc';

const tabs = [
  { id: 'ai', label: 'Assistant', icon: Bot },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'integrations', label: 'Integrations', icon: Link2 },
  { id: 'team', label: 'Team', icon: Users },
];

// Settings types
interface AISettings {
  personality: 'friendly' | 'professional' | 'casual';
  responseLength: 'concise' | 'balanced' | 'detailed';
  escalationSensitivity: number;
  useEmojis: boolean;
  proactiveFollowups: boolean;
  autoTranslate: boolean;
}

interface NotificationSettings {
  escalationAlerts: { email: boolean; push: boolean };
  dailySummary: { email: boolean; push: boolean };
  negativeSentiment: { email: boolean; push: boolean };
  newConversation: { email: boolean; push: boolean };
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Agent' | 'Viewer';
}

// Default settings
const defaultAISettings: AISettings = {
  personality: 'friendly',
  responseLength: 'balanced',
  escalationSensitivity: 3,
  useEmojis: false,
  proactiveFollowups: true,
  autoTranslate: false,
};

const defaultNotificationSettings: NotificationSettings = {
  escalationAlerts: { email: true, push: true },
  dailySummary: { email: true, push: false },
  negativeSentiment: { email: false, push: true },
  newConversation: { email: false, push: false },
};

const defaultTeamMembers: TeamMember[] = [];

function IntegrationsTab() {
  // Query Gorgias status
  const { data: gorgiasStatus } = trpc.gorgias.status.useQuery();
  
  const integrations = [
    { 
      name: 'Shopify', 
      description: 'E-commerce platform for orders and customers', 
      connected: true,
      url: 'https://admin.shopify.com',
      icon: Shield,
    },
    { 
      name: 'Gorgias', 
      description: 'Helpdesk platform for ticket management and escalations', 
      connected: gorgiasStatus?.configured || false,
      url: 'https://tailoredcanvases.gorgias.com',
      icon: Ticket,
    },
    { 
      name: 'Neon Database', 
      description: 'PostgreSQL database for conversations and analytics', 
      connected: true,
      url: 'https://console.neon.tech',
      icon: Shield,
    },
    { 
      name: 'OpenAI', 
      description: 'AI language model for customer interactions', 
      connected: true,
      url: 'https://platform.openai.com',
      icon: Shield,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6 md:space-y-8"
    >
      <div>
        <h3 className="text-base md:text-lg font-bold text-[#1B2838] mb-1">Integrations</h3>
        <p className="text-xs md:text-sm text-gray-500">Connect your tools and services</p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:gap-4">
        {integrations.map((integration) => (
          <div 
            key={integration.name}
            className="p-4 md:p-5 rounded-lg md:rounded-xl border border-gray-200 hover:border-[#1B2838]/20 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  integration.connected ? 'bg-[#1B2838]/5' : 'bg-amber-50'
                }`}>
                  <integration.icon className={`w-5 h-5 ${
                    integration.connected ? 'text-[#1B2838]' : 'text-amber-600'
                  }`} />
                </div>
                <div>
                  <p className="text-xs md:text-sm font-semibold text-[#1B2838]">{integration.name}</p>
                  <p className="text-[10px] md:text-xs text-gray-500">{integration.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 md:px-2.5 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs font-medium ${
                  integration.connected 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {integration.connected ? 'Connected' : 'Not Configured'}
                </span>
                <a
                  href={integration.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ExternalLink className="w-4 h-4 text-gray-400" />
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>

      {!gorgiasStatus?.configured && (
        <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
          <div className="flex items-start gap-3">
            <Ticket className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-900">Gorgias Not Configured</p>
              <p className="text-xs text-amber-700 mt-1">
                Add the following environment variables to enable Gorgias integration:
              </p>
              <ul className="text-xs text-amber-700 mt-2 space-y-1 font-mono">
                <li>GORGIAS_DOMAIN</li>
                <li>GORGIAS_EMAIL</li>
                <li>GORGIAS_API_KEY</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
        <p className="text-sm text-gray-600">
          Need help with integrations? Contact support for assistance.
        </p>
      </div>
    </motion.div>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('ai');
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const { showToast } = useToast();

  // State management
  const [aiSettings, setAISettings] = useState<AISettings>(defaultAISettings);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(defaultNotificationSettings);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(defaultTeamMembers);

  // Modal states
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<'Admin' | 'Agent' | 'Viewer'>('Agent');

  // Load settings from localStorage
  useEffect(() => {
    const savedAI = localStorage.getItem('tellmytale_ai_settings');
    const savedNotifications = localStorage.getItem('tellmytale_notification_settings');
    const savedTeam = localStorage.getItem('tellmytale_team_members');

    if (savedAI) setAISettings(JSON.parse(savedAI));
    if (savedNotifications) setNotificationSettings(JSON.parse(savedNotifications));
    if (savedTeam) setTeamMembers(JSON.parse(savedTeam));
  }, []);

  // Track changes
  const markChanged = () => setHasChanges(true);

  const handleSave = async () => {
    setSaving(true);
    
    // Save to localStorage
    localStorage.setItem('tellmytale_ai_settings', JSON.stringify(aiSettings));
    localStorage.setItem('tellmytale_notification_settings', JSON.stringify(notificationSettings));
    localStorage.setItem('tellmytale_team_members', JSON.stringify(teamMembers));

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setSaving(false);
    setHasChanges(false);
    showToast('success', 'Settings saved successfully');
  };

  const handleInvite = () => {
    if (!inviteEmail || !inviteName) {
      showToast('error', 'Please fill in all fields');
      return;
    }

    const newMember: TeamMember = {
      id: Date.now().toString(),
      name: inviteName,
      email: inviteEmail,
      role: inviteRole,
    };

    setTeamMembers(prev => [...prev, newMember]);
    setShowInviteModal(false);
    setInviteEmail('');
    setInviteName('');
    setInviteRole('Agent');
    markChanged();
    showToast('success', `Invitation sent to ${inviteEmail}`);
  };

  const handleRemoveMember = (id: string) => {
    setTeamMembers(prev => prev.filter(m => m.id !== id));
    markChanged();
    showToast('info', 'Team member removed');
  };

  const updateAISettings = <K extends keyof AISettings>(key: K, value: AISettings[K]) => {
    setAISettings(prev => ({ ...prev, [key]: value }));
    markChanged();
  };

  const updateNotificationSettings = (
    key: keyof NotificationSettings,
    channel: 'email' | 'push',
    value: boolean
  ) => {
    setNotificationSettings(prev => ({
      ...prev,
      [key]: { ...prev[key], [channel]: value },
    }));
    markChanged();
  };

  return (
    <>
      <Header 
        title="Settings" 
        subtitle="Configure your customer success platform"
        actions={
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className={`flex items-center gap-1.5 md:gap-2 px-3 md:px-5 py-2 md:py-2.5 rounded-lg md:rounded-xl text-xs md:text-sm font-medium transition-all ${
              saving 
                ? 'bg-[#1B2838]/70 text-white cursor-wait' 
                : hasChanges
                  ? 'bg-[#1B2838] text-white hover:bg-[#2D4A6F]'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            {saving ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 md:w-4 md:h-4 animate-spin" />
                <span className="hidden sm:inline">Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5 md:w-4 md:h-4" />
                <span className="hidden sm:inline">Save Changes</span>
              </>
            )}
          </button>
        }
      />

      <div className="flex flex-col lg:flex-row gap-4 md:gap-6">
        {/* Tabs - Horizontal on mobile, vertical on desktop */}
        <div className="lg:w-56 flex lg:flex-col gap-2 overflow-x-auto pb-2 lg:pb-0 -mx-4 px-4 lg:mx-0 lg:px-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2.5 md:py-3 rounded-lg md:rounded-xl text-xs md:text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-[#1B2838] text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              <tab.icon className="w-4 h-4 md:w-5 md:h-5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 bg-white rounded-xl md:rounded-2xl border border-gray-200 p-4 md:p-6">
          {activeTab === 'ai' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6 md:space-y-8"
            >
              <div>
                <h3 className="text-base md:text-lg font-bold text-[#1B2838] mb-1">Assistant Configuration</h3>
                <p className="text-xs md:text-sm text-gray-500">Configure how the assistant responds to customers</p>
              </div>

              {/* Personality */}
              <div>
                <label className="block text-xs md:text-sm font-medium text-[#1B2838] mb-2 md:mb-3">Agent Personality</label>
                <select 
                  value={aiSettings.personality}
                  onChange={(e) => updateAISettings('personality', e.target.value as AISettings['personality'])}
                  className="w-full px-3 md:px-4 py-2.5 md:py-3 rounded-lg md:rounded-xl border border-gray-200 text-sm focus:border-[#1B2838] transition-colors"
                >
                  <option value="friendly">Friendly &amp; Warm (Recommended)</option>
                  <option value="professional">Professional</option>
                  <option value="casual">Casual</option>
                </select>
              </div>

              {/* Response Length */}
              <div>
                <label className="block text-xs md:text-sm font-medium text-[#1B2838] mb-2 md:mb-3">Response Length</label>
                <div className="flex flex-wrap gap-2 md:gap-3">
                  {(['concise', 'balanced', 'detailed'] as const).map((option) => (
                    <button
                      key={option}
                      onClick={() => updateAISettings('responseLength', option)}
                      className={`px-4 md:px-6 py-2 md:py-2.5 rounded-lg md:rounded-xl text-xs md:text-sm font-medium capitalize transition-all ${
                        aiSettings.responseLength === option
                          ? 'bg-[#1B2838] text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              {/* Escalation Threshold */}
              <div>
                <label className="block text-xs md:text-sm font-medium text-[#1B2838] mb-2 md:mb-3">
                  Auto-Escalation Sensitivity: {aiSettings.escalationSensitivity}
                </label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={aiSettings.escalationSensitivity}
                  onChange={(e) => updateAISettings('escalationSensitivity', parseInt(e.target.value))}
                  className="w-full accent-[#1B2838]"
                />
                <div className="flex justify-between text-[10px] md:text-xs text-gray-500 mt-1">
                  <span>Conservative</span>
                  <span>Aggressive</span>
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-3 md:space-y-4">
                {[
                  { key: 'useEmojis' as const, label: 'Use emojis in responses', description: 'Makes messages feel more personal' },
                  { key: 'proactiveFollowups' as const, label: 'Proactive follow-ups', description: 'AI follows up on unresolved issues' },
                  { key: 'autoTranslate' as const, label: 'Auto-translate', description: 'Detect and respond in customer language' },
                ].map((toggle) => (
                  <div key={toggle.key} className="flex items-start md:items-center justify-between gap-3 p-3 md:p-4 bg-gray-50 rounded-lg md:rounded-xl">
                    <div className="flex-1">
                      <p className="text-xs md:text-sm font-medium text-[#1B2838]">{toggle.label}</p>
                      <p className="text-[10px] md:text-xs text-gray-500">{toggle.description}</p>
                    </div>
                    <button 
                      onClick={() => updateAISettings(toggle.key, !aiSettings[toggle.key])}
                      className={`relative w-10 md:w-12 h-5 md:h-6 rounded-full transition-colors flex-shrink-0 ${
                        aiSettings[toggle.key] ? 'bg-[#1B2838]' : 'bg-gray-300'
                      }`}
                    >
                      <span 
                        className={`absolute top-0.5 md:top-1 w-4 md:w-4 h-4 bg-white rounded-full shadow transition-transform ${
                          aiSettings[toggle.key] ? 'translate-x-5 md:translate-x-7' : 'translate-x-0.5 md:translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'notifications' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6 md:space-y-8"
            >
              <div>
                <h3 className="text-base md:text-lg font-bold text-[#1B2838] mb-1">Notification Preferences</h3>
                <p className="text-xs md:text-sm text-gray-500">Choose how you want to be notified</p>
              </div>

              <div className="space-y-3 md:space-y-4">
                {([
                  { key: 'escalationAlerts' as const, label: 'Escalation alerts', description: 'Get notified when conversations are escalated' },
                  { key: 'dailySummary' as const, label: 'Daily summary', description: 'Receive a daily digest of AI performance' },
                  { key: 'negativeSentiment' as const, label: 'Negative sentiment alerts', description: 'Alert when customer shows frustration' },
                  { key: 'newConversation' as const, label: 'New conversation', description: 'Notify for every new conversation' },
                ]).map((notification) => (
                  <div key={notification.key} className="p-3 md:p-4 bg-gray-50 rounded-lg md:rounded-xl">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-xs md:text-sm font-medium text-[#1B2838]">{notification.label}</p>
                        <p className="text-[10px] md:text-xs text-gray-500">{notification.description}</p>
                      </div>
                      <div className="flex items-center gap-3 md:gap-4">
                        <label className="flex items-center gap-1.5 md:gap-2 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={notificationSettings[notification.key].email}
                            onChange={(e) => updateNotificationSettings(notification.key, 'email', e.target.checked)}
                            className="w-4 h-4 rounded accent-[#1B2838]"
                          />
                          <span className="text-[10px] md:text-xs text-gray-500">Email</span>
                        </label>
                        <label className="flex items-center gap-1.5 md:gap-2 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={notificationSettings[notification.key].push}
                            onChange={(e) => updateNotificationSettings(notification.key, 'push', e.target.checked)}
                            className="w-4 h-4 rounded accent-[#1B2838]"
                          />
                          <span className="text-[10px] md:text-xs text-gray-500">Push</span>
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'integrations' && (
            <IntegrationsTab />
          )}

          {activeTab === 'team' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6 md:space-y-8"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base md:text-lg font-bold text-[#1B2838] mb-1">Team Members</h3>
                  <p className="text-xs md:text-sm text-gray-500">Manage who has access to the dashboard</p>
                </div>
                {teamMembers.length > 0 && (
                  <button
                    onClick={() => setShowInviteModal(true)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-[#1B2838] text-white rounded-lg text-xs md:text-sm font-medium hover:bg-[#2D4A6F] transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Invite</span>
                  </button>
                )}
              </div>

              {teamMembers.length === 0 ? (
                <div className="text-center py-8 px-4 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                  <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <h4 className="font-medium text-[#1B2838] mb-1">No team members yet</h4>
                  <p className="text-xs text-gray-500 mb-4">Invite team members to collaborate on customer support</p>
                  <button
                    onClick={() => setShowInviteModal(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1B2838] text-white rounded-lg text-sm font-medium hover:bg-[#2D4A6F] transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Invite First Member
                  </button>
                </div>
              ) : (
                <div className="space-y-3 md:space-y-4">
                  {teamMembers.map((member) => (
                    <div key={member.id} className="flex items-center gap-3 md:gap-4 p-3 md:p-4 bg-gray-50 rounded-lg md:rounded-xl group">
                      <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#1B2838] flex items-center justify-center text-white text-xs md:text-sm font-semibold">
                        {member.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs md:text-sm font-semibold text-[#1B2838]">{member.name}</p>
                        <p className="text-[10px] md:text-xs text-gray-500 truncate">{member.email}</p>
                      </div>
                      <span className={`px-2 md:px-3 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs font-medium ${
                        member.role === 'Admin' 
                          ? 'bg-[#1B2838]/10 text-[#1B2838]' 
                          : member.role === 'Agent'
                            ? 'bg-blue-50 text-blue-600'
                            : 'bg-gray-100 text-gray-600'
                      }`}>
                        {member.role}
                      </span>
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        className="p-1.5 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>

      {/* Integrations Tab Component - Extracted for Gorgias status */}
      
      {/* Invite Team Member Modal */}
      <AnimatePresence>
        {showInviteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowInviteModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-[#1B2838]">Invite Team Member</h3>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#1B2838] mb-2">Name</label>
                  <input
                    type="text"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-[#1B2838] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1B2838] mb-2">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="john@tellmytale.com"
                      className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-[#1B2838] transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1B2838] mb-2">Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as typeof inviteRole)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-[#1B2838] transition-colors"
                  >
                    <option value="Agent">Agent - Can handle conversations</option>
                    <option value="Viewer">Viewer - Read-only access</option>
                    <option value="Admin">Admin - Full access</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleInvite}
                  className="flex-1 py-3 rounded-xl bg-[#1B2838] text-white text-sm font-medium hover:bg-[#2D4A6F] transition-colors"
                >
                  Send Invitation
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
