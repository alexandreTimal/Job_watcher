import * as cheerio from "cheerio";
import robotsParser from "robots-parser";
import type { RawJobOffer } from "@jobfindeer/validators";
import type { ScrapingSource } from "../lib/source-interface";
import { createLogger } from "../lib/logger";

const logger = createLogger("WTTJ");
const BASE_URL = "https://www.welcometothejungle.com";
const SEARCH_URL = `${BASE_URL}/fr/jobs`;
const ROBOTS_URL = `${BASE_URL}/robots.txt`;
const USER_AGENT = "JobFindeer/1.0 (job aggregator; contact@jobfindeer.fr)";
const FETCH_TIMEOUT_MS = 30_000;

async function checkRobotsTxt(): Promise<boolean> {
  try {
    const res = await fetch(ROBOTS_URL, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return true; // Allow if robots.txt unavailable
    const text = await res.text();
    const robots = robotsParser(ROBOTS_URL, text);
    return robots.isAllowed(SEARCH_URL, USER_AGENT) ?? true;
  } catch {
    return true;
  }
}

export const wttjSource: ScrapingSource = {
  name: "wttj",

  async fetch(): Promise<RawJobOffer[]> {
    try {
      const allowed = await checkRobotsTxt();
      if (!allowed) {
        logger.warn("Scraping disallowed by robots.txt");
        return [];
      }

      const res = await fetch(SEARCH_URL, {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "text/html",
        },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });

      if (!res.ok) {
        logger.error("Page fetch failed", { status: res.status });
        return [];
      }

      const html = await res.text();
      const $ = cheerio.load(html);
      const offers: RawJobOffer[] = [];

      // WTTJ job listing cards — selectors may change
      $("[data-testid='search-results-list-item-wrapper']").each((_, el) => {
        try {
          const $el = $(el);
          const titleEl = $el.find("h4, [data-testid='job-title']");
          const companyEl = $el.find("[data-testid='company-name']");
          const locationEl = $el.find("[data-testid='job-location']");
          const contractEl = $el.find("[data-testid='job-contract']");
          const linkEl = $el.find("a[href*='/jobs/']");

          const title = titleEl.text().trim();
          const href = linkEl.attr("href");

          if (!title || !href) return;

          offers.push({
            title,
            company: companyEl.text().trim() || null,
            location: locationEl.text().trim() || null,
            salary: null, // WTTJ rarely shows salary in listing
            contractType: contractEl.text().trim() || null,
            urlSource: href.startsWith("http") ? href : `${BASE_URL}${href}`,
            sourceName: "wttj",
            publishedAt: null,
          });
        } catch (err) {
          logger.warn("Failed to parse one listing", {
            selector: "search-results-list-item-wrapper",
            error: err instanceof Error ? err.message : String(err),
          });
        }
      });

      logger.info(`Collected ${offers.length} offers`);
      return offers;
    } catch (error) {
      logger.error("Source failed", { error: error instanceof Error ? error.message : String(error) });
      return [];
    }
  },
};
