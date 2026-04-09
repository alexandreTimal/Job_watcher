"use client";

import { useState } from "react";
import { Button } from "@jobfindeer/ui/button";
import { Input } from "@jobfindeer/ui/input";
import { Label } from "@jobfindeer/ui/label";
import type { Preferences } from "@jobfindeer/validators";
import { NegativeKeywords } from "./NegativeKeywords";

export function PreferencesEditor({
  initial,
  onSave,
  saving,
}: {
  initial: Preferences;
  onSave: (prefs: Preferences) => void;
  saving: boolean;
}) {
  const [prefs, setPrefs] = useState<Preferences>(initial);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(prefs);
      }}
      className="flex flex-col gap-4"
    >
      <div>
        <Label htmlFor="contract">Types de contrat</Label>
        <Input
          id="contract"
          value={prefs.contractTypes.join(", ")}
          onChange={(e) =>
            setPrefs({ ...prefs, contractTypes: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })
          }
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor="salMin">Salaire min (k EUR)</Label>
          <Input
            id="salMin"
            type="number"
            value={prefs.salaryMin ?? ""}
            onChange={(e) => setPrefs({ ...prefs, salaryMin: e.target.value ? parseInt(e.target.value, 10) : null })}
          />
        </div>
        <div>
          <Label htmlFor="salMax">Salaire max (k EUR)</Label>
          <Input
            id="salMax"
            type="number"
            value={prefs.salaryMax ?? ""}
            onChange={(e) => setPrefs({ ...prefs, salaryMax: e.target.value ? parseInt(e.target.value, 10) : null })}
          />
        </div>
      </div>
      <div>
        <Label htmlFor="remote">Télétravail</Label>
        <select
          id="remote"
          value={prefs.remotePreference}
          onChange={(e) => setPrefs({ ...prefs, remotePreference: e.target.value as Preferences["remotePreference"] })}
          className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
        >
          <option value="any">Peu importe</option>
          <option value="remote">Full remote</option>
          <option value="hybrid">Hybride</option>
          <option value="onsite">Présentiel</option>
        </select>
      </div>
      <div>
        <Label htmlFor="sectors">Secteurs</Label>
        <Input
          id="sectors"
          value={prefs.sectors.join(", ")}
          onChange={(e) => setPrefs({ ...prefs, sectors: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
        />
      </div>
      <div>
        <Label htmlFor="location">Ville préférée</Label>
        <Input
          id="location"
          value={prefs.preferredLocation ?? ""}
          onChange={(e) => setPrefs({ ...prefs, preferredLocation: e.target.value || null })}
        />
      </div>
      <NegativeKeywords
        keywords={prefs.negativeKeywords}
        onChange={(kw) => setPrefs({ ...prefs, negativeKeywords: kw })}
      />
      <Button type="submit" disabled={saving}>
        {saving ? "Sauvegarde..." : "Sauvegarder"}
      </Button>
    </form>
  );
}
