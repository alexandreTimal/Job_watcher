"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ExtractedProfile, Preferences } from "@jobfindeer/validators";
import type { ExtractionMetrics } from "~/lib/extract-cv";
import { useTRPC } from "~/trpc/react";
import { useMutation } from "@tanstack/react-query";
import { CvUpload } from "./_components/CvUpload";
import { ProfileReview } from "./_components/ProfileReview";
import { PreferencesForm } from "./_components/PreferencesForm";

type Step = "upload" | "review" | "preferences" | "done";

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>("upload");
  const [extraction, setExtraction] = useState<ExtractedProfile | null>(null);
  const [metrics, setMetrics] = useState<ExtractionMetrics | null>(null);
  const router = useRouter();
  const trpc = useTRPC();

  const saveProfile = useMutation(trpc.profile.saveExtraction.mutationOptions());
  const savePrefs = useMutation(trpc.profile.updatePreferences.mutationOptions());

  function handleExtracted(profile: ExtractedProfile, _filepath: string, m: ExtractionMetrics) {
    setExtraction(profile);
    setMetrics(m);
    setStep("review");
  }

  async function handleProfileConfirm(profile: ExtractedProfile) {
    await saveProfile.mutateAsync(profile);
    setStep("preferences");
  }

  async function handlePreferencesSave(prefs: Preferences) {
    await savePrefs.mutateAsync(prefs);
    setStep("done");
    router.push("/feed");
  }

  return (
    <div className="mx-auto max-w-md p-6">
      <div className="mb-6 flex gap-2">
        {["upload", "review", "preferences"].map((s, i) => (
          <div
            key={s}
            className={`h-1 flex-1 rounded ${
              ["upload", "review", "preferences"].indexOf(step) >= i
                ? "bg-primary"
                : "bg-muted"
            }`}
          />
        ))}
      </div>

      {step === "upload" && <CvUpload onExtracted={handleExtracted} />}
      {step === "review" && extraction && (
        <>
          <ProfileReview profile={extraction} onConfirm={handleProfileConfirm} />
          {metrics && <MetricsPanel metrics={metrics} />}
        </>
      )}
      {step === "preferences" && <PreferencesForm onSave={handlePreferencesSave} />}
    </div>
  );
}

function MetricsPanel({ metrics }: { metrics: ExtractionMetrics }) {
  return (
    <div className="mt-6 rounded-lg border p-4">
      <h3 className="mb-3 text-sm font-semibold">Metrics IA — Extraction CV</h3>
      <div className="grid grid-cols-2 gap-y-1.5 text-xs">
        <div className="text-muted-foreground">Modele</div>
        <div className="font-mono">{metrics.modelLabel}</div>
        <div className="text-muted-foreground">Duree</div>
        <div className="font-mono">{(metrics.durationMs / 1000).toFixed(1)}s</div>
        <div className="text-muted-foreground">Tokens IN</div>
        <div className="font-mono">{metrics.tokensIn.toLocaleString()}</div>
        <div className="text-muted-foreground">Tokens OUT</div>
        <div className="font-mono">{metrics.tokensOut.toLocaleString()}</div>
        <div className="text-muted-foreground">Tokens total</div>
        <div className="font-mono">{metrics.tokensTotal.toLocaleString()}</div>
        <div className="text-muted-foreground">Cout unitaire</div>
        <div className="font-mono">${metrics.costUsd.toFixed(6)}</div>
        <div className="text-muted-foreground">Cout x100 users</div>
        <div className="font-mono">${metrics.costPer100.toFixed(4)}</div>
      </div>

      <details className="mt-3">
        <summary className="text-muted-foreground cursor-pointer text-xs">Raw usage (SDK)</summary>
        <pre className="mt-2 overflow-auto rounded bg-black/5 p-2 text-xs dark:bg-white/5">
          {JSON.stringify(metrics.rawUsage, null, 2)}
        </pre>
      </details>

      <details className="mt-2">
        <summary className="text-muted-foreground cursor-pointer text-xs">Raw extraction</summary>
        <textarea
          readOnly
          value={JSON.stringify(metrics.rawExtraction, null, 2)}
          className="border-input bg-background mt-2 w-full resize-y rounded border p-2 font-mono text-xs"
          rows={10}
        />
      </details>
    </div>
  );
}
