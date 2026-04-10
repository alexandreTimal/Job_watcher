"use client";

import { useState } from "react";

interface FreeTextInputProps {
  onSubmit: (text: string) => void;
  loading?: boolean;
}

export function FreeTextInput({ onSubmit, loading }: FreeTextInputProps) {
  const [text, setText] = useState("");
  const charCount = text.length;
  const isValid = charCount >= 100 && charCount <= 500;

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
        maxLength={500}
      />

      <div className="flex items-center justify-between text-xs">
        <span
          className={
            charCount < 100
              ? "text-muted-foreground"
              : charCount <= 500
                ? "text-green-600"
                : "text-destructive"
          }
        >
          {charCount}/500 caractères {charCount < 100 && `(min. 100)`}
        </span>
        <button
          onClick={() => onSubmit(text)}
          disabled={!isValid || loading}
          className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {loading ? "Analyse en cours..." : "Analyser"}
        </button>
      </div>
    </div>
  );
}
