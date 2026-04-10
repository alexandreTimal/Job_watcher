"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ExtractedProfile } from "@jobfindeer/validators";
import type { ExtractionMetrics } from "~/lib/extract-cv";
import type { IntentResult } from "~/lib/intent-analyzer";
import { useTRPC } from "~/trpc/react";
import { useMutation } from "@tanstack/react-query";
import { CvUpload } from "./_components/CvUpload";
import { ProfileReview } from "./_components/ProfileReview";
import { FreeTextInput } from "./_components/FreeTextInput";
import {
  IntentValidation,
  BranchSelect,
} from "./_components/IntentValidation";
import { BranchCalibration } from "./_components/BranchCalibration";
import { CommonQuestions, type CommonPrefs } from "./_components/CommonQuestions";
import { StepNavigation } from "./_components/StepNavigation";

const STEPS = [
  "upload",
  "review",
  "freetext",
  "intent",
  "calibration",
  "common",
] as const;
type Step = (typeof STEPS)[number];

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>("upload");
  const [extraction, setExtraction] = useState<ExtractedProfile | null>(null);
  const [metrics, setMetrics] = useState<ExtractionMetrics | null>(null);
  const [intentResult, setIntentResult] = useState<IntentResult | null>(null);
  const [freeText, setFreeText] = useState("");
  const [branch, setBranch] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [showBranchSelect, setShowBranchSelect] = useState(false);
  const router = useRouter();
  const trpc = useTRPC();

  const saveProfile = useMutation(
    trpc.profile.saveExtraction.mutationOptions(),
  );
  const saveBranch = useMutation(trpc.profile.saveBranch.mutationOptions());

  const stepIndex = STEPS.indexOf(step);

  function handleExtracted(
    profile: ExtractedProfile,
    _filepath: string,
    m: ExtractionMetrics,
  ) {
    setExtraction(profile);
    setMetrics(m);
    setStep("review");
  }

  async function handleProfileConfirm(profile: ExtractedProfile) {
    await saveProfile.mutateAsync(profile);
    setStep("freetext");
  }

  async function handleFreeTextSubmit(text: string) {
    setFreeText(text);
    setAnalyzing(true);

    try {
      const res = await fetch("/api/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          freeText: text,
          profile: extraction
            ? {
                currentTitle: extraction.currentTitle,
                experienceYears: extraction.experienceYears,
                hardSkills: extraction.hardSkills,
                softSkills: extraction.softSkills,
              }
            : null,
        }),
      });

      const data = await res.json();

      if (data.fallback || data.error) {
        // LLM failed — show branch select directly
        setShowBranchSelect(true);
        setStep("intent");
      } else {
        setIntentResult(data as IntentResult);
        setStep("intent");
      }
    } catch {
      setShowBranchSelect(true);
      setStep("intent");
    } finally {
      setAnalyzing(false);
    }
  }

  function handleIntentConfirm(selectedBranch: string) {
    setBranch(selectedBranch);
    setStep("calibration");
  }

  function handleIntentCorrect(preselectedBranch: string) {
    setShowBranchSelect(true);
    setIntentResult((prev) =>
      prev ? { ...prev, branch: preselectedBranch } : null,
    );
  }

  function handleIntentReject() {
    setShowBranchSelect(true);
    setIntentResult(null);
  }

  const updatePreferences = useMutation(
    trpc.profile.updatePreferences.mutationOptions(),
  );

  async function handleCalibrationComplete(
    calibrationAnswers: Record<string, unknown>,
  ) {
    if (!branch) return;
    await saveBranch.mutateAsync({
      branch: branch as "1" | "2" | "3" | "4" | "5",
      freeTextRaw: freeText,
      calibrationAnswers,
    });
    setStep("common");
  }

  async function handleCommonComplete(prefs: CommonPrefs) {
    await updatePreferences.mutateAsync({
      contractTypes: prefs.contractTypes,
      remotePreference: prefs.remoteFriendly ? "remote" : "any",
      locations: prefs.cities.map((c) => ({ label: c, radius: 25 })),
    });
    router.push("/feed");
  }

  function goBack() {
    if (stepIndex > 0) {
      setStep(STEPS[stepIndex - 1]!);
      if (step === "intent") {
        setShowBranchSelect(false);
        setIntentResult(null);
      }
    }
  }

  return (
    <div className="mx-auto max-w-md p-6">
      <div className="mb-6 flex gap-2">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={`h-1 flex-1 rounded ${
              stepIndex >= i ? "bg-primary" : "bg-muted"
            }`}
          />
        ))}
      </div>

      {step === "upload" && (
        <>
          <CvUpload onExtracted={handleExtracted} />
          <RawJsonBypass
            onLoad={(profile) => {
              setExtraction(profile);
              setMetrics(null);
            }}
          />
        </>
      )}

      {step === "review" && extraction && (
        <>
          <ProfileReview
            profile={extraction}
            onConfirm={handleProfileConfirm}
          />
          {metrics && <MetricsPanel metrics={metrics} />}
        </>
      )}

      {step === "freetext" && (
        <FreeTextInput onSubmit={handleFreeTextSubmit} loading={analyzing} />
      )}

      {step === "intent" &&
        (showBranchSelect ? (
          <BranchSelect
            onSelect={handleIntentConfirm}
            preselected={intentResult?.branch ?? null}
          />
        ) : intentResult ? (
          <IntentValidation
            result={intentResult}
            onConfirm={handleIntentConfirm}
            onCorrect={handleIntentCorrect}
            onReject={handleIntentReject}
          />
        ) : null)}

      {step === "calibration" && branch && (
        <BranchCalibration
          branch={branch}
          onComplete={handleCalibrationComplete}
          loading={saveBranch.isPending}
        />
      )}

      {step === "common" && branch && (
        <CommonQuestions
          branch={branch}
          onComplete={handleCommonComplete}
          loading={updatePreferences.isPending}
        />
      )}

      <StepNavigation
        onBack={goBack}
        onNext={() => {}}
        canGoBack={stepIndex > 0}
        canGoNext={false}
        nextLabel={undefined}
      />
    </div>
  );
}

