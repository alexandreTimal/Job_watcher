import { createHash } from "node:crypto";
import { rawJobOfferSchema, type RawJobOffer, type NormalizedOffer } from "@jobfindeer/validators";
import { createLogger } from "../lib/logger";

const logger = createLogger("NORMALIZER");

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/\s*\(h\/f\)\s*/gi, "")
    .replace(/\s*\(f\/h\)\s*/gi, "")
    .replace(/\s*h\/f\s*/gi, "")
    .replace(/\s+/g, " ");
}

function normalizeCompany(company: string | null): string | null {
  if (!company) return null;
  return company.trim().toLowerCase().replace(/\s+/g, " ");
}

function computeHash(titleNorm: string, companyNorm: string | null, source: string): string {
  const input = `${titleNorm}|${companyNorm ?? ""}|${source}`;
  return createHash("sha256").update(input).digest("hex");
}

export function normalizeOffers(rawOffers: RawJobOffer[]): NormalizedOffer[] {
  const results: NormalizedOffer[] = [];

  for (const raw of rawOffers) {
    const parsed = rawJobOfferSchema.safeParse(raw);
    if (!parsed.success) {
      logger.warn("Validation failed for offer", { title: raw.title, errors: parsed.error.message });
      continue;
    }

    const titleNormalized = normalizeTitle(parsed.data.title);
    const companyNormalized = normalizeCompany(parsed.data.company);
    const contentHash = computeHash(titleNormalized, companyNormalized, parsed.data.sourceName);

    results.push({
      ...parsed.data,
      titleNormalized,
      companyNormalized,
      contentHash,
    });
  }

  logger.info(`Normalized ${results.length}/${rawOffers.length} offers`);
  return results;
}
