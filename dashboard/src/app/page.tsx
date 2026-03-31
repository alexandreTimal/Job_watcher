import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { getStats as fetchStats } from "@/lib/db";

export default async function Home() {
  let stats: ReturnType<typeof fetchStats> | null = null;
  try {
    stats = fetchStats();
  } catch {
    stats = null;
  }

  if (!stats) {
    return (
      <main className="flex-1 flex items-center justify-center p-8">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Base de données introuvable</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Lancez le script job-watcher au moins une fois pour créer la base
              de données.
            </p>
            <code className="mt-4 block text-sm bg-muted p-2 rounded">
              npx tsx src/index.ts --dry-run
            </code>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex-1 p-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Job Watcher</h1>
        <div className="flex gap-4">
          <Link
            href="/config"
            className="text-sm text-muted-foreground hover:text-foreground underline"
          >
            Critères & Config
          </Link>
          <Link
            href="/offers"
            className="text-sm text-muted-foreground hover:text-foreground underline"
          >
            Voir toutes les offres →
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total offres
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalOffers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Aujourd&apos;hui
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.todayOffers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Priorité haute
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-500">
              {stats.offersByPriority.high}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Sources actives
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {stats.offersBySource.length}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Offres par source
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.offersBySource.map((s) => (
              <div key={s.source} className="flex items-center justify-between">
                <Badge variant="outline">{s.source}</Badge>
                <span className="font-mono text-sm">{s.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Répartition par priorité
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span>⭐⭐⭐ Haute (score ≥ 7)</span>
              <span className="font-mono text-green-500">
                {stats.offersByPriority.high}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>⭐⭐ Moyenne (score 4-6)</span>
              <span className="font-mono text-yellow-500">
                {stats.offersByPriority.medium}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>⭐ Basse (score 1-3)</span>
              <span className="font-mono text-zinc-500">
                {stats.offersByPriority.low}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
