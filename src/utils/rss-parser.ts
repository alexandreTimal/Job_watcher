import Parser from 'rss-parser';
import { createLogger } from './logger.js';

const logger = createLogger('RSS');

export interface RssItem {
  title: string;
  link: string;
  content: string;
  pubDate: string | undefined;
}

const parser = new Parser();

export async function parseRssFeed(url: string): Promise<RssItem[]> {
  try {
    const feed = await parser.parseURL(url);
    return (feed.items ?? []).map((item) => ({
      title: item.title ?? '',
      link: item.link ?? '',
      content: item.contentSnippet ?? item.content ?? '',
      pubDate: item.pubDate ?? item.isoDate,
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to parse feed: ${url}`, { url, error: message });
    return [];
  }
}
