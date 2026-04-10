"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

const PLANS = [
  {
    id: "basic",
    name: "Essentiel",
    price: "9,90",
    features: ["Feed quotidien", "3 sources", "Scoring par branche"],
  },
  {
    id: "pro",
    name: "Pro",
    price: "19,90",
    features: [
      "Tout Essentiel",
      "Sources illimitées",
      "Notifications email",
      "Support prioritaire",
    ],
  },
];

export default function BillingPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const success = searchParams.get("success");
  const canceled = searchParams.get("canceled");

  async function handleSubscribe(planId: string) {
    setLoading(planId);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="mb-2 text-2xl font-bold">Abonnement</h1>
      <p className="text-muted-foreground mb-8 text-sm">
        Continuez à utiliser JobFindeer après votre essai gratuit.
      </p>

      {success && (
        <div className="mb-6 rounded-lg bg-green-50 p-4 text-sm text-green-700">
          Paiement réussi ! Votre abonnement est actif.
        </div>
      )}
      {canceled && (
        <div className="bg-muted mb-6 rounded-lg p-4 text-sm">
          Paiement annulé. Vous pouvez réessayer quand vous voulez.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className="flex flex-col rounded-lg border p-6"
          >
            <h2 className="text-lg font-bold">{plan.name}</h2>
            <p className="mt-1 text-2xl font-bold">
              {plan.price} <span className="text-muted-foreground text-sm font-normal">€/mois</span>
            </p>
            <ul className="mt-4 flex-1 space-y-2 text-sm">
              {plan.features.map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <span className="text-primary">✓</span> {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleSubscribe(plan.id)}
              disabled={loading !== null}
              className="bg-primary text-primary-foreground mt-6 rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {loading === plan.id ? "Redirection..." : "S'abonner"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
