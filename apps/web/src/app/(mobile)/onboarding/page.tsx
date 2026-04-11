"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { ExtractedProfile } from "@jobfindeer/validators";
import type { ExtractionMetrics } from "~/lib/extract-cv";
import type { IntentResult, IntentMetrics } from "~/lib/intent-analyzer";
import { useTRPC } from "~/trpc/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CvUpload } from "./_components/CvUpload";
import { ProfileReview } from "./_components/ProfileReview";
import { FreeTextInput } from "./_components/FreeTextInput";
import {
  IntentValidation,
  BranchSelect,
} from "./_components/IntentValidation";
import { BranchCalibration } from "./_components/BranchCalibration";
import { CommonQuestions, type CommonPrefs } from "./_components/CommonQuestions";
import { TitleValidation } from "./_components/TitleValidation";
import { StepNavigation } from "./_components/StepNavigation";
import { buildTitleGenParams } from "~/lib/title-params";
import type { SearchTitle, SearchTitleWithActive } from "@jobfindeer/validators";

const STEPS = [
  "upload",
  "review",
  "freetext",
  "intent",
  "calibration",
  "common",
  "titles",
] as const;
type Step = (typeof STEPS)[number];

const STEP_LABELS: Record<Step, string> = {
  upload: "CV",
  review: "Profil",
  freetext: "Objectif",
  intent: "Branche",
  calibration: "Calibrage",
  common: "Preferences",
  titles: "Titres",
};

/** Determine which steps are already completed based on server data */
function computeCompletedSteps(
  profile: { rawExtraction?: unknown; freeTextRaw?: string | null; branch?: string | null; calibrationAnswers?: unknown; searchTitles?: unknown } | null,
  preferences: { contractTypes?: string[] | null } | null,
): Set<Step> {
  const completed = new Set<Step>();
  if (!profile?.rawExtraction) return completed;
  completed.add("upload");
  completed.add("review");
  if (!profile.freeTextRaw) return completed;
  completed.add("freetext");
  if (!profile.branch) return completed;
  completed.add("intent");
  if (!profile.calibrationAnswers) return completed;
  completed.add("calibration");
  if (!preferences?.contractTypes?.length) return completed;
  completed.add("common");
  if (!profile.searchTitles) return completed;
  completed.add("titles");
  return completed;
}