function RawJsonBypass({
  onLoad,
}: {
  onLoad: (profile: ExtractedProfile) => void;
}) {
  const [json, setJson] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleLoad() {
    try {
      const parsed = JSON.parse(json);
      const profile: ExtractedProfile = {
        currentTitle: parsed.currentTitle ?? parsed.current_title ?? null,
        currentLocation: parsed.currentLocation ?? parsed.location ?? null,
        experienceYears:
          parsed.experienceYears ?? parsed.experience_years ?? null,
        hardSkills: parsed.hardSkills ?? parsed.hard_skills ?? [],
        softSkills: parsed.softSkills ?? parsed.soft_skills ?? [],
        languages: parsed.languages ?? [],
        educationLevel:
          parsed.educationLevel ?? parsed.education_level ?? null,
        workHistory: parsed.workHistory ?? parsed.work_history ?? [],
        education: parsed.education ?? [],
        certifications: parsed.certifications ?? [],
      };
      setError(null);
      onLoad(profile);
    } catch {
      setError("JSON invalide");
    }
  }

  return (
    <details className="mt-6 rounded-lg border p-4">
      <summary className="text-muted-foreground cursor-pointer text-sm font-medium">
        Dev : charger un JSON brut (bypass IA)
      </summary>
      <div className="mt-3 flex flex-col gap-2">
        <textarea
          value={json}
          onChange={(e) => setJson(e.target.value)}
          placeholder="Colle ici le JSON raw d extraction (format LLM ou ExtractedProfile)"
          className="border-input bg-background w-full resize-y rounded border p-2 font-mono text-xs"
          rows={8}
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button
          onClick={handleLoad}
          className="bg-muted hover:bg-muted/80 rounded px-3 py-1.5 text-xs font-medium"
        >
          Charger ce profil
        </button>
      </div>
    </details>
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
        <div className="font-mono">
          {(metrics.durationMs / 1000).toFixed(1)}s
        </div>
        <div className="text-muted-foreground">Tokens IN</div>
        <div className="font-mono">{metrics.tokensIn.toLocaleString()}</div>
        <div className="text-muted-foreground">Tokens OUT</div>
        <div className="font-mono">{metrics.tokensOut.toLocaleString()}</div>
        <div className="text-muted-foreground">Cout unitaire</div>
        <div className="font-mono">${metrics.costUsd.toFixed(6)}</div>
      </div>
    </div>
  );
}
