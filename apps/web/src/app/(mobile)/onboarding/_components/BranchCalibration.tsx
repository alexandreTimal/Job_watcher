"use client";

import { useState } from "react";

const BRANCH_LABELS: Record<string, string> = {
  "1": "Même poste, en mieux",
  "2": "Monter en responsabilités",
  "3": "Changer de métier",
  "4": "Reconversion",
  "5": "Alternance / Stage",
};

interface BranchCalibrationProps {
  branch: string;
  onComplete: (answers: Record<string, unknown>) => void;
  loading?: boolean;
}

export function BranchCalibration({
  branch,
  onComplete,
  loading,
}: BranchCalibrationProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">
        Calibrage — {BRANCH_LABELS[branch]}
      </h2>
      {branch === "1" && <Branch1Form onComplete={onComplete} loading={loading} />}
      {branch === "2" && <Branch2Form onComplete={onComplete} loading={loading} />}
      {branch === "3" && <Branch3Form onComplete={onComplete} loading={loading} />}
      {branch === "4" && <Branch4Form onComplete={onComplete} loading={loading} />}
      {branch === "5" && <Branch5Form onComplete={onComplete} loading={loading} />}
    </div>
  );
}

// --- Branch 1: Même poste, en mieux ---
function Branch1Form({ onComplete, loading }: { onComplete: (a: Record<string, unknown>) => void; loading?: boolean }) {
  const [axes, setAxes] = useState<string[]>([]);
  const [salary, setSalary] = useState(35000);
  const [remote, setRemote] = useState("hybrid");

  const IMPROVEMENT_AXES = [
    "Meilleur salaire",
    "Plus de télétravail",
    "Meilleur management",
    "Meilleure ambiance",
    "Technologies plus modernes",
    "Moins de charge",
  ];

  function toggleAxis(axis: string) {
    setAxes((prev) =>
      prev.includes(axis)
        ? prev.filter((a) => a !== axis)
        : prev.length < 3
          ? [...prev, axis]
          : prev,
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-medium">
          Axes d&apos;amélioration prioritaires (1-3)
        </label>
        <div className="flex flex-wrap gap-2">
          {IMPROVEMENT_AXES.map((axis) => (
            <button
              key={axis}
              type="button"
              onClick={() => toggleAxis(axis)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                axes.includes(axis)
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-input hover:bg-accent"
              }`}
            >
              {axis}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">
          Salaire minimum acceptable : {salary.toLocaleString()} €/an
        </label>
        <input
          type="range"
          min={20000}
          max={120000}
          step={1000}
          value={salary}
          onChange={(e) => setSalary(Number(e.target.value))}
          className="w-full"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">
          Télétravail souhaité
        </label>
        <div className="flex flex-col gap-1.5">
          {[
            { value: "onsite", label: "Sur site" },
            { value: "hybrid", label: "Hybride (2-3j/sem)" },
            { value: "mostly_remote", label: "Majoritairement remote" },
            { value: "full_remote", label: "Full remote" },
          ].map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="remote"
                value={opt.value}
                checked={remote === opt.value}
                onChange={(e) => setRemote(e.target.value)}
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      <SubmitButton
        disabled={axes.length === 0 || loading}
        loading={loading}
        onClick={() =>
          onComplete({
            improvementAxes: axes,
            salaryMinimum: salary,
            remoteLevel: remote,
          })
        }
      />
    </div>
  );
}

// --- Branch 2: Monter en responsabilités ---
function Branch2Form({ onComplete, loading }: { onComplete: (a: Record<string, unknown>) => void; loading?: boolean }) {
  const [types, setTypes] = useState<string[]>([]);

  const RESPONSIBILITY_TYPES = [
    "Management d'équipe",
    "Lead technique",
    "Gestion de projet",
    "Direction de département",
    "Expertise sénior",
    "Entrepreneuriat interne",
  ];

  function toggle(t: string) {
    setTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-medium">
          Nature du saut de responsabilités
        </label>
        <div className="flex flex-wrap gap-2">
          {RESPONSIBILITY_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => toggle(t)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                types.includes(t)
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-input hover:bg-accent"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <SubmitButton
        disabled={types.length === 0 || loading}
        loading={loading}
        onClick={() => onComplete({ responsibilityTypes: types })}
      />
    </div>
  );
}

// --- Branch 3: Changer de métier ---
function Branch3Form({ onComplete, loading }: { onComplete: (a: Record<string, unknown>) => void; loading?: boolean }) {
  const [pivotJobs, setPivotJobs] = useState("");
  const [tolerance, setTolerance] = useState("up_to_10");

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-medium">
          Métiers pivots ciblés
        </label>
        <textarea
          value={pivotJobs}
          onChange={(e) => setPivotJobs(e.target.value)}
          placeholder="Ex: Product Manager, UX Designer, Data Analyst..."
          className="border-input bg-background min-h-[80px] w-full rounded-md border p-3 text-sm"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">
          Tolérance à une baisse de salaire
        </label>
        <div className="flex flex-col gap-1.5">
          {[
            { value: "none", label: "Aucune baisse acceptable" },
            { value: "up_to_10", label: "Jusqu'à -10%, ça passe" },
            { value: "up_to_20", label: "Jusqu'à -20%, si le poste me plaît" },
            { value: "more_than_20", label: "Le salaire est secondaire" },
          ].map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="tolerance"
                value={opt.value}
                checked={tolerance === opt.value}
                onChange={(e) => setTolerance(e.target.value)}
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      <SubmitButton
        disabled={!pivotJobs.trim() || loading}
        loading={loading}
        onClick={() =>
          onComplete({
            pivotJobs: pivotJobs
              .split(",")
              .map((j) => j.trim())
              .filter(Boolean),
            salaryDropTolerance: tolerance,
          })
        }
      />
    </div>
  );
}

// --- Branch 4: Reconversion ---
function Branch4Form({ onComplete, loading }: { onComplete: (a: Record<string, unknown>) => void; loading?: boolean }) {
  const [maturity, setMaturity] = useState<string | null>(null);
  const [level, setLevel] = useState("both");

  if (maturity === "not_yet") {
    return (
      <div className="space-y-4">
        <div className="bg-muted rounded-lg p-4">
          <p className="text-sm">
            JobFindeer t&apos;aide à trouver des offres sur un métier cible.
            Reviens quand tu auras au moins une piste — on sera là !
          </p>
        </div>
        <button
          onClick={() => setMaturity(null)}
          className="text-primary text-sm underline"
        >
          ← Revenir au choix
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-medium">
          Maturité du projet
        </label>
        <div className="flex flex-col gap-1.5">
          {[
            { value: "precise", label: "J'ai un métier précis en tête" },
            { value: "few_ideas", label: "J'ai 2-3 pistes" },
            { value: "not_yet", label: "Pas encore de piste" },
          ].map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="maturity"
                value={opt.value}
                checked={maturity === opt.value}
                onChange={(e) => setMaturity(e.target.value)}
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      {maturity && maturity !== "not_yet" && (
        <div>
          <label className="mb-2 block text-sm font-medium">
            Niveau accepté dans le nouveau domaine
          </label>
          <div className="flex flex-col gap-1.5">
            {[
              { value: "junior", label: "Junior — je repars de zéro" },
              {
                value: "intermediate",
                label: "Intermédiaire — je valorise mon expérience",
              },
              { value: "both", label: "Les deux me conviennent" },
            ].map((opt) => (
              <label
                key={opt.value}
                className="flex items-center gap-2 text-sm"
              >
                <input
                  type="radio"
                  name="level"
                  value={opt.value}
                  checked={level === opt.value}
                  onChange={(e) => setLevel(e.target.value)}
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>
      )}

      <SubmitButton
        disabled={!maturity || loading}
        loading={loading}
        onClick={() =>
          onComplete({
            maturity,
            acceptedLevel: level,
          })
        }
      />
    </div>
  );
}

// --- Branch 5: Alternance/Stage ---
function Branch5Form({ onComplete, loading }: { onComplete: (a: Record<string, unknown>) => void; loading?: boolean }) {
  const [contractType, setContractType] = useState("alternance");
  const [studyField, setStudyField] = useState("");

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-medium">
          Type de contrat recherché
        </label>
        <div className="flex gap-3">
          {[
            { value: "alternance", label: "Alternance" },
            { value: "stage", label: "Stage" },
          ].map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="contractType"
                value={opt.value}
                checked={contractType === opt.value}
                onChange={(e) => setContractType(e.target.value)}
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">
          Domaine d&apos;études
        </label>
        <input
          type="text"
          value={studyField}
          onChange={(e) => setStudyField(e.target.value)}
          placeholder="Ex: Informatique, Marketing, Commerce..."
          className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
        />
      </div>

      <SubmitButton
        disabled={!studyField.trim() || loading}
        loading={loading}
        onClick={() => onComplete({ contractType, studyField })}
      />
    </div>
  );
}

function SubmitButton({
  disabled,
  loading,
  onClick,
}: {
  disabled?: boolean;
  loading?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="bg-primary text-primary-foreground w-full rounded-md px-4 py-2.5 text-sm font-medium disabled:opacity-50"
    >
      {loading ? "Enregistrement..." : "Continuer"}
    </button>
  );
}