/** Find the first step not in the completed set */
function firstIncompleteStep(completed: Set<Step>): Step {
  for (const s of STEPS) {
    if (!completed.has(s)) return s;
  }
  return "titles"; // all done — show last step
}

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>("upload");
  const [extraction, setExtraction] = useState<ExtractedProfile | null>(null);
  const [metrics, setMetrics] = useState<ExtractionMetrics | null>(null);
  const [intentResult, setIntentResult] = useState<IntentResult | null>(null);
  const [intentMetrics, setIntentMetrics] = useState<IntentMetrics | null>(null);
  const [freeText, setFreeText] = useState("");
  const [branch, setBranch] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [calibrationData, setCalibrationData] = useState<Record<string, unknown> | null>(null);
  const [showBranchSelect, setShowBranchSelect] = useState(false);
  const [generatedTitles, setGeneratedTitles] = useState<SearchTitle[]>([]);
  const [generatingTitles, setGeneratingTitles] = useState(false);
  const [savingTitles, setSavingTitles] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const router = useRouter();
  const trpc = useTRPC();

  // Load existing profile data
  const { data: profileData, isError: profileError } = useQuery(trpc.profile.get.queryOptions());

  // Compute which steps are already completed from server data
  const completedSteps = useMemo(
    () => computeCompletedSteps(profileData?.profile ?? null, profileData?.preferences ?? null),
    [profileData],
  );

  // On first load: pre-fill local state from server and jump to first incomplete step
  useEffect(() => {
    if (hydrated) return;
    // On query error, fallback to starting from scratch
    if (profileError) {
      setHydrated(true);
      return;
    }
    if (!profileData) return;
    const { profile, preferences } = profileData;
    if (!profile) {
      setHydrated(true);
      return;
    }

    // Pre-fill extraction from rawExtraction
    if (profile.rawExtraction) {
      const raw = profile.rawExtraction as ExtractedProfile;
      setExtraction({
        currentTitle: raw.currentTitle ?? profile.currentTitle ?? null,
        currentLocation: raw.currentLocation ?? profile.currentLocation ?? null,
        experienceYears: raw.experienceYears ?? profile.experienceYears ?? null,
        hardSkills: raw.hardSkills ?? (profile.hardSkills as string[]) ?? [],
        softSkills: raw.softSkills ?? (profile.softSkills as string[]) ?? [],
        languages: raw.languages ?? (profile.languages as { name: string; level: string | null }[]) ?? [],
        educationLevel: raw.educationLevel ?? profile.educationLevel ?? null,
        workHistory: raw.workHistory ?? [],
        education: raw.education ?? [],
        certifications: raw.certifications ?? [],
      });
    }

    if (profile.branch) {
      setBranch(profile.branch);
    }
    if (profile.freeTextRaw) {
      setFreeText(profile.freeTextRaw);
    }
    if (profile.calibrationAnswers) {
      setCalibrationData(profile.calibrationAnswers as Record<string, unknown>);
    }
    if (profile.searchTitles) {
      const st = profile.searchTitles as { titles: SearchTitle[] };
      setGeneratedTitles(st.titles ?? []);
    }

    // If branch exists but no intentResult, pre-set showBranchSelect for safe "intent" step rendering
    if (profile.branch) {
      setShowBranchSelect(true);
    }

    setStep(firstIncompleteStep(completedSteps));
    setHydrated(true);
  }, [profileData, profileError, hydrated, completedSteps]);

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

  async function handleFreeTextSubmit(text: string, model: string) {
    setFreeText(text);
    setAnalyzing(true);

    try {
      const res = await fetch("/api/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          freeText: text,
          model,
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
        setIntentMetrics(null);
        setStep("intent");
      } else {
        setIntentResult(data.intent as IntentResult);
        setIntentMetrics(data.metrics as IntentMetrics);
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
  const saveSearchTitles = useMutation(
    trpc.profile.saveSearchTitles.mutationOptions(),
  );

  async function handleCalibrationComplete(
    calibrationAnswers: Record<string, unknown>,
  ) {
    if (!branch) return;
    setCalibrationData(calibrationAnswers);
    await saveBranch.mutateAsync({
      branch: branch as "1" | "2" | "3" | "4" | "5",
      freeTextRaw: freeText,
      calibrationAnswers,
    });
    setStep("common");
  }

  async function handleCommonComplete(prefs: CommonPrefs) {
    const remotePreference =
      prefs.locationMode === "remote_only" || prefs.remoteFriendly
        ? "remote"
        : "any";

    const locations =
      prefs.locationMode === "france"
        ? [{ label: "France entiere", radius: null }]
        : prefs.cities.map((c) => ({ label: c, radius: 25 }));

    await updatePreferences.mutateAsync({
      contractTypes: prefs.contractTypes,
      remotePreference,
      locations,
    });

    // Generate titles via LLM
    setGeneratingTitles(true);
    try {
      const params = buildTitleGenParams(branch, extraction ?? {}, calibrationData as Record<string, unknown>);
      const res = await fetch("/api/generate-titles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ params }),
      });
      const data = await res.json();
      setGeneratedTitles(data.titles ?? []);
    } catch {
      setGeneratedTitles([]);
    } finally {
      setGeneratingTitles(false);
    }
    setStep("titles");
  }

  async function handleTitlesComplete(validated: SearchTitleWithActive[]) {
    if (!branch) return;
    setSavingTitles(true);
    try {
      await saveSearchTitles.mutateAsync({
        generated_at: new Date().toISOString(),
        branch_used: branch as "1" | "2" | "3" | "4" | "5",
        titles: validated,
      });
      router.push("/feed");
    } finally {
      setSavingTitles(false);
    }
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

  /** Navigate to a step safely — ensures "intent" step has a visible UI */
  function goToStep(target: Step) {
    if (target === "intent" && !intentResult) {
      setShowBranchSelect(true);
    }
    setStep(target);
  }

  // Show loading while fetching profile
  if (!hydrated) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 p-6 py-12">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
        <p className="text-muted-foreground text-sm">Chargement du profil...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md p-6">
      <div className="mb-6 flex gap-2">
        {STEPS.map((s, i) => {
          const isCompleted = completedSteps.has(s);
          const isCurrent = stepIndex === i;
          return (
            <button
              key={s}
              type="button"
              disabled={!isCompleted}
              onClick={() => isCompleted && goToStep(s)}
              className={`h-2 flex-1 rounded transition-colors ${
                isCurrent
                  ? "bg-primary"
                  : isCompleted
                    ? "bg-primary/60 hover:bg-primary/80 cursor-pointer"
                    : "bg-muted cursor-default"
              }`}
              title={isCompleted ? `Revenir a : ${STEP_LABELS[s]}` : STEP_LABELS[s]}
            />
          );
        })}
      </div>

      {step === "upload" && (
        <>
          <CvUpload onExtracted={handleExtracted} />
          <RawJsonBypass
            onLoad={(profile) => {
              setExtraction(profile);
              setMetrics(null);
              setStep("review");
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

      {step === "intent" && (
        <>
          {showBranchSelect ? (
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
          ) : null}
          {intentMetrics && <IntentMetricsPanel metrics={intentMetrics} />}
        </>
      )}

      {step === "calibration" && branch && (
        <BranchCalibration
          branch={branch}
          onComplete={handleCalibrationComplete}
          loading={saveBranch.isPending}
          studyFieldHint={extraction?.education?.[0]?.degree ?? null}
        />
      )}

      {step === "common" && branch && (
        <CommonQuestions
          branch={branch}
          onComplete={handleCommonComplete}
          loading={updatePreferences.isPending}
          calibrationContractType={calibrationData?.contractType as string | undefined}
        />
      )}

      {step === "titles" && (
        <>
          {generatingTitles ? (
            <div className="flex flex-col items-center gap-4 py-12">
              <div className="border-primary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
              <p className="text-muted-foreground text-sm">Generation des titres de poste...</p>
            </div>
          ) : generatedTitles.length === 0 ? (
            <div className="space-y-4 py-8 text-center">
              <p className="text-muted-foreground text-sm">
                La generation des titres a echoue. Tu peux reessayer ou ajouter tes titres manuellement.
              </p>
              <div className="flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setStep("common");
                    // re-trigger will happen when handleCommonComplete runs again
                  }}
                  className="bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md px-4 py-2 text-sm font-medium"
                >
                  Reessayer
                </button>
                <button
                  type="button"
                  onClick={() => setGeneratedTitles([{ fr: extraction?.currentTitle ?? "Mon poste", en: null }])}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 text-sm font-medium"
                >
                  Ajouter manuellement
                </button>
              </div>
            </div>
          ) : (
            <TitleValidation
              key={JSON.stringify(generatedTitles)}
              titles={generatedTitles}
              onComplete={handleTitlesComplete}
              loading={savingTitles}
            />
          )}
        </>
      )}

      <StepNavigation
        onBack={goBack}
        onNext={() => {}}
        canGoBack={stepIndex > 0}
        canGoNext={false}
        canSkip={completedSteps.has(step) && stepIndex < STEPS.length - 1}
        onSkip={() => {
          const nextIdx = stepIndex + 1;
          if (nextIdx < STEPS.length) goToStep(STEPS[nextIdx]!);
        }}
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

function IntentMetricsPanel({ metrics }: { metrics: IntentMetrics }) {
  return (
    <div className="mt-6 rounded-lg border p-4">
      <h3 className="mb-3 text-sm font-semibold">Metrics IA — Analyse intention</h3>
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
      <details className="mt-3">
        <summary className="text-muted-foreground cursor-pointer text-xs">Sortie brute LLM</summary>
        <pre className="bg-muted mt-2 max-h-48 overflow-auto rounded p-2 font-mono text-xs">
          {JSON.stringify(metrics.rawOutput, null, 2)}
        </pre>
      </details>
    </div>
  );
}
