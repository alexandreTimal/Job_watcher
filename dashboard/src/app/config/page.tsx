"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";

interface KeywordCategory {
  category: string;
  weight: number;
  terms: string[];
}

interface ConfigData {
  keywords: KeywordCategory[];
  scoring: {
    minScore: number;
    priorities: {
      high: { min: number; label: string };
      medium: { min: number; label: string };
      low: { min: number; label: string };
    };
  };
  dedup: { windowDays: number };
  rateLimit: { delayMs: number; notionDelayMs: number };
  sources: Array<{ name: string; enabled: boolean }>;
  rssUrls: { googleAlerts: string[]; hellowork: string[] };
  careerPages: Array<{ name: string; url: string; selector: string }>;
  wttjUrls: string[];
  franceTravail: {
    searches: Array<Record<string, string>>;
  };
}

function weightColor(weight: number): string {
  if (weight >= 3) return "bg-green-600";
  if (weight >= 2) return "bg-blue-600";
  if (weight >= 1) return "bg-zinc-600";
  return "bg-red-600";
}

function categoryLabel(cat: string): string {
  const labels: Record<string, string> = {
    high_match: "Postes ciblés",
    tech_match: "Stack technique",
    contract_match: "Type de contrat",
    context_match: "Contexte startup",
    negative: "Mots-clés négatifs",
  };
  return labels[cat] ?? cat;
}

export default function ConfigPage() {
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => (r.ok ? r.json() : Promise.reject("Failed to load")))
      .then(setConfig)
      .catch(() => setError("Impossible de charger la configuration."));
  }, []);

  if (error)
    return (
      <main className="flex-1 flex items-center justify-center p-8">
        <p className="text-red-500">{error}</p>
      </main>
    );
  if (!config)
    return (
      <main className="flex-1 flex items-center justify-center p-8">
        <p className="text-muted-foreground">Chargement...</p>
      </main>
    );

  return (
    <main className="flex-1 p-8 space-y-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Configuration & Critères</h1>
        <div className="flex gap-3">
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground underline"
          >
            ← Dashboard
          </Link>
          <Link
            href="/offers"
            className="text-sm text-muted-foreground hover:text-foreground underline"
          >
            Offres →
          </Link>
        </div>
      </div>

      {/* Scoring rules */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Règles de scoring
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-6 text-sm">
            <div>
              Score minimum :{" "}
              <span className="font-mono font-bold">
                {config.scoring.minScore}
              </span>
            </div>
            <div>
              Dédoublonnage :{" "}
              <span className="font-mono">{config.dedup.windowDays} jours</span>
            </div>
            <div>
              Rate limit :{" "}
              <span className="font-mono">{config.rateLimit.delayMs}ms</span>{" "}
              (Notion: {config.rateLimit.notionDelayMs}ms)
            </div>
          </div>
          <div className="flex gap-4 text-sm">
            <Badge className="bg-green-600">
              ⭐⭐⭐ score ≥ {config.scoring.priorities.high.min}
            </Badge>
            <Badge className="bg-yellow-600">
              ⭐⭐ score ≥ {config.scoring.priorities.medium.min}
            </Badge>
            <Badge variant="outline">
              ⭐ score ≥ {config.scoring.priorities.low.min}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Keywords by category */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {config.keywords.map((kw) => (
          <Card key={kw.category}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">
                  {categoryLabel(kw.category)}
                </CardTitle>
                <Badge className={weightColor(kw.weight)}>
                  poids: {kw.weight > 0 ? "+" : ""}
                  {kw.weight}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {kw.terms.map((term) => (
                  <Badge
                    key={term}
                    variant="outline"
                    className="text-xs font-mono"
                  >
                    {term}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {kw.terms.length} termes
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Sources */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Sources</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {config.sources.map((s) => (
              <div
                key={s.name}
                className="flex items-center justify-between rounded border p-3"
              >
                <span className="text-sm font-mono">{s.name}</span>
                <Badge
                  variant={s.enabled ? "default" : "outline"}
                  className={s.enabled ? "bg-green-600" : ""}
                >
                  {s.enabled ? "ON" : "OFF"}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* France Travail searches */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            France Travail — Recherches configurées
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mots-clés</TableHead>
                <TableHead>Nature contrat</TableHead>
                <TableHead>Départements</TableHead>
                <TableHead>Résultats max</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {config.franceTravail.searches.map((s, i) => (
                <TableRow key={i}>
                  <TableCell className="font-mono text-sm">
                    {s.motsCles}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {s.natureContrat ?? "tous"}
                    </Badge>
                  </TableCell>
                  <TableCell>{s.departement ?? "France entière"}</TableCell>
                  <TableCell className="font-mono">{s.range}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* WTTJ URLs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            WTTJ — URLs de recherche
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {config.wttjUrls.map((url, i) => {
            const query = new URL(url).searchParams.get("query") ?? url;
            return (
              <div key={i} className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs font-mono">
                  {decodeURIComponent(query)}
                </Badge>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-foreground truncate"
                >
                  {url.slice(0, 80)}...
                </a>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Career Pages */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Pages carrières surveillées ({config.careerPages.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entreprise</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Sélecteur CSS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {config.careerPages.map((p) => (
                <TableRow key={p.name}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:underline text-sm truncate block max-w-md"
                    >
                      {p.url}
                    </a>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-1 rounded">
                      {p.selector}
                    </code>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center pb-4">
        Pour modifier ces paramètres, éditez{" "}
        <code className="bg-muted px-1 rounded">src/config.ts</code>
      </p>
    </main>
  );
}
