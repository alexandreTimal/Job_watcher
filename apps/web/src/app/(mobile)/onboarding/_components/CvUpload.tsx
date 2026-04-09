"use client";

import { useState } from "react";
import { Button } from "@jobfindeer/ui/button";
import type { ExtractedProfile } from "@jobfindeer/validators";

export function CvUpload({
  onExtracted,
}: {
  onExtracted: (profile: ExtractedProfile, filepath: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("cv", file);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();

      if (data.extraction) {
        onExtracted(data.extraction, data.filepath);
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
