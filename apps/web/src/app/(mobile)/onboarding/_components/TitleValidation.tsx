"use client";

import { useMemo, useRef, useState } from "react";
import type { SearchTitle, SearchTitleWithActive } from "@jobfindeer/validators";
import { Button } from "@jobfindeer/ui/button";
import { Input } from "@jobfindeer/ui/input";
import { cn } from "@jobfindeer/ui";

interface TitleItem extends SearchTitleWithActive {
  _id: number;
}

interface TitleValidationProps {
  titles: SearchTitle[];
  onComplete: (validated: SearchTitleWithActive[]) => void;
  loading?: boolean;
}

function dedupKey(fr: string | null, en: string | null): string {
  const norm = (v: string | null) =>
    (v ?? "").toLowerCase().replace(/\s+/g, " ").trim();
  return `${norm(fr)}|${norm(en)}`;
}

export function TitleValidation({ titles, onComplete, loading }: TitleValidationProps) {
  const nextIdRef = useRef(1);
  const genId = () => nextIdRef.current++;

  const initialItems = useMemo<TitleItem[]>(() => {
    const seen = new Set<string>();
    const items: TitleItem[] = [];
    for (const t of titles) {
      const key = dedupKey(t.fr, t.en);
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({ ...t, active: true, _id: genId() });
    }
    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [items, setItems] = useState<TitleItem[]>(initialItems);
  const [newTitle, setNewTitle] = useState("");
  const [dupWarning, setDupWarning] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function toggleTitle(id: number) {
    setItems((prev) =>
      prev.map((item) => (item._id === id ? { ...item, active: !item.active } : item)),
    );
  }

  function addTitle() {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    const key = dedupKey(trimmed, null);
    const existing = items.find((it) => dedupKey(it.fr, it.en) === key);
    if (existing) {
      setDupWarning(`"${trimmed}" est déjà dans la liste`);
      if (!existing.active) {
        setItems((prev) =>
          prev.map((it) => (it._id === existing._id ? { ...it, active: true } : it)),
        );
      }
      return;
    }
    setItems((prev) => [
      ...prev,
      {
        fr: trimmed,
        en: null,
        niveau_ordinal: "aligné",
        category: "classic_fr",
        active: true,
        _id: genId(),
      },
    ]);
    setNewTitle("");
    setDupWarning(null);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      addTitle();
    }
  }

  const activeCount = items.filter((i) => i.active).length;
  const isSubmitting = loading === true;

  function handleComplete() {
    if (isSubmitting || activeCount === 0) return;
    const validated: SearchTitleWithActive[] = items.map(({ _id: _ignored, ...rest }) => rest);
    onComplete(validated);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">
          Voici les postes que je vais chercher pour toi
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Tu peux ajuster la liste avant de lancer la recherche
        </p>
      </div>

      <ul className="space-y-2" role="group" aria-label="Titres de poste">
        {items.map((item) => {
          const label = item.fr ?? item.en ?? "Titre";
          return (
            <li key={item._id}>
              <button
                type="button"
                role="checkbox"
                aria-checked={item.active}
                aria-label={label}
                onClick={() => toggleTitle(item._id)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-left transition-colors",
                  item.active
                    ? "border-primary/20 bg-primary/5"
                    : "border-muted bg-muted/30 opacity-50",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border",
                    item.active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted-foreground/30",
                  )}
                  aria-hidden="true"
                >
                  {item.active && (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path
                        d="M2.5 6L5 8.5L9.5 3.5"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="text-sm font-medium">
                    {item.fr ?? item.en}
                  </span>
                  {item.fr && item.en && (
                    <span className="text-muted-foreground ml-2 text-xs">
                      {item.en}
                    </span>
                  )}
                  {!item.fr && item.en && (
                    <span className="text-muted-foreground ml-2 text-xs">
                      (anglais uniquement)
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="space-y-1">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={newTitle}
            onChange={(e) => {
              setNewTitle(e.target.value);
              if (dupWarning) setDupWarning(null);
            }}
            onKeyDown={handleKeyDown}
            placeholder="+ ajouter un titre"
            aria-label="Ajouter un titre de poste"
            maxLength={200}
          />
          <Button
            type="button"
            variant="secondary"
            onClick={addTitle}
            disabled={!newTitle.trim()}
          >
            Ajouter
          </Button>
        </div>
        {dupWarning && (
          <p className="text-muted-foreground text-xs" role="status">
            {dupWarning}
          </p>
        )}
      </div>

      <p className="text-muted-foreground text-xs">
        Tu pourras revenir modifier ces choix plus tard depuis ton profil
      </p>

      <Button
        type="button"
        onClick={handleComplete}
        disabled={isSubmitting || activeCount === 0}
        className="w-full"
      >
        {isSubmitting ? "Enregistrement..." : `Lancer la recherche (${activeCount} titres)`}
      </Button>
    </div>
  );
}
