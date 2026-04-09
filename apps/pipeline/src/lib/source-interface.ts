import type { RawJobOffer } from "@jobfindeer/validators";

export interface ScrapingSource {
  name: string;
  fetch(): Promise<RawJobOffer[]>;
}
