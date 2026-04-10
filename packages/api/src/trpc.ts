import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { z, ZodError } from "zod/v4";

import { db } from "@jobfindeer/db/client";
import { auth } from "@jobfindeer/auth";

/**
 * 1. CONTEXT
 *
 * This section defines the "contexts" that are available in the backend API.
 *
 * @see https://trpc.io/docs/server/context
 */
export const createTRPCContext = async (_opts: {
  headers: Headers;
}) => {
  const session = await auth();

  return {
    db,
    session,
  };
};

/**
 * 2. INITIALIZATION
 */
const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter: ({ shape, error }) => ({
    ...shape,
    data: {
      ...shape.data,
      zodError:
        error.cause instanceof ZodError
          ? z.flattenError(error.cause as ZodError<Record<string, unknown>>)
          : null,
    },
  }),
});

/**
 * 3. ROUTER & PROCEDURE
 */
export const createTRPCRouter = t.router;

const timingMiddleware = t.middleware(async ({ next, path }) => {
  const start = Date.now();

  if (t._config.isDev) {
    const waitMs = Math.floor(Math.random() * 400) + 100;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  const result = await next();

  const end = Date.now();
  console.log(`[TRPC] ${path} took ${end - start}ms to execute`);

  return result;
});

export const publicProcedure = t.procedure.use(timingMiddleware);

export const protectedProcedure = t.procedure
  .use(timingMiddleware)
  .use(({ ctx, next }) => {
    if (!ctx.session?.user?.id) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    // Admins bypass trial check
    const { trialEndsAt, role } = ctx.session.user;
    const isAdmin = role === "admin";
    const trialActive = trialEndsAt && new Date(trialEndsAt) > new Date();
    // TODO(Epic 6): Add subscription check here
    if (!isAdmin && !trialActive) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "TRIAL_EXPIRED",
      });
    }

    return next({
      ctx: {
        session: {
          ...ctx.session,
          user: { ...ctx.session.user, id: ctx.session.user.id },
        },
      },
    });
  });

export const adminProcedure = t.procedure
  .use(timingMiddleware)
  .use(({ ctx, next }) => {
    if (!ctx.session?.user?.id) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    if (ctx.session.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    return next({
      ctx: {
        session: {
          ...ctx.session,
          user: { ...ctx.session.user, id: ctx.session.user.id },
        },
      },
    });
  });
