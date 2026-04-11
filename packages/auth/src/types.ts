import type { DefaultSession } from "next-auth";
import type { JWT as _JWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      trialEndsAt: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    trialEndsAt?: string | null;
  }
}
