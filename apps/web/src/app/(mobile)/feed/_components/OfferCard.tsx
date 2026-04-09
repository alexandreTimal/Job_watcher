"use client";

interface OfferCardProps {
  title: string;
  company: string | null;
  location: string | null;
  salary: string | null;
  contractType: string | null;
  score: number;
  justification: string | null;
}

export function OfferCard({
  title,
  company,
  location,
  salary,
  contractType,
  score,
  justification,
}: OfferCardProps) {
  return (
    <div className="bg-card text-card-foreground flex h-full flex-col justify-between rounded-2xl border p-6 shadow-lg">
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-semibold leading-tight">{title}</h3>
          <span className="bg-primary text-primary-foreground shrink-0 rounded-full px-3 py-1 text-sm font-bold">
            {score} pts
          </span>
        </div>
        {company && (
          <p className="text-muted-foreground text-sm">{company}</p>
        )}
        <div className="flex flex-wrap gap-2">
          {location && (
            <span className="bg-muted rounded-md px-2 py-1 text-xs">{location}</span>
          )}
          {contractType && (
            <span className="bg-muted rounded-md px-2 py-1 text-xs">{contractType}</span>
          )}
          {salary && (
            <span className="bg-muted rounded-md px-2 py-1 text-xs">{salary}</span>
          )}
        </div>
      </div>
      {justification && (
        <p className="text-muted-foreground mt-4 border-t pt-3 text-xs">
          {justification}
        </p>
      )}
    </div>
  );
}
