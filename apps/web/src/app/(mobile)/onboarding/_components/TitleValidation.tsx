"use client";

import { useState, useRef } from "react";
import type { SearchTitle, SearchTitleWithActive } from "@jobfindeer/validators";

interface TitleItem extends SearchTitleWithActive {
  _id: number;
}

interface TitleValidationProps {
  titles: SearchTitle[];
  onComplete: (validated: SearchTitleWithActive[]) => void;
  loading?: boolean;
}

let nextId = 1;

export function TitleValidation({ titles, onComplete, loading }: TitleValidationProps) {
  const [items, setItems] = useState<TitleItem[]>(
    titles.map((t) => ({ ...t, active: true, _id: nextId++ })),
  );
  const [newTitleFr, setNewTitleFr] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function toggleTitle(id: number) {
    setItems((prev) =>
      prev.map((item) => (item._id === id ? { ...item, active: !item.active } : item)),
    );
  }

  function addTitle() {
    const trimmed = newTitleFr.trim();
    if (!trimmed) return;
    setItems((prev) => [...prev, { fr: trimmed, en: null, active: true, _id: nextId++ }]);
    setNewTitleFr("");
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      addTitle();
    }
  }

  const activeCount = items.filter((i) => i.active).length;

  function handleComplete() {
    const validated = items.map(({ _id: _, ...rest }) => rest);
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

      <div className="space-y-2" role="group" aria-label="Titres de poste">
        {items.map((item) => {
          const label = item.fr ?? item.en ?? "Titre";
          return (
            <button
              key={item._id}
              type="button"
              onClick={() => toggleTitle(item._id)}
              aria-pressed={item.active}
              aria-label={`${item.active ? "Desactiver" : "Activer"} ${label}`}
              className={`flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${
                item.active
                  ? "border-primary/20 bg-primary/5"
                  : "border-muted bg-muted/30 opacity-50"
              }`}
            >
              <div
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                  item.active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted-foreground/30"
                }`}
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
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-sm font-medium">
                  {item.fr ?? item.en}
                </span>
                {item.fr && item.en && (
                  <span className="text-muted-foreground ml-2 text-xs">
                    {item.en}
                  </span>
                )}
                {!item.fr && item.en && (
                  <span className="text-muted-foreground text-xs">
                    (anglais uniquement)
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={newTitleFr}
          onChange={(e) => setNewTitleFr(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="+ ajouter un titre"
          aria-label="Ajouter un titre de poste"
          className="border-input bg-background h-9 flex-1 rounded-md border px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
        />
        <button
          type="button"
          onClick={addTitle}
          disabled={!newTitleFr.trim()}
          className="bg-secondary text-secondary-foreground hover:bg-secondary/80 h-9 rounded-md px-4 text-sm font-medium disabled:opacity-50"
        >
          Ajouter
        </button>
      </div>

      <p className="text-muted-foreground text-xs">
        Tu pourras revenir modifier ces choix plus tard depuis ton profil
      </p>

      <button
        type="button"
        onClick={handleComplete}
        disabled={loading || activeCount === 0}
        className="bg-primary text-primary-foreground hover:bg-primary/90 h-10 w-full rounded-md px-6 text-sm font-medium shadow-xs disabled:pointer-events-none disabled:opacity-50"
      >
        {loading ? "Enregistrement..." : `Lancer la recherche (${activeCount} titres)`}
      </button>
    </div>
  );
}
