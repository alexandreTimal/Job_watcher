import { authRouter } from "./router/auth";
import { profileRouter } from "./router/profile";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  profile: profileRouter,
});

export type AppRouter = typeof appRouter;
