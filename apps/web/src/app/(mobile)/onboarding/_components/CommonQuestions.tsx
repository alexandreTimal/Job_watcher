"use client";

import { useState } from "react";

interface CommonQuestionsProps {
  branch: string;
  onComplete: (prefs: CommonPrefs) => void;
  loading?: boolean;
  calibrationContractTypes?: string[] | null;
  initialPrefs?: Partial<CommonPrefs>;
}

export interface CommonPrefs {
  locationMode: "cities" | "france" | "remote_only";
  cities: string[];
  remoteFriendly: boolean;
  contractTypes: string[];
  workSchedule: "full_time" | "part_time" | "any";
}

const CONTRACT_OPTIONS = ["CDI", "CDD", "Intérim", "Freelance"];

export function CommonQuestions({
  branch,
  onComplete,
  loading,
  calibrationContractTypes,
  initialPrefs,
}: CommonQuestionsProps) {
  const [locationMode, setLocationMode] = useState<CommonPrefs["locationMode"]>(
    initialPrefs?.locationMode ?? "cities",
  );
  const [cityInput, setCityInput] = useState("");
  const [cities, setCities] = useState<string[]>(initialPrefs?.cities ?? []);
  const [remoteFriendly, setRemoteFriendly] = useState(
    initialPrefs?.remoteFriendly ?? false,
  );

  const calibrationDefaults = branch === "5" && calibrationContractTypes
    ? calibrationContractTypes
        .map((ct) =>
          ct === "stage" ? "Stage" : ct === "alternance" ? "Alternance" : "CDI",
        )
    : [];
  const [contractTypes, setContractTypes] = useState<string[]>(
    initialPrefs?.contractTypes ?? calibrationDefaults,
  );
  const [workSchedule, setWorkSchedule] = useState<CommonPrefs["workSchedule"]>(
    initialPrefs?.workSchedule ?? "full_time",
  );

  function addCity() {
    const city = cityInput.trim();
    if (city && !cities.includes(city)) {
      setCities((prev) => [...prev, city]);
      setCityInput("");
    }
  }

  function removeCity(city: string) {
    setCities((prev) => prev.filter((c) => c !== city));
  }

  function toggleContract(ct: string) {
    setContractTypes((prev) =>
      prev.includes(ct) ? prev.filter((c) => c !== ct) : [...prev, ct],
    );
  }

  const isLocationValid =
    locationMode === "france" ||
    locationMode === "remote_only" ||
    cities.length > 0;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Préférences générales</h2>

      {/* S1 — Localisation */}
      <div className="space-y-3">
        <label className="block text-sm font-medium">Localisation</label>
        <div className="flex flex-col gap-1.5">
          {[
            { value: "cities" as const, label: "Par ville" },
            { value: "france" as const, label: "Partout en France" },
            { value: "remote_only" as const, label: "Télétravail uniquement" },
          ].map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="locationMode"
                value={opt.value}
                checked={locationMode === opt.value}
                onChange={() => setLocationMode(opt.value)}
              />
              {opt.label}
            </label>
          ))}
        </div>

        {locationMode === "cities" && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={cityInput}
                onChange={(e) => setCityInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCity())}
                placeholder="Ajouter une ville..."
                className="border-input bg-background flex-1 rounded-md border px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={addCity}
                className="bg-primary text-primary-foreground rounded-md px-3 py-2 text-sm"
              >
                +
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {cities.map((city) => (
                <span
                  key={city}
                  className="bg-muted flex items-center gap-1 rounded-full px-3 py-1 text-xs"
                >
                  {city}
                  <button
                    type="button"
                    onClick={() => removeCity(city)}
                    className="text-muted-foreground hover:text-foreground ml-1"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {locationMode !== "remote_only" && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={remoteFriendly}
              onChange={(e) => setRemoteFriendly(e.target.checked)}
            />
            Ouvert au télétravail
          </label>
        )}
      </div>

      {/* S2 — Type de contrat */}
      {branch !== "5" && (
        <div className="space-y-2">
          <label className="block text-sm font-medium">Type de contrat</label>
          <div className="flex flex-wrap gap-2">
            {CONTRACT_OPTIONS.map((ct) => (
              <button
                key={ct}
                type="button"
                onClick={() => toggleContract(ct)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  contractTypes.includes(ct)
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-input hover:bg-accent"
                }`}
              >
                {ct}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* S3 — Rythme de travail */}
      {branch !== "5" && (
        <div className="space-y-2">
          <label className="block text-sm font-medium">Rythme de travail</label>
          <div className="flex flex-col gap-1.5">
            {[
              { value: "full_time" as const, label: "Temps plein" },
              { value: "part_time" as const, label: "Temps partiel" },
              { value: "any" as const, label: "Peu importe" },
            ].map((opt) => (
              <label
                key={opt.value}
                className="flex items-center gap-2 text-sm"
              >
                <input
                  type="radio"
                  name="workSchedule"
                  value={opt.value}
                  checked={workSchedule === opt.value}
                  onChange={() => setWorkSchedule(opt.value)}
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="bg-muted rounded-lg p-3 text-center text-sm">
        Ton premier feed sera prêt demain matin !
      </div>

      <button
        onClick={() =>
          onComplete({
            locationMode,
            cities,
            remoteFriendly:
              locationMode === "remote_only" ? true : remoteFriendly,
            contractTypes,
            workSchedule: branch === "5" ? "full_time" : workSchedule,
          })
        }
        disabled={!isLocationValid || loading}
        className="bg-primary text-primary-foreground w-full rounded-md px-4 py-2.5 text-sm font-medium disabled:opacity-50"
      >
        {loading ? "Enregistrement..." : "Terminer"}
      </button>
    </div>
  );
}
