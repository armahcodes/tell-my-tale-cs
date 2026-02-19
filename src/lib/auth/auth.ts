/**
 * Better Auth Server Configuration
 * Documentation: https://www.better-auth.com/docs
 * 
 * Features:
 * - Email/Password authentication
 * - Organization management (teams, members, invitations)
 * - Admin user management
 * - Role-based access control
 */

import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { organization } from 'better-auth/plugins/organization';
import { admin } from 'better-auth/plugins/admin';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';

// Ensure database is available
if (!db) {
  console.warn('Database not configured. Auth will not work properly.');
}

export const auth = betterAuth({
  // Database configuration using Drizzle adapter with schema
  database: db ? drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      // Core auth tables
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
      // Organization tables
      organization: schema.organization,
      member: schema.member,
      invitation: schema.invitation,
      team: schema.team,
    },
  }) : undefined,

  // Base URL for callbacks
  baseURL: process.env.BETTER_AUTH_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000',
  
  // Secret for encryption (must be at least 32 characters)
  secret: process.env.BETTER_AUTH_SECRET,

  // Email and password authentication
  emailAndPassword: {
    enabled: true,
    autoSignIn: true, // Auto sign in after registration
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },

  // Social providers (can be extended)
  socialProviders: {
    // Google OAuth (uncomment and add credentials to enable)
    // google: {
    //   clientId: process.env.GOOGLE_CLIENT_ID!,
    //   clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    // },
    // GitHub OAuth (uncomment and add credentials to enable)
    // github: {
    //   clientId: process.env.GITHUB_CLIENT_ID!,
    //   clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    // },
  },

  // Session configuration
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Update session every 24 hours
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },

  // User configuration
  user: {
    additionalFields: {
      // Add any custom user fields here
    },
  },

  // Advanced options
  advanced: {
    cookiePrefix: 'tellmytale',
    generateId: () => crypto.randomUUID(),
  },

  // Plugins
  plugins: [
    // Organization plugin for team management
    organization({
      // Allow any authenticated user to create organizations
      allowUserToCreateOrganization: true,
      
      // Enable teams within organizations
      teams: {
        enabled: true,
        maximumTeams: 10,
      },
      
      // Invitation settings
      invitationExpiresIn: 60 * 60 * 24 * 7, // 7 days
      cancelPendingInvitationsOnReInvite: true,
      
      // Send invitation email
      async sendInvitationEmail(data) {
        // TODO: Implement email sending with your preferred provider
        const inviteLink = `${process.env.BETTER_AUTH_URL || 'http://localhost:3000'}/invite/${data.id}`;
        console.log(`[Organization] Invitation sent to ${data.email}`);
        console.log(`[Organization] Invite link: ${inviteLink}`);
        console.log(`[Organization] Invited by: ${data.inviter.user.name} (${data.inviter.user.email})`);
        console.log(`[Organization] Organization: ${data.organization.name}`);
        
        // In production, send actual email:
        // await sendEmail({
        //   to: data.email,
        //   subject: `You've been invited to join ${data.organization.name}`,
        //   html: `<p>${data.inviter.user.name} has invited you to join ${data.organization.name}.</p>
        //          <a href="${inviteLink}">Accept Invitation</a>`,
        // });
      },
      
      // Organization hooks for custom logic
      organizationHooks: {
        afterCreateOrganization: async ({ organization, member, user }) => {
          console.log(`[Organization] Created: ${organization.name} by ${user.email}`);
        },
        afterAddMember: async ({ member, user, organization }) => {
          console.log(`[Organization] ${user.email} joined ${organization.name} as ${member.role}`);
        },
        afterAcceptInvitation: async ({ invitation, member, user, organization }) => {
          console.log(`[Organization] ${user.email} accepted invitation to ${organization.name}`);
        },
      },
    }),
    
    // Admin plugin for user management
    admin({
      // Default role for new users
      defaultRole: 'user',
      
      // Admin user IDs (can always perform admin actions)
      adminUserIds: [],
      
      // Impersonation session duration (1 hour)
      impersonationSessionDuration: 60 * 60,
      
      // Ban settings
      defaultBanReason: 'Violation of terms of service',
      bannedUserMessage: 'Your account has been suspended. Please contact support for assistance.',
    }),
    
    // Next.js cookie handling (should be last)
    nextCookies(),
  ],

  // Trusted origins for CORS
  trustedOrigins: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:3003',
    'https://support.tellmytale.co',
    'https://tellmytale.co',
    'https://www.tellmytale.co',
    process.env.BETTER_AUTH_URL || '',
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '',
  ].filter(Boolean),
});

// Export type for client usage
export type Auth = typeof auth;
