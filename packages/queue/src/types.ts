export interface ScrapeJobData {
  sourceName: string;
  runId: string;
  userId?: string;
}

export interface ScoreJobData {
  runId: string;
}

export interface FeedJobData {
  userId: string;
}

export interface EmailJobData {
  userId: string;
  offerCount: number;
}

export type PipelineJobName =
  | "scrape-source"
  | "normalize-dedup"
  | "score-offers"
  | "generate-feed"
  | "send-email"
  | "check-source-health";
