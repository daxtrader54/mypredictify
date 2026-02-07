import type { NextAuthOptions, Session } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { getOrCreateUser } from '@/lib/db/users';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      image: string;
      tier: 'free' | 'pro';
      hasApiAccess: boolean;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    tier?: 'free' | 'pro';
    hasApiAccess?: boolean;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async signIn({ user }) {
      if (user.email) {
        try {
          await getOrCreateUser(user.email, user.name, user.image);
        } catch (error) {
          console.error('Error during sign in (DB):', error);
          // Don't block sign-in if DB fails — user record created on next request
        }
      }
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      if (user?.email) {
        token.id = user.email;
        try {
          const { getUser } = await import('@/lib/db/users');
          const userData = await getUser(user.email);
          token.tier = userData?.tier || 'free';
          token.hasApiAccess = userData?.hasApiAccess || false;
        } catch {
          token.tier = 'free';
          token.hasApiAccess = false;
        }
      }

      // Handle session updates (e.g., after subscription change)
      if (trigger === 'update' && session) {
        if (session.tier) token.tier = session.tier;
        if (session.hasApiAccess !== undefined) token.hasApiAccess = session.hasApiAccess;
      }

      return token;
    },
    async session({ session, token }): Promise<Session> {
      return {
        ...session,
        user: {
          ...session.user,
          id: token.id || session.user.email,
          tier: token.tier || 'free',
          hasApiAccess: token.hasApiAccess || false,
        },
      };
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      if (url.startsWith(baseUrl)) return url;
      return `${baseUrl}/dashboard`;
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};
