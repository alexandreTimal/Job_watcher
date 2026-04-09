"use client";

import { Button } from "@jobfindeer/ui/button";

interface SavedOffer {
  feedId: string;
  offerId: string;
  title: string;
  company: string | null;
  location: string | null;
  salary: string | null;
  contractType: string | null;
  urlSource: string;
  score: number;
  justification: string | null;
  status: string;
  appliedAt: Date | null;
  savedAt: Date;
}

export function OfferTable({
  offers,
  onRedirect,
  onMarkApplied,
}: {
  offers: SavedOffer[];
  onRedirect: (offerId: string, url: string) => void;
  onMarkApplied: (feedItemId: string) => void;
}) {
  if (offers.length === 0) {
    return (
      <div className="text-muted-foreground py-12 text-center">
        Aucune offre sauvegardée. Swipe des offres depuis ton feed mobile !
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b">
            <th className="px-4 py-3 font-medium">Poste</th>
            <th className="px-4 py-3 font-medium">Entreprise</th>
            <th className="px-4 py-3 font-medium">Lieu</th>
            <th className="px-4 py-3 font-medium">Contrat</th>
            <th className="px-4 py-3 font-medium">Salaire</th>
            <th className="px-4 py-3 font-medium">Score</th>
            <th className="px-4 py-3 font-medium">Statut</th>
            <th className="px-4 py-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {offers.map((offer) => (
            <tr key={offer.feedId} className="border-b">
              <td className="px-4 py-3 font-medium">{offer.title}</td>
              <td className="text-muted-foreground px-4 py-3">{offer.company ?? "—"}</td>
              <td className="text-muted-foreground px-4 py-3">{offer.location ?? "—"}</td>
              <td className="px-4 py-3">{offer.contractType ?? "—"}</td>
              <td className="px-4 py-3">{offer.salary ?? "—"}</td>
              <td className="px-4 py-3">
                <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs font-semibold">
                  {offer.score} pts
                </span>
              </td>
              <td className="px-4 py-3">
                {offer.status === "applied" ? (
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    Candidaté
                  </span>
                ) : (
                  <span className="bg-muted rounded-full px-2 py-0.5 text-xs">Sauvegardé</span>
                )}
              </td>
              <td className="flex gap-2 px-4 py-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    onRedirect(offer.offerId, offer.urlSource);
                    window.open(offer.urlSource, "_blank");
                  }}
                >
                  Voir source
                </Button>
                {offer.status !== "applied" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onMarkApplied(offer.feedId)}
                  >
                    Candidaté
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
