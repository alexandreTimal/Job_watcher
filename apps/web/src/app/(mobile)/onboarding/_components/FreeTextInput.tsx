"use client";

import { useState } from "react";
import { Button } from "@jobfindeer/ui/button";
import { AVAILABLE_MODELS } from "~/lib/model-config";

interface FreeTextInputProps {
  onSubmit: (text: string, model: string) => void;
  loading?: boolean;
  initialText?: string;
}

export function FreeTextInput({ onSubmit, loading, initialText }: FreeTextInputProps) {
  const [text, setText] = useState(initialText ?? "");
  const [model, setModel] = useState<string>("gemini-2.5-flash");
  const charCount = text.length;
  const isValid = charCount >= 100 && charCount <= 5000;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Parle-moi de ta recherche</h2>
      <p className="text-muted-foreground text-sm">
        Raconte-moi ce qui t&apos;amène ici : ce que tu fais, ce que tu
        cherches, ce que tu veux éviter.
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Ex: Je suis développeur full-stack depuis 5 ans dans une startup. Je cherche un CDI avec plus de télétravail et un meilleur salaire, idéalement dans une boîte plus structurée..."
        className="border-input bg-background min-h-[150px] w-full resize-y rounded-md border p-3 text-sm"
        maxLength={5000}
      />

      <div className="flex items-center justify-between text-xs">
        <span
          className={
            charCount < 100
              ? "text-muted-foreground"
              : charCount <= 5000
                ? "text-green-600"
                : "text-destructive"
          }
        >
          {charCount}/5000 caractères {charCount < 100 && `(min. 100)`}
        </span>
        <div className="flex items-center gap-2">
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            disabled={loading}
            aria-label="Modèle LLM d'analyse"
            className="border-input bg-background rounded-md border px-2 py-1.5 text-xs"
          >
            {AVAILABLE_MODELS.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
          <Button
            type="button"
            onClick={() => onSubmit(text, model)}
            disabled={!isValid || loading}
          >
            {loading ? "Analyse en cours..." : "Analyser"}
          </Button>
        </div>
      </div>
    </div>
  );
}
