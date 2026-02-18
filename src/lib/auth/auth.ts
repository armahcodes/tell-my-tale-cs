/**
 * Better Auth Server Configuration
 * Documentation: https://www.better-auth.com/docs
 */

import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
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
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
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
    nextCookies(), // Handle cookies in Next.js server actions
  ],

  // Trusted origins for CORS
  trustedOrigins: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:3003',
    process.env.BETTER_AUTH_URL || '',
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '',
  ].filter(Boolean),
});

// Export type for client usage
export type Auth = typeof auth;
