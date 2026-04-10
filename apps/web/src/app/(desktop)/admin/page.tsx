"use client";

import { useTRPC } from "~/trpc/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function AdminPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data: sources, isLoading: sourcesLoading } = useQuery(
    trpc.admin.sources.queryOptions(),
  );
  const { data: metrics, isLoading: metricsLoading } = useQuery(
    trpc.admin.metrics.queryOptions(),
  );

  const toggleSource = useMutation({
    ...trpc.admin.toggleSource.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trpc.admin.sources.queryKey() });
    },
  });

  if (sourcesLoading || metricsLoading) {
    return <div className="p-8">Chargement du dashboard...</div>;
  }

  return (
    <div className="mx-auto max-w-6xl p-8">
      <h1 className="mb-6 text-2xl font-bold">Dashboard Ops</h1>

      {/* Global metrics */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <MetricCard label="Offres collectées (24h)" value={metrics?.offersToday ?? 0} />
        <MetricCard label="Utilisateurs" value={metrics?.totalUsers ?? 0} />
        <MetricCard
          label="Runs récents"
          value={metrics?.recentRuns.length ?? 0}
        />
      </div>

      {/* Sources */}
      <h2 className="mb-4 text-xl font-bold">Sources</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sources?.map((source) => (
          <div key={source.id} className="rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{source.name}</h3>
              <button
                onClick={() =>
                  toggleSource.mutate({
                    sourceId: source.id,
                    active: !source.active,
                  })
                }
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  source.active
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {source.active ? "Actif" : "Inactif"}
              </button>
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              Type : {source.type}
            </p>
            {source.metrics24h && (
              <div className="mt-3 grid grid-cols-2 gap-1 text-xs">
                <span className="text-muted-foreground">Runs 24h</span>
                <span>{source.metrics24h.totalRuns}</span>
                <span className="text-muted-foreground">Succès</span>
                <span>{source.metrics24h.successRuns}</span>
                <span className="text-muted-foreground">Collectées</span>
                <span>{source.metrics24h.totalCollected}</span>
                <span className="text-muted-foreground">Insérées</span>
                <span>{source.metrics24h.totalInserted}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Recent runs */}
      <h2 className="mb-4 mt-8 text-xl font-bold">Runs récents</h2>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <th className="px-4 py-2">Source</th>
              <th className="px-4 py-2">Statut</th>
              <th className="px-4 py-2">Collectées</th>
              <th className="px-4 py-2">Insérées</th>
              <th className="px-4 py-2">Durée</th>
              <th className="px-4 py-2">Date</th>
            </tr>
          </thead>
          <tbody>
            {metrics?.recentRuns.map((run) => (
              <tr key={run.id} className="border-t">
                <td className="px-4 py-2">{run.sourceName}</td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      run.status === "success"
                        ? "bg-green-100 text-green-700"
                        : run.status === "error"
                          ? "bg-red-100 text-red-700"
                          : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {run.status}
                  </span>
                </td>
                <td className="px-4 py-2">{run.offersCollected}</td>
                <td className="px-4 py-2">{run.offersInserted}</td>
                <td className="px-4 py-2">
                  {run.durationMs ? `${(run.durationMs / 1000).toFixed(1)}s` : "—"}
                </td>
                <td className="px-4 py-2 text-xs">
                  {run.startedAt
                    ? new Date(run.startedAt).toLocaleString("fr-FR")
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-muted-foreground text-sm">{label}</p>
      <p className="text-3xl font-bold">{value.toLocaleString()}</p>
    </div>
  );
}
