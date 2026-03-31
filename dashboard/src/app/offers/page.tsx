"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

interface Offer {
  id: number;
  title: string;
  company: string | null;
  url: string | null;
  source: string;
  score: number;
  first_seen_at: string;
}

interface OffersResponse {
  offers: Offer[];
  total: number;
  page: number;
  totalPages: number;
  sources: string[];
}

function getPriorityBadge(score: number) {
  if (score >= 7) return <Badge className="bg-green-600">⭐⭐⭐</Badge>;
  if (score >= 4) return <Badge className="bg-yellow-600">⭐⭐</Badge>;
  return <Badge variant="outline">⭐</Badge>;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function OffersPage() {
  const [data, setData] = useState<OffersResponse | null>(null);
  const [page, setPage] = useState(1);
  const [source, setSource] = useState("");
  const [sort, setSort] = useState("first_seen_at");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOffers = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      page: String(page),
      limit: "20",
      sort,
      order,
    });
    if (source) params.set("source", source);

    try {
      const res = await fetch(`/api/offers?${params}`);
      if (res.ok) {
        setData(await res.json());
      } else {
        setError("Erreur lors du chargement des offres. Vérifiez que la base de données existe.");
      }
    } catch {
      setError("Impossible de se connecter au serveur.");
    }
    setLoading(false);
  }, [page, source, sort, order]);

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  function toggleSort(col: string) {
    if (sort === col) {
      setOrder(order === "desc" ? "asc" : "desc");
    } else {
      setSort(col);
      setOrder("desc");
    }
    setPage(1);
  }

  function sortIcon(col: string) {
    if (sort !== col) return "";
    return order === "desc" ? " ↓" : " ↑";
  }

  return (
    <main className="flex-1 p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Offres</h1>
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground underline"
        >
          ← Dashboard
        </Link>
      </div>

      {data && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-4">
              <CardTitle className="text-sm font-medium">
                {data.total} offres
              </CardTitle>
              <select
                value={source}
                onChange={(e) => {
                  setSource(e.target.value);
                  setPage(1);
                }}
                className="rounded border border-input bg-background px-3 py-1 text-sm"
              >
                <option value="">Toutes les sources</option>
                {data.sources.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </CardHeader>
          <CardContent>
            {error ? (
              <p className="text-red-500 py-8 text-center">{error}</p>
            ) : loading ? (
              <p className="text-muted-foreground py-8 text-center">
                Chargement...
              </p>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead
                        className="cursor-pointer"
                        onClick={() => toggleSort("company")}
                      >
                        Entreprise{sortIcon("company")}
                      </TableHead>
                      <TableHead
                        className="cursor-pointer"
                        onClick={() => toggleSort("title")}
                      >
                        Poste{sortIcon("title")}
                      </TableHead>
                      <TableHead
                        className="cursor-pointer"
                        onClick={() => toggleSort("source")}
                      >
                        Source{sortIcon("source")}
                      </TableHead>
                      <TableHead
                        className="cursor-pointer"
                        onClick={() => toggleSort("score")}
                      >
                        Score{sortIcon("score")}
                      </TableHead>
                      <TableHead>Priorité</TableHead>
                      <TableHead
                        className="cursor-pointer"
                        onClick={() => toggleSort("first_seen_at")}
                      >
                        Date{sortIcon("first_seen_at")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.offers.map((offer) => (
                      <TableRow key={offer.id}>
                        <TableCell className="font-medium">
                          {offer.company ?? "—"}
                        </TableCell>
                        <TableCell>
                          {offer.url ? (
                            <a
                              href={offer.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline text-blue-400"
                            >
                              {offer.title}
                            </a>
                          ) : (
                            offer.title
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{offer.source}</Badge>
                        </TableCell>
                        <TableCell className="font-mono">
                          {offer.score}
                        </TableCell>
                        <TableCell>{getPriorityBadge(offer.score)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(offer.first_seen_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {data.totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage(page - 1)}
                    >
                      ← Précédent
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {data.page} / {data.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= data.totalPages}
                      onClick={() => setPage(page + 1)}
                    >
                      Suivant →
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </main>
  );
}
