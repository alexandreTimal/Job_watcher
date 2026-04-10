import { Button } from "@jobfindeer/ui/button";

interface StepNavigationProps {
  onBack?: () => void;
  onNext?: () => void;
  canGoBack: boolean;
  canGoNext: boolean;
  nextLabel?: string;
}

export function StepNavigation({
  onBack,
  onNext,
  canGoBack,
  canGoNext,
  nextLabel = "Suivant",
}: StepNavigationProps) {
  return (
    <div className="flex items-center justify-between pt-6">
      {canGoBack ? (
        <Button variant="outline" onClick={onBack}>
          ← Retour
        </Button>
      ) : (
        <div />
      )}
      <Button onClick={onNext} disabled={!canGoNext}>
        {nextLabel} →
      </Button>
    </div>
  );
}
