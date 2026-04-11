import { Button } from "@jobfindeer/ui/button";

interface StepNavigationProps {
  onBack?: () => void;
  onNext?: () => void;
  onSkip?: () => void;
  canGoBack: boolean;
  canGoNext: boolean;
  canSkip?: boolean;
  nextLabel?: string;
}

export function StepNavigation({
  onBack,
  onNext,
  onSkip,
  canGoBack,
  canGoNext,
  canSkip = false,
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
      <div className="flex gap-2">
        {canSkip && (
          <Button variant="ghost" onClick={onSkip}>
            Passer →
          </Button>
        )}
        <Button onClick={onNext} disabled={!canGoNext}>
          {nextLabel} →
        </Button>
      </div>
    </div>
  );
}
