"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { signOut } from "next-auth/react";
import { useTRPC } from "~/trpc/react";

export function DeleteAccountSection() {
  const trpc = useTRPC();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const deleteAccount = useMutation({
    ...trpc.profile.deleteAccount.mutationOptions(),
    onSuccess: async () => {
      await signOut({ callbackUrl: "/login" });
    },
  });

  return (
    <div className="mt-10">
      <h2 className="mb-4 text-xl font-bold text-red-600">Zone dangereuse</h2>
      <div className="rounded-lg border border-red-200 p-6 dark:border-red-900">
        <p className="text-muted-foreground mb-4 text-sm">
          La suppression de ton compte est definitive. Toutes tes donnees
          (profil, preferences, historique d&apos;offres, sessions) seront
          effacees conformement au droit a l&apos;oubli (RGPD).
        </p>
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          disabled={deleteAccount.isPending}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          Supprimer mon compte
        </button>
      </div>

      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-account-title"
        >
          <div className="bg-background w-full max-w-md rounded-lg border p-6 shadow-lg">
            <h3 id="delete-account-title" className="mb-2 text-lg font-bold">
              Supprimer definitivement ton compte ?
            </h3>
            <p className="text-muted-foreground mb-6 text-sm">
              Cette action est irreversible. Toutes tes donnees seront
              effacees immediatement et tu seras deconnecte.
            </p>
            {deleteAccount.isError && (
              <p className="mb-4 text-sm text-red-600">
                Echec de la suppression. Merci de reessayer.
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                disabled={deleteAccount.isPending}
                className="bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => deleteAccount.mutate()}
                disabled={deleteAccount.isPending}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleteAccount.isPending
                  ? "Suppression..."
                  : "Oui, supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
