import { authRouter } from "./router/auth";
import { profileRouter } from "./router/profile";
import { feedRouter } from "./router/feed";
import { offersRouter } from "./router/offers";
import { adminRouter } from "./router/admin";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  profile: profileRouter,
  feed: feedRouter,
  offers: offersRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
