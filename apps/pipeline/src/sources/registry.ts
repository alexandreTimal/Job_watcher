import type { ScrapingSource } from "../lib/source-interface";
import { franceTravailSource } from "./france-travail";
import { wttjSource } from "./wttj";
import { helloworkSource } from "./hellowork";

export const sourceRegistry: Record<string, ScrapingSource> = {
  "france-travail": franceTravailSource,
  wttj: wttjSource,
  hellowork: helloworkSource,
};
