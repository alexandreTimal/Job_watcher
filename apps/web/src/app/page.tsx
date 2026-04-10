import { Button } from "@jobfindeer/ui/button";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "JobFindeer — Ta veille emploi intelligente",
  description:
    "JobFindeer agrège les offres de France Travail, WTTJ et HelloWork, les score par compatibilité avec ton profil et te les présente chaque matin. 100% gratuit.",
  openGraph: {
    title: "JobFindeer — Ta veille emploi intelligente",
    description: "Reçois chaque matin les offres d'emploi qui te correspondent vraiment.",
    type: "website",
  },
};

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col">
      {/* Hero */}
      <section className="flex flex-col items-center gap-6 px-6 py-24 text-center">
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
          Les offres qui te correspondent,
          <br />
          <span className="text-primary">chaque matin.</span>
        </h1>
        <p className="text-muted-foreground max-w-xl text-lg">
          JobFindeer agrège France Travail, WTTJ et HelloWork, score les offres
          par compatibilité avec ton CV et tes préférences, et te les sert dans
          un feed mobile prêt à swiper.
        </p>
        <div className="flex gap-4">
          <a href="/register">
            <Button size="lg" className="min-h-[44px] px-8 text-lg">
              Commencer gratuitement
            </Button>
          </a>
        </div>
      </section>

      {/* Features */}
      <section className="bg-muted/50 px-6 py-16">
        <div className="mx-auto grid max-w-5xl gap-8 sm:grid-cols-3">
          {[
            {
              title: "Agrégation multi-sources",
              desc: "France Travail, Welcome to the Jungle, HelloWork — tout au même endroit.",
            },
            {
              title: "Scoring intelligent",
              desc: "Chaque offre est scorée selon tes compétences, ta localisation et tes critères.",
            },
            {
              title: "Swipe & Postule",
              desc: "Swipe pour trier sur mobile, postule depuis desktop. Simple et rapide.",
            },
          ].map((f) => (
            <div key={f.title} className="flex flex-col gap-2 rounded-xl p-6">
              <h3 className="text-lg font-semibold">{f.title}</h3>
              <p className="text-muted-foreground text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="flex flex-col items-center gap-4 px-6 py-16 text-center">
        <h2 className="text-2xl font-bold">Prêt à trouver ton prochain poste ?</h2>
        <p className="text-muted-foreground">100% gratuit. Crée ton compte en 30 secondes.</p>
        <a href="/register">
          <Button size="lg" className="min-h-[44px]">
            Créer mon compte
          </Button>
        </a>
      </section>

      {/* Footer */}
      <footer className="border-t px-6 py-8 text-center">
        <p className="text-muted-foreground text-sm">
          JobFindeer respecte le RGPD. Tes données sont chiffrées et tu peux les exporter ou supprimer ton compte à tout moment.
        </p>
      </footer>
    </main>
  );
}
