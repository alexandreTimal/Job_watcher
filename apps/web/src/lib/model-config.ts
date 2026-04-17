export const MODEL_CONFIG = {
  "gemini-3.1-pro-preview":        { label: "Gemini 3.1 Pro (preview)",        pricing: { input: 1.25,  output: 10.00 } },
  "gemini-3.1-flash-lite-preview": { label: "Gemini 3.1 Flash Lite (preview)", pricing: { input: 0.075, output: 0.30 } },
  "gemini-3-pro-preview":          { label: "Gemini 3 Pro (preview)",          pricing: { input: 1.25,  output: 10.00 } },
  "gemini-3-flash-preview":        { label: "Gemini 3 Flash (preview)",        pricing: { input: 0.15,  output: 0.60 } },
  "gemini-2.5-pro":                { label: "Gemini 2.5 Pro",                  pricing: { input: 1.25,  output: 10.00 } },
  "gemini-2.5-flash":              { label: "Gemini 2.5 Flash",                pricing: { input: 0.15,  output: 0.60 } },
  "gemini-2.5-flash-lite":         { label: "Gemini 2.5 Flash Lite",           pricing: { input: 0.075, output: 0.30 } },
  "gemini-2.0-flash":              { label: "Gemini 2.0 Flash",                pricing: { input: 0.10,  output: 0.40 } },
  "gemini-2.0-flash-lite":         { label: "Gemini 2.0 Flash Lite",           pricing: { input: 0.075, output: 0.30 } },
} as const satisfies Record<string, { label: string; pricing: { input: number; output: number } }>;

export type ModelId = keyof typeof MODEL_CONFIG;

export const AVAILABLE_MODEL_IDS = Object.keys(MODEL_CONFIG) as [ModelId, ...ModelId[]];

export const AVAILABLE_MODELS = (Object.entries(MODEL_CONFIG) as [ModelId, (typeof MODEL_CONFIG)[ModelId]][]).map(
  ([id, cfg]) => ({ id, label: cfg.label }),
);

export function isAvailableModel(value: unknown): value is ModelId {
  return typeof value === "string" && value in MODEL_CONFIG;
}
