"use client";

import { useState } from "react";
import { Button } from "@jobfindeer/ui/button";
import { Input } from "@jobfindeer/ui/input";
import { Label } from "@jobfindeer/ui/label";

export function NegativeKeywords({
  keywords,
  onChange,
}: {
  keywords: string[];
  onChange: (keywords: string[]) => void;
}) {
  const [input, setInput] = useState("");

  function addKeyword() {
    const kw = input.trim().toLowerCase();
    if (kw && !keywords.includes(kw)) {
      onChange([...keywords, kw]);
      setInput("");
    }
  }

  function removeKeyword(kw: string) {
    onChange(keywords.filter((k) => k !== kw));
  }

  return (
    <div className="flex flex-col gap-2">
      <Label>Mots-clés négatifs (offres exclues du scoring)</Label>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addKeyword())}
          placeholder="ex: PHP, stage, alternance"
        />
        <Button onClick={addKeyword} variant="outline" type="button">
          Ajouter
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {keywords.map((kw) => (
          <span
            key={kw}
            className="bg-muted flex items-center gap-1 rounded-full px-3 py-1 text-sm"
          >
            {kw}
            <button
              onClick={() => removeKeyword(kw)}
              className="text-muted-foreground hover:text-foreground ml-1"
              aria-label={`Supprimer ${kw}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
