"use client";

import { useState } from "react";

const INTENT_MODELS = [
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { id: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite" },
  { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  { id: "gemini-3-flash-preview", label: "Gemini 3 Flash (preview)" },
  { id: "gemini-3-pro-preview", label: "Gemini 3 Pro (preview)" },
  { id: "gemini-3.1-flash-lite-preview", label: "Gemini 3.1 Flash Lite (preview)" },
  { id: "gemini-3.1-pro-preview", label: "Gemini 3.1 Pro (preview)" },
];

interface FreeTextInputProps {
  onSubmit: (text: string, model: string) => void;
  loading?: boolean;
}

export function FreeTextInput({ onSubmit, loading }: FreeTextInputProps) {
  const [text, setText] = useState("");
  const [model, setModel] = useState("gemini-2.5-flash");
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
        <div className="flex items-center gap-2">
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            disabled={loading}
            className="border-input bg-background rounded-md border px-2 py-1.5 text-xs"
          >
            {INTENT_MODELS.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
          <button
            onClick={() => onSubmit(text, model)}
            disabled={!isValid || loading}
            className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {loading ? "Analyse en cours..." : "Analyser"}
          </button>
        </div>
      </div>
    </div>
  );
}
