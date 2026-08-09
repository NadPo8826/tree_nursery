/**
 * The AI engines the owner can pick from in /admin/settings.
 * The matching API key must exist in the server env (ANTHROPIC_API_KEY /
 * GEMINI_API_KEY) — the admin picker only chooses among configured engines.
 */
export type AiProvider = "anthropic" | "gemini";

export interface AiModelOption {
  id: string;
  labelHe: string;
}

export const AI_MODELS: Record<AiProvider, AiModelOption[]> = {
  anthropic: [
    { id: "claude-haiku-4-5", labelHe: "Claude Haiku — הכי מהיר וזול" },
    { id: "claude-sonnet-5", labelHe: "Claude Sonnet — מאוזן (מומלץ)" },
    { id: "claude-opus-5", labelHe: "Claude Opus — החכם ביותר, איטי יותר" },
  ],
  // rolling aliases: always the newest stable Gemini, immune to model retirement
  gemini: [
    { id: "gemini-flash-latest", labelHe: "Gemini Flash — מהיר וזול" },
    { id: "gemini-pro-latest", labelHe: "Gemini Pro — חכם יותר, איטי יותר" },
  ],
};

export const PROVIDER_LABELS: Record<AiProvider, string> = {
  anthropic: "Anthropic (Claude)",
  gemini: "Google (Gemini)",
};

export const DEFAULT_AI_PROVIDER: AiProvider = "anthropic";
export const DEFAULT_AI_MODEL = "claude-sonnet-5";

export function isValidAiChoice(provider: string, model: string): provider is AiProvider {
  return (
    provider in AI_MODELS &&
    AI_MODELS[provider as AiProvider].some((m) => m.id === model)
  );
}

export function providerKeyConfigured(provider: AiProvider): boolean {
  return provider === "anthropic"
    ? Boolean(process.env.ANTHROPIC_API_KEY)
    : Boolean(process.env.GEMINI_API_KEY);
}
