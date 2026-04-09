"use client";

import { useTRPC } from "~/trpc/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SwipeStack } from "./_components/SwipeStack";

export default function FeedPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data: items, isLoading } = useQuery(trpc.feed.list.queryOptions());

  const swipeMutation = useMutation({
    ...trpc.feed.swipe.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trpc.feed.list.queryKey() });
      queryClient.invalidateQueries({ queryKey: trpc.feed.count.queryKey() });
    },
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-md p-4">
        <div className="bg-muted h-[70vh] animate-pulse rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md p-4">
      <h1 className="mb-4 text-xl font-bold">Ton feed du jour</h1>
      <SwipeStack
        items={(items ?? []).map((item) => ({
          id: item.id,
          title: item.title,
          company: item.company,
          location: item.location,
          salary: item.salary,
          contractType: item.contractType,
          score: item.score,
          justification: item.justification,
        }))}
        onSwipe={(itemId, action) =>
          swipeMutation.mutate({ feedItemId: itemId, action })
        }
      />
    </div>
  );
}
