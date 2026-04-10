import "./types";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";

import { db } from "@jobfindeer/db/client";
import {
  users,
  accounts,
  sessions,
  verificationTokens,
} from "@jobfindeer/db/schema";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    newUser: "/onboarding",
  },
  providers: [
    Google({ allowDangerousEmailAccountLinking: true }),
    Credentials({
      credentials: {
        email: { type: "email" },
        password: { type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials.email as string;
        const password = credentials.password as string;

        if (!email || !password) return null;

        const user = await db.query.users.findFirst({
          where: eq(users.email, email),
        });

        if (!user?.hashedPassword) return null;

        const passwordMatch = await bcrypt.compare(
          password,
          user.hashedPassword,
        );
        if (!passwordMatch) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        };
      },
    }),
  ],
  events: {
    createUser: async ({ user }) => {
      const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await db
        .update(users)
        .set({ trialEndsAt })
        .where(eq(users.id, user.id!));
    },
  },
  callbacks: {
    jwt: async ({ token, user, trigger }) => {
      if (user) {
        token.id = user.id;
      }
      // Fetch role and trialEndsAt from DB on sign-in or token refresh
      if (trigger === "signIn" || trigger === "signUp" || !token.role) {
        const dbUser = await db.query.users.findFirst({
          where: eq(users.id, token.id as string),
          columns: { role: true, trialEndsAt: true },
        });
        if (dbUser) {
          token.role = dbUser.role;
          token.trialEndsAt = dbUser.trialEndsAt?.toISOString() ?? null;
        }
      }
      return token;
    },
    session: ({ session, token }) => {
      if (token.id) {
        session.user.id = token.id as string;
      }
      session.user.role = token.role as string;
      session.user.trialEndsAt = token.trialEndsAt as string | null;
      return session;
    },
  },
});

export type { Session } from "next-auth";
