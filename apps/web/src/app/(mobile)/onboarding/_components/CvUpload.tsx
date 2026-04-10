"use client";

import { useState } from "react";
import { Button } from "@jobfindeer/ui/button";
import { Label } from "@jobfindeer/ui/label";
import type { ExtractedProfile } from "@jobfindeer/validators";
import { AVAILABLE_MODELS, type ExtractionMetrics } from "~/lib/extract-cv";

export function CvUpload({
  onExtracted,
}: {
  onExtracted: (profile: ExtractedProfile, filepath: string, metrics: ExtractionMetrics) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modelId, setModelId] = useState("gemini-3.1-flash-lite-preview");

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("cv", file);
    formData.append("model", modelId);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();

      if (data.extraction) {
        onExtracted(data.extraction, data.filepath, data.metrics);
      } else {
        setError("L'extraction a échoué. Tu peux réessayer ou saisir manuellement.");
      }
    } catch {
      setError("Erreur réseau. Réessaie.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">Upload ton CV</h2>
      <p className="text-muted-foreground text-sm">
        On extrait automatiquement tes compétences et ton expérience.
      </p>
      <div>
        <Label htmlFor="model">Modele IA</Label>
        <select
          id="model"
          value={modelId}
          onChange={(e) => setModelId(e.target.value)}
          disabled={loading}
          className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
        >
          {AVAILABLE_MODELS.map((m) => (
            <option key={m.id} value={m.id}>{m.label}</option>
          ))}
        </select>
      </div>
      <input
        type="file"
        accept="application/pdf"
        onChange={handleUpload}
        disabled={loading}
        className="file:bg-primary file:text-primary-foreground file:rounded-md file:border-0 file:px-4 file:py-2 file:text-sm"
      />
      {loading && <p className="text-muted-foreground text-sm">Extraction en cours...</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
