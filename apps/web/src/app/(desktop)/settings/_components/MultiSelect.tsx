"use client";

import { useState, useRef, useEffect } from "react";
import { Label } from "@jobfindeer/ui/label";

export function MultiSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: readonly string[];
  selected: string[];
  onChange: (selected: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = options.filter(
    (o) => o.toLowerCase().includes(search.toLowerCase()),
  );

  function toggle(option: string) {
    if (selected.includes(option)) {
      onChange(selected.filter((s) => s !== option));
    } else {
      onChange([...selected, option]);
    }
  }

  return (
    <div className="flex flex-col gap-2" ref={ref}>
      <Label>{label}</Label>

      {/* Pills */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((item) => (
            <span
              key={item}
              className="bg-primary/10 text-primary flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
            >
              {item}
              <button
                type="button"
                onClick={() => onChange(selected.filter((s) => s !== item))}
                className="text-primary/60 hover:text-primary ml-0.5"
                aria-label={`Supprimer ${item}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Dropdown trigger */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="border-input bg-background flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm"
        >
          <span className="text-muted-foreground">
            {selected.length === 0
              ? "Sélectionner..."
              : `${selected.length} sélectionné${selected.length > 1 ? "s" : ""}`}
          </span>
          <svg
            className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {open && (
          <div className="border-input bg-background absolute z-50 mt-1 w-full rounded-md border shadow-lg">
            <div className="border-b p-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher..."
                className="bg-background w-full rounded px-2 py-1 text-sm outline-none"
                autoFocus
              />
            </div>
            <div className="max-h-60 overflow-y-auto p-1">
              {filtered.length === 0 ? (
                <div className="text-muted-foreground px-2 py-3 text-center text-sm">
                  Aucun résultat
                </div>
              ) : (
                filtered.map((option) => {
                  const isSelected = selected.includes(option);
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => toggle(option)}
                      className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors ${
                        isSelected
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-muted"
                      }`}
                    >
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-input"
                        }`}
                      >
                        {isSelected && (
                          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </span>
                      {option}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
