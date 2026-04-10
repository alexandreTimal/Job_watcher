"use client";

import { useTRPC } from "~/trpc/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Preferences } from "@jobfindeer/validators";
import { PreferencesEditor } from "./_components/PreferencesEditor";

export default function SettingsPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery(trpc.profile.get.queryOptions());

  const updatePrefs = useMutation({
    ...trpc.profile.updatePreferences.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trpc.profile.get.queryKey() });
    },
  });

  if (isLoading) return <div className="p-8">Chargement...</div>;

  const profile = data?.profile;

  const currentPrefs: Preferences = {
    contractTypes: (data?.preferences?.contractTypes as string[]) ?? [],
    salaryMin: data?.preferences?.salaryMin ?? null,
    salaryMax: data?.preferences?.salaryMax ?? null,
    remotePreference: (data?.preferences?.remotePreference as Preferences["remotePreference"]) ?? "any",
    sectors: (data?.preferences?.sectors as string[]) ?? [],
    locations: (data?.preferences?.locations as { label: string; radius: number | null }[]) ?? [],
    negativeKeywords: (data?.preferences?.negativeKeywords as string[]) ?? [],
  };

  return (
    <div className="mx-auto max-w-2xl p-8">
      {/* Profile Section */}
      <h1 className="mb-6 text-2xl font-bold">Mon profil</h1>
      {profile ? (
        <div className="mb-8 rounded-lg border p-6">
          <div className="grid gap-4">
            <div className="flex items-baseline justify-between">
              <span className="text-muted-foreground text-sm">Poste actuel</span>
              <span className="font-medium">{profile.currentTitle ?? "—"}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-muted-foreground text-sm">Localisation</span>
              <span className="font-medium">{profile.currentLocation ?? "—"}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-muted-foreground text-sm">Experience</span>
              <span className="font-medium">{profile.experienceYears != null ? `${profile.experienceYears} ans` : "—"}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-muted-foreground text-sm">Niveau d'etudes</span>
              <span className="font-medium">{profile.educationLevel ?? "—"}</span>
            </div>

            {((profile.hardSkills as string[]) ?? []).length > 0 && (
              <div>
                <span className="text-muted-foreground text-sm">Competences techniques</span>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {((profile.hardSkills as string[]) ?? []).map((s) => (
                    <span key={s} className="bg-primary/10 text-primary rounded-full px-2.5 py-0.5 text-xs font-medium">{s}</span>
                  ))}
                </div>
              </div>
            )}

            {((profile.softSkills as string[]) ?? []).length > 0 && (
              <div>
                <span className="text-muted-foreground text-sm">Soft skills</span>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {((profile.softSkills as string[]) ?? []).map((s) => (
                    <span key={s} className="bg-muted rounded-full px-2.5 py-0.5 text-xs">{s}</span>
                  ))}
                </div>
              </div>
            )}

            {((profile.languages as { name: string; level: string | null }[]) ?? []).length > 0 && (
              <div>
                <span className="text-muted-foreground text-sm">Langues</span>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {((profile.languages as { name: string; level: string | null }[]) ?? []).map((l) => (
                    <span key={l.name} className="bg-muted rounded-full px-2.5 py-0.5 text-xs">
                      {l.name}{l.level ? ` (${l.level})` : ""}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <a href="/onboarding" className="text-primary mt-4 inline-block text-sm hover:underline">
            Re-analyser mon CV
          </a>
        </div>
      ) : (
        <div className="mb-8 rounded-lg border p-6 text-center">
          <p className="text-muted-foreground">Aucun profil extrait.</p>
          <a href="/onboarding" className="text-primary mt-2 inline-block text-sm hover:underline">
            Commencer l'onboarding
          </a>
        </div>
      )}

      {/* Preferences Section */}
      <h2 className="mb-4 text-xl font-bold">Preferences de recherche</h2>
      <PreferencesEditor
        initial={currentPrefs}
        onSave={(prefs) => updatePrefs.mutate(prefs)}
        saving={updatePrefs.isPending}
      />
    </div>
  );
}
