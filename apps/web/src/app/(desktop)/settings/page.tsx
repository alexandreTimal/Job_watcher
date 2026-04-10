"use client";

import { useState, useRef, useCallback } from "react";
import { useTRPC } from "~/trpc/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Preferences } from "@jobfindeer/validators";
import { PreferencesEditor } from "./_components/PreferencesEditor";

export default function SettingsPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery(trpc.profile.get.queryOptions());

  const updatePrefs = useMutation({
    ...trpc.profile.updatePreferences.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trpc.profile.get.queryKey() });
    },
  });

  if (isLoading) return <div className="p-8">Chargement...</div>;

  const profile = data?.profile;

  const currentPrefs: Preferences = {
    contractTypes: (data?.preferences?.contractTypes as string[]) ?? [],
    salaryMin: data?.preferences?.salaryMin ?? null,
    salaryMax: data?.preferences?.salaryMax ?? null,
    remotePreference: (data?.preferences?.remotePreference as Preferences["remotePreference"]) ?? "any",
    sectors: (data?.preferences?.sectors as string[]) ?? [],
    locations: (data?.preferences?.locations as { label: string; radius: number | null }[]) ?? [],
    negativeKeywords: (data?.preferences?.negativeKeywords as string[]) ?? [],
  };

  return (
    <div className="mx-auto max-w-2xl p-8">
      {/* Profile Section */}
      <h1 className="mb-6 text-2xl font-bold">Mon profil</h1>
      {profile ? (
        <div className="mb-8 rounded-lg border p-6">
          <div className="grid gap-4">
            <div className="flex items-baseline justify-between">
              <span className="text-muted-foreground text-sm">Poste actuel</span>
              <span className="font-medium">{profile.currentTitle ?? "—"}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-muted-foreground text-sm">Localisation</span>
              <span className="font-medium">{profile.currentLocation ?? "—"}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-muted-foreground text-sm">Experience</span>
              <span className="font-medium">{profile.experienceYears != null ? `${profile.experienceYears} ans` : "—"}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-muted-foreground text-sm">Niveau d'etudes</span>
              <span className="font-medium">{profile.educationLevel ?? "—"}</span>
            </div>

            {((profile.hardSkills as string[]) ?? []).length > 0 && (
              <div>
                <span className="text-muted-foreground text-sm">Competences techniques</span>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {((profile.hardSkills as string[]) ?? []).map((s) => (
                    <span key={s} className="bg-primary/10 text-primary rounded-full px-2.5 py-0.5 text-xs font-medium">{s}</span>
                  ))}
                </div>
              </div>
            )}

            {((profile.softSkills as string[]) ?? []).length > 0 && (
              <div>
                <span className="text-muted-foreground text-sm">Soft skills</span>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {((profile.softSkills as string[]) ?? []).map((s) => (
                    <span key={s} className="bg-muted rounded-full px-2.5 py-0.5 text-xs">{s}</span>
                  ))}
                </div>
              </div>
            )}

            {((profile.languages as { name: string; level: string | null }[]) ?? []).length > 0 && (
              <div>
                <span className="text-muted-foreground text-sm">Langues</span>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {((profile.languages as { name: string; level: string | null }[]) ?? []).map((l) => (
                    <span key={l.name} className="bg-muted rounded-full px-2.5 py-0.5 text-xs">
                      {l.name}{l.level ? ` (${l.level})` : ""}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <a href="/onboarding" className="text-primary mt-4 inline-block text-sm hover:underline">
            Re-analyser mon CV
          </a>
        </div>
      ) : (
        <div className="mb-8 rounded-lg border p-6 text-center">
          <p className="text-muted-foreground">Aucun profil extrait.</p>
          <a href="/onboarding" className="text-primary mt-2 inline-block text-sm hover:underline">
            Commencer l'onboarding
          </a>
        </div>
      )}

      {/* Preferences Section */}
      <h2 className="mb-4 text-xl font-bold">Preferences de recherche</h2>
      <PreferencesEditor
        initial={currentPrefs}
        onSave={(prefs) => updatePrefs.mutate(prefs)}
        saving={updatePrefs.isPending}
      />

      {/* Pipeline Trigger Section */}
      <PipelineTrigger />
    </div>
  );
}

type SourceId = "hellowork" | "wttj";

const SOURCES: { id: SourceId; label: string }[] = [
  { id: "hellowork", label: "HelloWork" },
  { id: "wttj", label: "Welcome to the Jungle" },
];

interface SourceResult {
  source: string;
  status: "success" | "error";
  offersCollected: number;
  offersInserted: number;
  duplicates: number;
  durationMs: number;
  error?: string;
}

function PipelineTrigger() {
  const [selected, setSelected] = useState<Set<SourceId>>(
    new Set(["hellowork", "wttj"]),
  );
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [results, setResults] = useState<SourceResult[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  function toggle(id: SourceId) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleStart() {
    setRunning(true);
    setLogs([]);
    setResults([]);

    const params = new URLSearchParams();
    for (const s of selected) {
      params.append("source", s);
    }

    const es = new EventSource(`/api/pipeline/run?${params.toString()}`);

    es.addEventListener("log", (e) => {
      const msg = JSON.parse(e.data) as string;
      setLogs((prev) => [...prev, msg]);
      setTimeout(scrollToBottom, 50);
    });

    es.addEventListener("result", (e) => {
      const result = JSON.parse(e.data) as SourceResult;
      setResults((prev) => [...prev, result]);
    });

    es.addEventListener("done", () => {
      setRunning(false);
      es.close();
    });

    es.onerror = () => {
      setRunning(false);
      es.close();
    };
  }

  return (
    <div className="mt-10">
      <h2 className="mb-4 text-xl font-bold">Lancer le scraping</h2>
      <div className="rounded-lg border p-6">
        <div className="mb-4 flex gap-4">
          {SOURCES.map((s) => (
            <label key={s.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selected.has(s.id)}
                onChange={() => toggle(s.id)}
                disabled={running}
                className="accent-primary h-4 w-4 rounded"
              />
              {s.label}
            </label>
          ))}
        </div>

        <button
          disabled={selected.size === 0 || running}
          onClick={handleStart}
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {running ? "Scraping en cours..." : "Lancer le scraping"}
        </button>

        {/* Live logs */}
        {logs.length > 0 && (
          <div className="bg-muted mt-4 max-h-64 overflow-y-auto rounded-md p-3 font-mono text-xs">
            {logs.map((line, i) => (
              <div
                key={i}
                className={
                  line.includes("[stderr]")
                    ? "text-red-500"
                    : line.includes("completed") || line.includes("Collected")
                      ? "text-green-600"
                      : "text-muted-foreground"
                }
              >
                {line}
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        )}

        {/* Results per source */}
        {results.length > 0 && (
          <div className="mt-4 space-y-3">
            {results.map((r) => {
              const label =
                SOURCES.find((s) => s.id === r.source)?.label ?? r.source;
              return (
                <div key={r.source} className="rounded-md border p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{label}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        r.status === "success"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {r.status === "success" ? "Termine" : "Echoue"}
                    </span>
                  </div>

                  {r.status === "success" && (
                    <p className="text-muted-foreground mt-1 text-sm">
                      {r.offersCollected} offres collectees,{" "}
                      {r.offersInserted} nouvelles inserees,{" "}
                      {r.duplicates} doublons ignores
                      {` — ${(r.durationMs / 1000).toFixed(1)}s`}
                    </p>
                  )}

                  {r.status === "error" && r.error && (
                    <p className="mt-1 text-sm text-red-600">{r.error}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
