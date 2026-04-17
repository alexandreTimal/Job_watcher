"use client";

import { useState } from "react";
import { Button } from "@jobfindeer/ui/button";
import { Input } from "@jobfindeer/ui/input";
import { Label } from "@jobfindeer/ui/label";
import type { Preferences } from "@jobfindeer/validators";
import { MultiSelect } from "~/app/(desktop)/settings/_components/MultiSelect";
import { CONTRACT_TYPES } from "~/app/(desktop)/settings/_components/constants";

export function PreferencesForm({
  onSave,
}: {
  onSave: (prefs: Preferences) => void;
}) {
  const [contractTypes, setContractTypes] = useState<string[]>([]);
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [remotePreference, setRemotePreference] = useState<Preferences["remotePreference"]>("any");
  const [sectors, setSectors] = useState("");
  const [preferredLocation, setPreferredLocation] = useState("");

  function handleSave() {
    onSave({
      contractTypes,
      salaryMin: salaryMin ? parseInt(salaryMin, 10) : null,
      salaryMax: salaryMax ? parseInt(salaryMax, 10) : null,
      remotePreference,
      sectors: sectors.split(",").map((s) => s.trim()).filter(Boolean),
      locations: preferredLocation ? [{ label: preferredLocation, radius: null }] : [],
      negativeKeywords: [],
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">Tes préférences</h2>
      <div className="flex flex-col gap-3">
        <MultiSelect
          label="Types de contrat"
          options={CONTRACT_TYPES}
          selected={contractTypes}
          onChange={setContractTypes}
        />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="salMin">Salaire min (k EUR)</Label>
            <Input id="salMin" type="number" value={salaryMin} onChange={(e) => setSalaryMin(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="salMax">Salaire max (k EUR)</Label>
            <Input id="salMax" type="number" value={salaryMax} onChange={(e) => setSalaryMax(e.target.value)} />
          </div>
        </div>
        <div>
          <Label htmlFor="remote">Télétravail</Label>
          <select
            id="remote"
            value={remotePreference}
            onChange={(e) => setRemotePreference(e.target.value as Preferences["remotePreference"])}
            className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
          >
            <option value="any">Peu importe</option>
            <option value="remote">Full remote</option>
            <option value="hybrid">Hybride</option>
            <option value="onsite">Présentiel</option>
          </select>
        </div>
        <div>
          <Label htmlFor="sectors">Secteurs préférés</Label>
          <Input id="sectors" value={sectors} onChange={(e) => setSectors(e.target.value)} placeholder="Tech, Finance, Santé" />
        </div>
        <div>
          <Label htmlFor="location">Ville préférée</Label>
          <Input id="location" value={preferredLocation} onChange={(e) => setPreferredLocation(e.target.value)} placeholder="Lyon" />
        </div>
      </div>
      <Button onClick={handleSave} className="min-h-[44px]">
        Sauvegarder mes préférences
      </Button>
    </div>
  );
}
