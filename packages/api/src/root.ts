import { authRouter } from "./router/auth";
import { profileRouter } from "./router/profile";
import { feedRouter } from "./router/feed";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  profile: profileRouter,
  feed: feedRouter,
});

export type AppRouter = typeof appRouter;
