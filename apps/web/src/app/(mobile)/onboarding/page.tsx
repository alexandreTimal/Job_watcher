"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ExtractedProfile } from "@jobfindeer/validators";
import type { ExtractionMetrics } from "~/lib/extract-cv";
import { useTRPC } from "~/trpc/react";
import { useMutation } from "@tanstack/react-query";
import { CvUpload } from "./_components/CvUpload";
import { ProfileReview } from "./_components/ProfileReview";
import { ChatQuestionnaire } from "./_components/ChatQuestionnaire";
import { StepNavigation } from "./_components/StepNavigation";
import { DEMO_QUESTIONS } from "./_lib/demo-questions";
import { createInitialState } from "./_lib/questionnaire-types";
import type { QuestionnaireState } from "./_lib/questionnaire-types";

const STEPS = ["upload", "review", "questionnaire"] as const;
type Step = (typeof STEPS)[number];

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>("upload");
  const [extraction, setExtraction] = useState<ExtractedProfile | null>(null);
  const [metrics, setMetrics] = useState<ExtractionMetrics | null>(null);
  const [questionnaireState, setQuestionnaireState] =
    useState<QuestionnaireState>(() => createInitialState(DEMO_QUESTIONS));
  const router = useRouter();
  const trpc = useTRPC();

  const saveProfile = useMutation(trpc.profile.saveExtraction.mutationOptions());

  const stepIndex = STEPS.indexOf(step);

  const isQuestionnaireComplete =
    questionnaireState.answers.length === questionnaireState.questions.length &&
    questionnaireState.currentQuestionIndex === questionnaireState.questions.length - 1;

  function handleExtracted(profile: ExtractedProfile, _filepath: string, m: ExtractionMetrics) {
    setExtraction(profile);
    setMetrics(m);
    setQuestionnaireState(createInitialState(DEMO_QUESTIONS));
    setStep("review");
  }

  async function handleProfileConfirm(profile: ExtractedProfile) {
    await saveProfile.mutateAsync(profile);
    setStep("questionnaire");
  }

  function goBack() {
    if (stepIndex > 0) {
      setStep(STEPS[stepIndex - 1]!);
    }
  }

  function goNext() {
    if (step === "upload" && extraction) {
      setStep("review");
    } else if (step === "review" && extraction) {
      handleProfileConfirm(extraction);
    } else if (step === "questionnaire" && isQuestionnaireComplete) {
      router.push("/feed");
    }
  }

  const canGoNext =
    (step === "upload" && extraction !== null) ||
    (step === "review" && extraction !== null && !saveProfile.isPending) ||
    (step === "questionnaire" && isQuestionnaireComplete);

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
          <RawJsonBypass onLoad={(profile) => {
            setExtraction(profile);
            setMetrics(null);
          }} />
        </>
      )}
      {step === "review" && extraction && (
        <>
          <ProfileReview profile={extraction} onConfirm={handleProfileConfirm} />
          {metrics && <MetricsPanel metrics={metrics} />}
        </>
      )}
      {step === "questionnaire" && (
        <ChatQuestionnaire
          state={questionnaireState}
          onChange={setQuestionnaireState}
        />
      )}

      <StepNavigation
        onBack={goBack}
        onNext={goNext}
        canGoBack={stepIndex > 0}
        canGoNext={canGoNext}
        nextLabel={step === "questionnaire" && isQuestionnaireComplete ? "Terminer" : undefined}
      />
    </div>
  );
}

function RawJsonBypass({ onLoad }: { onLoad: (profile: ExtractedProfile) => void }) {
  const [json, setJson] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleLoad() {
    try {
      const parsed = JSON.parse(json);
      // Accept both LLM raw output (snake_case) and ExtractedProfile format
      const profile: ExtractedProfile = {
        currentTitle: parsed.currentTitle ?? parsed.current_title ?? null,
        currentLocation: parsed.currentLocation ?? parsed.location ?? null,
        experienceYears: parsed.experienceYears ?? parsed.experience_years ?? null,
        hardSkills: parsed.hardSkills ?? parsed.hard_skills ?? [],
        softSkills: parsed.softSkills ?? parsed.soft_skills ?? [],
        languages: parsed.languages ?? [],
        educationLevel: parsed.educationLevel ?? parsed.education_level ?? null,
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
          placeholder='Colle ici le JSON raw d extraction (format LLM ou ExtractedProfile)'
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
