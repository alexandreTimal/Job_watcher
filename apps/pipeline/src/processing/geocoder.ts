import { eq, isNull, isNotNull } from "drizzle-orm";
import { db } from "@jobfindeer/db/client";
import { rawOffers } from "@jobfindeer/db/schema";
import { createLogger } from "../lib/logger";

const logger = createLogger("GEOCODER");

const BAN_URL = "https://api-adresse.data.gouv.fr/search";
const BATCH_SIZE = 50;
const DELAY_MS = 200; // respect rate limit

interface BanResult {
  features: Array<{
    geometry: { coordinates: [number, number] };
    properties: { score: number; label: string };
  }>;
}

async function geocodeAddress(
  address: string,
): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(
      `${BAN_URL}?q=${encodeURIComponent(address)}&limit=1`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) return null;

    const data = (await res.json()) as BanResult;
    const feature = data.features[0];
    if (!feature || feature.properties.score < 0.4) return null;

    const [lng, lat] = feature.geometry.coordinates;
    return { lat, lng };
  } catch {
    return null;
  }
}

export async function geocodeNewOffers(): Promise<number> {
  // Find offers with location text but no lat/lng
  const ungeocodedOffers = await db
    .select({
      id: rawOffers.id,
      location: rawOffers.location,
    })
    .from(rawOffers)
    .where(isNull(rawOffers.locationLat))
    .where(isNotNull(rawOffers.location))
    .limit(BATCH_SIZE);

  let geocoded = 0;

  for (const offer of ungeocodedOffers) {
    if (!offer.location) continue;

    const coords = await geocodeAddress(offer.location);
    if (coords) {
      await db
        .update(rawOffers)
        .set({ locationLat: coords.lat, locationLng: coords.lng })
        .where(eq(rawOffers.id, offer.id));
      geocoded++;
    }

    // Rate limit
    await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  logger.info(`Geocoded ${geocoded}/${ungeocodedOffers.length} offers`);
  return geocoded;
}
