import {
  defaultShouldDehydrateQuery,
  QueryClient,
} from "@tanstack/react-query";
import SuperJSON from "superjson";

export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        // With SSR, we usually want to set some default staleTime
        // above 0 to avoid refetching immediately on the client
        staleTime: 30 * 1000,
        retry: (failureCount, error) => {
          // Don't retry on trial expired
          if (
            error.message === "TRIAL_EXPIRED"
          ) {
            if (typeof window !== "undefined") {
              window.location.href = "/pricing";
            }
            return false;
          }
          return failureCount < 3;
        },
      },
      mutations: {
        onError: (error) => {
          if (
            typeof window !== "undefined" &&
            "data" in error &&
            (error as { data?: { code?: string } }).data?.code === "FORBIDDEN" &&
            error.message === "TRIAL_EXPIRED"
          ) {
            window.location.href = "/pricing";
          }
        },
      },
      dehydrate: {
        serializeData: SuperJSON.serialize,
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === "pending",
        shouldRedactErrors: () => {
          // We should not catch Next.js server errors
          // as that's how Next.js detects dynamic pages
          // so we cannot redact them.
          // Next.js also automatically redacts errors for us
          // with better digests.
          return false;
        },
      },
      hydrate: {
        deserializeData: SuperJSON.deserialize,
      },
    },
  });
