"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ExtractedProfile, Preferences } from "@jobfindeer/validators";
import { useTRPC } from "~/trpc/react";
import { useMutation } from "@tanstack/react-query";
import { CvUpload } from "./_components/CvUpload";
import { ProfileReview } from "./_components/ProfileReview";
import { PreferencesForm } from "./_components/PreferencesForm";

type Step = "upload" | "review" | "preferences" | "done";

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>("upload");
  const [extraction, setExtraction] = useState<ExtractedProfile | null>(null);
  const router = useRouter();
  const trpc = useTRPC();

  const saveProfile = useMutation(trpc.profile.saveExtraction.mutationOptions());
  const savePrefs = useMutation(trpc.profile.updatePreferences.mutationOptions());

  function handleExtracted(profile: ExtractedProfile) {
    setExtraction(profile);
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
        <ProfileReview profile={extraction} onConfirm={handleProfileConfirm} />
      )}
      {step === "preferences" && <PreferencesForm onSave={handlePreferencesSave} />}
    </div>
  );
}
