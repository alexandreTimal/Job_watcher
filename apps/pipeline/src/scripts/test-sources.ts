/**
 * Test script: fetch 20 offers from WTTJ and Hellowork in parallel,
 * display raw data to evaluate what's available from each source.
 *
 * Usage: pnpm dotenv -e ../../.env -- node --import tsx src/scripts/test-sources.ts
 */

import { wttjSource } from "../sources/wttj";
import { helloworkSource } from "../sources/hellowork";

const LIMIT = 20;

function printOffers(sourceName: string, offers: { title: string; company: string | null; location: string | null; salary: string | null; contractType: string | null; urlSource: string }[]) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  ${sourceName.toUpperCase()} — ${offers.length} offres`);
  console.log(`${"=".repeat(60)}`);

  if (offers.length === 0) {
    console.log("  Aucune offre récupérée (sélecteurs cassés ou page vide)\n");
    return;
  }

  // Field completeness stats
  const fields = ["title", "company", "location", "salary", "contractType"] as const;
  const stats = Object.fromEntries(fields.map((f) => [f, 0]));
  for (const o of offers) {
    for (const f of fields) {
      if (o[f]) stats[f]!++;
    }
  }

  console.log("\n  Complétude des champs:");
  for (const f of fields) {
    const pct = Math.round((stats[f]! / offers.length) * 100);
    const bar = "█".repeat(Math.round(pct / 5)) + "░".repeat(20 - Math.round(pct / 5));
    console.log(`    ${f.padEnd(14)} ${bar} ${pct}% (${stats[f]}/${offers.length})`);
  }

  console.log("\n  Détail des offres:");
  for (let i = 0; i < offers.length; i++) {
    const o = offers[i]!;
    console.log(`\n  [${i + 1}] ${o.title}`);
    console.log(`      Entreprise:  ${o.company ?? "—"}`);
    console.log(`      Lieu:        ${o.location ?? "—"}`);
    console.log(`      Salaire:     ${o.salary ?? "—"}`);
    console.log(`      Contrat:     ${o.contractType ?? "—"}`);
    console.log(`      URL:         ${o.urlSource}`);
  }
}

async function main() {
  console.log(`\nTest des sources — limit=${LIMIT}\n`);

  const [wttjResult, helloworkResult] = await Promise.allSettled([
    wttjSource.fetch({ limit: LIMIT }),
    helloworkSource.fetch({ limit: LIMIT }),
  ]);

  if (wttjResult.status === "fulfilled") {
    printOffers("wttj", wttjResult.value);
  } else {
    console.error("\nWTTJ ERREUR:", wttjResult.reason);
  }

  if (helloworkResult.status === "fulfilled") {
    printOffers("hellowork", helloworkResult.value);
  } else {
    console.error("\nHELLOWORK ERREUR:", helloworkResult.reason);
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log("  Test terminé");
  console.log(`${"=".repeat(60)}\n`);
}

main();
