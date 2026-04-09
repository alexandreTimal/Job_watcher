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

  const currentPrefs: Preferences = {
    contractTypes: (data?.preferences?.contractTypes as string[]) ?? [],
    salaryMin: data?.preferences?.salaryMin ?? null,
    salaryMax: data?.preferences?.salaryMax ?? null,
    remotePreference: (data?.preferences?.remotePreference as Preferences["remotePreference"]) ?? "any",
    sectors: (data?.preferences?.sectors as string[]) ?? [],
    preferredLocation: data?.preferences?.preferredLocation ?? null,
    locationRadius: data?.preferences?.locationRadius ?? null,
    negativeKeywords: (data?.preferences?.negativeKeywords as string[]) ?? [],
  };

  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="mb-6 text-2xl font-bold">Préférences de recherche</h1>
      <PreferencesEditor
        initial={currentPrefs}
        onSave={(prefs) => updatePrefs.mutate(prefs)}
        saving={updatePrefs.isPending}
      />
    </div>
  );
}
