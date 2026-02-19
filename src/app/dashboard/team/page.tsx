'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authClient, useSession, useActiveOrganization, useListOrganizations } from '@/lib/auth';
import {
  Users,
  UserPlus,
  Settings,
  Building2,
  Mail,
  Shield,
  Crown,
  MoreVertical,
  Loader2,
  Plus,
  Check,
  X,
  Copy,
  Trash2,
  Edit,
  RefreshCw,
} from 'lucide-react';

type MemberRole = 'owner' | 'admin' | 'member';

interface OrganizationMember {
  id: string;
  userId: string;
  role: MemberRole;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
}

interface Invitation {
  id: string;
  email: string;
  role: MemberRole;
  status: string;
  expiresAt: string;
  createdAt: string;
}

interface FullOrganization {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  metadata?: string;
  createdAt: string;
  members: OrganizationMember[];
  invitations: Invitation[];
}

export default function TeamPage() {
  const router = useRouter();
  const { data: session, isPending: sessionPending } = useSession();
  const { data: activeOrg, isPending: orgPending } = useActiveOrganization();
  const { data: organizations } = useListOrganizations();

  const [fullOrg, setFullOrg] = useState<FullOrganization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'members' | 'invitations' | 'settings'>('members');

  // Invite modal state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<MemberRole>('member');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState('');

  // Create org modal state
  const [showCreateOrgModal, setShowCreateOrgModal] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgSlug, setNewOrgSlug] = useState('');
  const [createOrgLoading, setCreateOrgLoading] = useState(false);
  const [createOrgError, setCreateOrgError] = useState('');

  useEffect(() => {
    if (!sessionPending && !session) {
      router.push('/login');
    }
  }, [session, sessionPending, router]);

  useEffect(() => {
    if (activeOrg) {
      fetchFullOrganization();
    } else {
      setIsLoading(false);
    }
  }, [activeOrg]);

  const fetchFullOrganization = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await authClient.organization.getFullOrganization({});
      if (error) {
        console.error('Error fetching organization:', error);
      } else if (data) {
        setFullOrg(data as unknown as FullOrganization);
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateOrgLoading(true);
    setCreateOrgError('');

    try {
      const { data, error } = await authClient.organization.create({
        name: newOrgName,
        slug: newOrgSlug.toLowerCase().replace(/\s+/g, '-'),
      });

      if (error) {
        setCreateOrgError(error.message || 'Failed to create organization');
      } else if (data) {
        setShowCreateOrgModal(false);
        setNewOrgName('');
        setNewOrgSlug('');
        // Set as active organization
        await authClient.organization.setActive({ organizationId: data.id });
        router.refresh();
      }
    } catch (err) {
      setCreateOrgError('An error occurred');
    } finally {
      setCreateOrgLoading(false);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteLoading(true);
    setInviteError('');

    try {
      const { data, error } = await authClient.organization.inviteMember({
        email: inviteEmail,
        role: inviteRole,
      });

      if (error) {
        setInviteError(error.message || 'Failed to send invitation');
      } else {
        setShowInviteModal(false);
        setInviteEmail('');
        setInviteRole('member');
        fetchFullOrganization();
      }
    } catch (err) {
      setInviteError('An error occurred');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      await authClient.organization.cancelInvitation({ invitationId });
      fetchFullOrganization();
    } catch (err) {
      console.error('Error canceling invitation:', err);
    }
  };

  const handleRemoveMember = async (memberIdOrEmail: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return;

    try {
      await authClient.organization.removeMember({ memberIdOrEmail });
      fetchFullOrganization();
    } catch (err) {
      console.error('Error removing member:', err);
    }
  };

  const handleUpdateMemberRole = async (memberId: string, newRole: MemberRole) => {
    try {
      await authClient.organization.updateMemberRole({
        memberId,
        role: newRole,
      });
      fetchFullOrganization();
    } catch (err) {
      console.error('Error updating role:', err);
    }
  };

  const handleSetActiveOrg = async (orgId: string) => {
    try {
      await authClient.organization.setActive({ organizationId: orgId });
      router.refresh();
    } catch (err) {
      console.error('Error setting active org:', err);
    }
  };

  const getRoleIcon = (role: MemberRole) => {
    switch (role) {
      case 'owner':
        return <Crown className="w-4 h-4 text-yellow-500" />;
      case 'admin':
        return <Shield className="w-4 h-4 text-blue-500" />;
      default:
        return <Users className="w-4 h-4 text-gray-500" />;
    }
  };

  const getRoleBadgeColor = (role: MemberRole) => {
    switch (role) {
      case 'owner':
        return 'bg-yellow-100 text-yellow-800';
      case 'admin':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const currentUserRole = fullOrg?.members.find(m => m.userId === session?.user?.id)?.role;
  const canManageMembers = currentUserRole === 'owner' || currentUserRole === 'admin';
  const canManageAdmins = currentUserRole === 'owner';

  if (sessionPending || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-[#1B2838]" />
      </div>
    );
  }

  // No organization - show create prompt
  if (!activeOrg) {
    return (
      <div className="p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center">
            <div className="w-16 h-16 bg-[#1B2838]/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Building2 className="w-8 h-8 text-[#1B2838]" />
            </div>
            <h1 className="text-2xl font-bold text-[#1B2838] mb-2">Create Your Organization</h1>
            <p className="text-gray-500 mb-8">
              Set up your organization to start inviting team members and collaborating.
            </p>

            {organizations && organizations.length > 0 && (
              <div className="mb-8">
                <p className="text-sm text-gray-500 mb-4">Or select an existing organization:</p>
                <div className="space-y-2">
                  {organizations.map((org) => (
                    <button
                      key={org.id}
                      onClick={() => handleSetActiveOrg(org.id)}
                      className="w-full p-3 border border-gray-200 rounded-xl hover:border-[#1B2838] hover:bg-gray-50 transition-colors flex items-center gap-3"
                    >
                      <div className="w-10 h-10 bg-[#1B2838] rounded-lg flex items-center justify-center text-white font-semibold">
                        {org.name.charAt(0)}
                      </div>
                      <div className="text-left">
                        <div className="font-medium text-[#1B2838]">{org.name}</div>
                        <div className="text-sm text-gray-500">{org.slug}</div>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="my-6 flex items-center">
                  <div className="flex-1 border-t border-gray-200"></div>
                  <span className="px-4 text-sm text-gray-500">or</span>
                  <div className="flex-1 border-t border-gray-200"></div>
                </div>
              </div>
            )}

            <button
              onClick={() => setShowCreateOrgModal(true)}
              className="px-6 py-3 bg-[#1B2838] text-white rounded-xl font-semibold hover:bg-[#2D4A6F] transition-colors inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Create Organization
            </button>
          </div>
        </div>

        {/* Create Organization Modal */}
        {showCreateOrgModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-[#1B2838]">Create Organization</h2>
                <button
                  onClick={() => setShowCreateOrgModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateOrganization} className="space-y-4">
                {createOrgError && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                    {createOrgError}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Organization Name
                  </label>
                  <input
                    type="text"
                    value={newOrgName}
                    onChange={(e) => {
                      setNewOrgName(e.target.value);
                      setNewOrgSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'));
                    }}
                    placeholder="My Company"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-[#1B2838] focus:ring-1 focus:ring-[#1B2838] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Organization Slug
                  </label>
                  <input
                    type="text"
                    value={newOrgSlug}
                    onChange={(e) => setNewOrgSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                    placeholder="my-company"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-[#1B2838] focus:ring-1 focus:ring-[#1B2838] transition-colors font-mono"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    This will be used in URLs: /org/{newOrgSlug || 'my-company'}
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateOrgModal(false)}
                    className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createOrgLoading}
                    className="flex-1 px-4 py-3 bg-[#1B2838] text-white rounded-xl font-semibold hover:bg-[#2D4A6F] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {createOrgLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Organization'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-[#1B2838] rounded-2xl flex items-center justify-center text-white text-xl font-bold">
              {fullOrg?.logo ? (
                <img src={fullOrg.logo} alt={fullOrg.name} className="w-full h-full rounded-2xl object-cover" />
              ) : (
                fullOrg?.name.charAt(0) || 'O'
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#1B2838]">{fullOrg?.name || 'Organization'}</h1>
              <p className="text-gray-500">{fullOrg?.members.length || 0} members</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchFullOrganization}
              className="p-2 text-gray-500 hover:text-[#1B2838] hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            {canManageMembers && (
              <button
                onClick={() => setShowInviteModal(true)}
                className="px-4 py-2 bg-[#1B2838] text-white rounded-xl font-medium hover:bg-[#2D4A6F] transition-colors flex items-center gap-2"
              >
                <UserPlus className="w-5 h-5" />
                Invite Member
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit">
          <button
            onClick={() => setActiveTab('members')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              activeTab === 'members'
                ? 'bg-white text-[#1B2838] shadow-sm'
                : 'text-gray-600 hover:text-[#1B2838]'
            }`}
          >
            <Users className="w-4 h-4 inline-block mr-2" />
            Members ({fullOrg?.members.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('invitations')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              activeTab === 'invitations'
                ? 'bg-white text-[#1B2838] shadow-sm'
                : 'text-gray-600 hover:text-[#1B2838]'
            }`}
          >
            <Mail className="w-4 h-4 inline-block mr-2" />
            Invitations ({fullOrg?.invitations.filter(i => i.status === 'pending').length || 0})
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              activeTab === 'settings'
                ? 'bg-white text-[#1B2838] shadow-sm'
                : 'text-gray-600 hover:text-[#1B2838]'
            }`}
          >
            <Settings className="w-4 h-4 inline-block mr-2" />
            Settings
          </button>
        </div>

        {/* Members Tab */}
        {activeTab === 'members' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Member</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Role</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Joined</th>
                  {canManageMembers && (
                    <th className="text-right px-6 py-4 text-sm font-semibold text-gray-600">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {fullOrg?.members.map((member) => (
                  <tr key={member.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#1B2838] rounded-full flex items-center justify-center text-white font-medium">
                          {member.user.image ? (
                            <img src={member.user.image} alt={member.user.name} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            member.user.name.charAt(0)
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-[#1B2838]">
                            {member.user.name}
                            {member.userId === session?.user?.id && (
                              <span className="ml-2 text-xs text-gray-500">(you)</span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">{member.user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {getRoleIcon(member.role as MemberRole)}
                        <span className={`px-2 py-1 rounded-lg text-xs font-medium ${getRoleBadgeColor(member.role as MemberRole)}`}>
                          {member.role}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(member.createdAt).toLocaleDateString()}
                    </td>
                    {canManageMembers && (
                      <td className="px-6 py-4 text-right">
                        {member.userId !== session?.user?.id && member.role !== 'owner' && (
                          <div className="flex items-center justify-end gap-2">
                            {canManageAdmins && (
                              <select
                                value={member.role}
                                onChange={(e) => handleUpdateMemberRole(member.id, e.target.value as MemberRole)}
                                className="text-sm border border-gray-200 rounded-lg px-2 py-1"
                              >
                                <option value="member">Member</option>
                                <option value="admin">Admin</option>
                              </select>
                            )}
                            <button
                              onClick={() => handleRemoveMember(member.id)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Invitations Tab */}
        {activeTab === 'invitations' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {fullOrg?.invitations.filter(i => i.status === 'pending').length === 0 ? (
              <div className="p-12 text-center">
                <Mail className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-700 mb-2">No Pending Invitations</h3>
                <p className="text-gray-500 mb-6">Invite team members to collaborate with you.</p>
                {canManageMembers && (
                  <button
                    onClick={() => setShowInviteModal(true)}
                    className="px-4 py-2 bg-[#1B2838] text-white rounded-xl font-medium hover:bg-[#2D4A6F] transition-colors inline-flex items-center gap-2"
                  >
                    <UserPlus className="w-5 h-5" />
                    Invite Member
                  </button>
                )}
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Email</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Role</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Status</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Expires</th>
                    {canManageMembers && (
                      <th className="text-right px-6 py-4 text-sm font-semibold text-gray-600">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {fullOrg?.invitations.filter(i => i.status === 'pending').map((invitation) => (
                    <tr key={invitation.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-500">
                            <Mail className="w-5 h-5" />
                          </div>
                          <span className="font-medium text-[#1B2838]">{invitation.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-lg text-xs font-medium ${getRoleBadgeColor(invitation.role as MemberRole)}`}>
                          {invitation.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 rounded-lg text-xs font-medium bg-yellow-100 text-yellow-800">
                          Pending
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(invitation.expiresAt).toLocaleDateString()}
                      </td>
                      {canManageMembers && (
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleCancelInvitation(invitation.id)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-[#1B2838] mb-6">Organization Settings</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Organization Name</label>
                <input
                  type="text"
                  defaultValue={fullOrg?.name}
                  disabled={currentUserRole !== 'owner'}
                  className="w-full max-w-md px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-[#1B2838] focus:ring-1 focus:ring-[#1B2838] transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Organization Slug</label>
                <input
                  type="text"
                  defaultValue={fullOrg?.slug}
                  disabled
                  className="w-full max-w-md px-4 py-3 rounded-xl border border-gray-200 text-sm font-mono bg-gray-50 cursor-not-allowed"
                />
                <p className="mt-1 text-xs text-gray-500">Slug cannot be changed after creation.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Organization ID</label>
                <div className="flex items-center gap-2 max-w-md">
                  <input
                    type="text"
                    value={fullOrg?.id || ''}
                    disabled
                    className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-sm font-mono bg-gray-50 cursor-not-allowed"
                  />
                  <button
                    onClick={() => navigator.clipboard.writeText(fullOrg?.id || '')}
                    className="p-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <Copy className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>
              {currentUserRole === 'owner' && (
                <div className="pt-6 border-t border-gray-100">
                  <h3 className="text-sm font-semibold text-red-600 mb-2">Danger Zone</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Deleting an organization will remove all members and data permanently.
                  </p>
                  <button className="px-4 py-2 border border-red-300 text-red-600 rounded-xl font-medium hover:bg-red-50 transition-colors">
                    Delete Organization
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Invite Modal */}
        {showInviteModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-[#1B2838]">Invite Team Member</h2>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleInviteMember} className="space-y-4">
                {inviteError && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                    {inviteError}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colleague@company.com"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-[#1B2838] focus:ring-1 focus:ring-[#1B2838] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as MemberRole)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-[#1B2838] focus:ring-1 focus:ring-[#1B2838] transition-colors"
                  >
                    <option value="member">Member - Can view and participate</option>
                    {canManageAdmins && <option value="admin">Admin - Can manage members</option>}
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={inviteLoading}
                    className="flex-1 px-4 py-3 bg-[#1B2838] text-white rounded-xl font-semibold hover:bg-[#2D4A6F] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {inviteLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4" />
                        Send Invitation
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
