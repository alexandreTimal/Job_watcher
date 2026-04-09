import { rawJobOfferSchema, type RawJobOffer } from "@jobfindeer/validators";
import type { ScrapingSource } from "../lib/source-interface";
import { createLogger } from "../lib/logger";

const logger = createLogger("FRANCE_TRAVAIL");

const TOKEN_URL = "https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=%2Fpartenaire";
const SEARCH_URL = "https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search";
const FETCH_TIMEOUT_MS = 30_000;

interface TokenResponse {
  access_token: string;
  expires_in: number;
}

let cachedToken: { token: string; expiresAt: number } | null = null;
let pendingTokenRequest: Promise<string> | null = null;

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token;
  }

  if (pendingTokenRequest) {
    return pendingTokenRequest;
  }

  pendingTokenRequest = (async () => {
    try {
      const clientId = process.env.FRANCE_TRAVAIL_CLIENT_ID;
      const clientSecret = process.env.FRANCE_TRAVAIL_CLIENT_SECRET;
      if (!clientId || !clientSecret) {
        throw new Error("Missing FRANCE_TRAVAIL credentials");
      }

      const res = await fetch(TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: clientId,
          client_secret: clientSecret,
          scope: "api_offresdemploiv2 o2dsoffre",
        }),
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });

      if (!res.ok) throw new Error(`Token request failed: ${res.status}`);
      const data = (await res.json()) as TokenResponse;

      if (!data.access_token || typeof data.expires_in !== "number") {
        throw new Error("Invalid token response structure");
      }

      cachedToken = {
        token: data.access_token,
        expiresAt: Date.now() + data.expires_in * 1000,
      };

      return cachedToken.token;
    } finally {
      pendingTokenRequest = null;
    }
  })();

  return pendingTokenRequest;
}

export const franceTravailSource: ScrapingSource = {
  name: "france-travail",

  async fetch(): Promise<RawJobOffer[]> {
    try {
      const token = await getToken();

      const params = new URLSearchParams({
        range: "0-149",
        sort: "1", // par date
      });

      const res = await fetch(`${SEARCH_URL}?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });

      if (!res.ok) {
        logger.error("Search request failed", { status: res.status });
        return [];
      }

      const data = (await res.json()) as {
        resultats?: Array<{
          id: string;
          intitule: string;
          entreprise?: { nom?: string };
          lieuTravail?: { libelle?: string };
          salaire?: { libelle?: string };
          typeContrat?: string;
          origineOffre?: { urlOrigine?: string };
          dateCreation?: string;
        }>;
      };

      if (!data.resultats) return [];

      const offers: RawJobOffer[] = [];
      for (const r of data.resultats) {
        const raw = {
          title: r.intitule,
          company: r.entreprise?.nom ?? null,
          location: r.lieuTravail?.libelle ?? null,
          salary: r.salaire?.libelle ?? null,
          contractType: r.typeContrat ?? null,
          urlSource:
            r.origineOffre?.urlOrigine ??
            `https://candidat.francetravail.fr/offres/recherche/detail/${r.id}`,
          sourceName: "france-travail",
          publishedAt: r.dateCreation ? new Date(r.dateCreation) : null,
        };

        const parsed = rawJobOfferSchema.safeParse(raw);
        if (parsed.success) {
          offers.push(parsed.data);
        } else {
          logger.warn("Validation failed for offer", { title: r.intitule });
        }
      }

      logger.info(`Collected ${offers.length} offers`);
      return offers;
    } catch (error) {
      logger.error("Source failed", { error: error instanceof Error ? error.message : String(error) });
      return [];
    }
  },
};
