"use client";

import type { IntentResult } from "~/lib/intent-analyzer";

const BRANCH_LABELS: Record<string, string> = {
  "1": "Même poste, en mieux",
  "2": "Monter en responsabilités",
  "3": "Changer de métier",
  "4": "Reconversion",
  "5": "Alternance / Stage",
};

interface IntentValidationProps {
  result: IntentResult;
  onConfirm: (branch: string) => void;
  onCorrect: (branch: string) => void;
  onReject: () => void;
}

export function IntentValidation({
  result,
  onConfirm,
  onCorrect,
  onReject,
}: IntentValidationProps) {
  const showReformulation = result.confidence >= 0.7;

  if (!showReformulation) {
    return <BranchSelect onSelect={onCorrect} preselected={null} />;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Si je comprends bien...</h2>
      <p className="bg-muted rounded-lg p-4 text-sm italic">
        &ldquo;{result.summary}&rdquo;
      </p>
      <p className="text-muted-foreground text-sm">C&apos;est ça ?</p>

      <div className="flex flex-col gap-2">
        <button
          onClick={() => onConfirm(result.branch)}
          className="bg-primary text-primary-foreground rounded-md px-4 py-2.5 text-sm font-medium"
        >
          Oui, exactement
        </button>
        <button
          onClick={() => onCorrect(result.branch)}
          className="border-input bg-background hover:bg-accent rounded-md border px-4 py-2.5 text-sm font-medium"
        >
          Presque, je corrige
        </button>
        <button
          onClick={onReject}
          className="text-muted-foreground hover:text-foreground rounded-md px-4 py-2.5 text-sm"
        >
          Pas du tout
        </button>
      </div>
    </div>
  );
}

interface BranchSelectProps {
  onSelect: (branch: string) => void;
  preselected: string | null;
}

export function BranchSelect({ onSelect, preselected }: BranchSelectProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Quel est ton objectif ?</h2>
      <p className="text-muted-foreground text-sm">
        Choisis la situation qui te correspond le mieux.
      </p>
      <div className="flex flex-col gap-2">
        {Object.entries(BRANCH_LABELS).map(([key, label]) => (
          <button
            key={key}
            onClick={() => onSelect(key)}
            className={`rounded-md border px-4 py-3 text-left text-sm font-medium transition-colors ${
              preselected === key
                ? "border-primary bg-primary/10 text-primary"
                : "border-input bg-background hover:bg-accent"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
