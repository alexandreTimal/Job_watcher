import type { RawJobOffer } from "@jobfindeer/validators";

export interface FetchOptions {
  limit?: number;
}

export interface ScrapingSource {
  name: string;
  fetch(options?: FetchOptions): Promise<RawJobOffer[]>;
}
