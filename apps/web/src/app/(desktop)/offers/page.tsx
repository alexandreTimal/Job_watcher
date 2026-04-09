"use client";

import { useTRPC } from "~/trpc/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { OfferTable } from "./_components/OfferTable";

export default function OffersPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data: offers, isLoading } = useQuery(trpc.offers.saved.queryOptions());

  const redirectMutation = useMutation(trpc.offers.redirect.mutationOptions());
  const markAppliedMutation = useMutation({
    ...trpc.offers.markApplied.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trpc.offers.saved.queryKey() });
    },
  });

  if (isLoading) {
    return <div className="p-8">Chargement...</div>;
  }

  return (
    <div className="mx-auto max-w-6xl p-8">
      <h1 className="mb-6 text-2xl font-bold">Mes offres sauvegardées</h1>
      <OfferTable
        offers={(offers ?? []).map((o) => ({
          feedId: o.feedId,
          offerId: o.offerId,
          title: o.title,
          company: o.company,
          location: o.location,
          salary: o.salary,
          contractType: o.contractType,
          urlSource: o.urlSource,
          score: o.score,
          justification: o.justification,
          status: o.status,
          appliedAt: o.appliedAt,
          savedAt: o.savedAt,
        }))}
        onRedirect={(offerId, url) => redirectMutation.mutate({ offerId, url })}
        onMarkApplied={(feedItemId) => markAppliedMutation.mutate({ feedItemId })}
      />
    </div>
  );
}
