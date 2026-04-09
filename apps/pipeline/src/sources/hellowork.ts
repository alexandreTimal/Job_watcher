import * as cheerio from "cheerio";
import robotsParser from "robots-parser";
import type { RawJobOffer } from "@jobfindeer/validators";
import type { ScrapingSource } from "../lib/source-interface";
import { createLogger } from "../lib/logger";

const logger = createLogger("HELLOWORK");
const BASE_URL = "https://www.hellowork.com";
const SEARCH_URL = `${BASE_URL}/fr-fr/emploi/recherche.html`;
const ROBOTS_URL = `${BASE_URL}/robots.txt`;
const USER_AGENT = "JobFindeer/1.0 (job aggregator; contact@jobfindeer.fr)";
const FETCH_TIMEOUT_MS = 30_000;

async function checkRobotsTxt(): Promise<boolean> {
  try {
    const res = await fetch(ROBOTS_URL, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return true;
    const text = await res.text();
    const robots = robotsParser(ROBOTS_URL, text);
    return robots.isAllowed(SEARCH_URL, USER_AGENT) ?? true;
  } catch {
    return true;
  }
}

export const helloworkSource: ScrapingSource = {
  name: "hellowork",

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

      $("[data-cy='offerCardLink'], .offer-card, article.tw-card").each((_, el) => {
        try {
          const $el = $(el);
          const title = $el.find("h3, .offer-title, [data-cy='offerTitle']").text().trim();
          const company = $el.find(".company-name, [data-cy='companyName']").text().trim();
          const location = $el.find(".location, [data-cy='offerLocation']").text().trim();
          const salary = $el.find(".salary, [data-cy='offerSalary']").text().trim();
          const contract = $el.find(".contract, [data-cy='offerContract']").text().trim();
          const href = $el.attr("href") ?? $el.find("a").first().attr("href");

          if (!title || !href) return;

          offers.push({
            title,
            company: company || null,
            location: location || null,
            salary: salary || null,
            contractType: contract || null,
            urlSource: href.startsWith("http") ? href : `${BASE_URL}${href}`,
            sourceName: "hellowork",
            publishedAt: null,
          });
        } catch (err) {
          logger.warn("Failed to parse one listing", {
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
