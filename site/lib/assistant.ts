import Anthropic from "@anthropic-ai/sdk";
import { randomUUID } from "crypto";
import { repo } from "@/lib/db";
import type { Lead } from "@/lib/db";
import { notifyNewLead } from "@/lib/notify";

/**
 * The visitor-facing AI representative — channel-agnostic core.
 * Used by the web chat widget today; the Telegram/WhatsApp customer bots
 * become thin adapters over this same function.
 *
 * Data access is read-only by design: the only writing tool is the
 * insert-only save_lead. No update/delete surface exists here, so a
 * prompt-injected conversation cannot modify catalog data.
 */

import {
  DEFAULT_AI_MODEL,
  DEFAULT_AI_PROVIDER,
  isValidAiChoice,
  providerKeyConfigured,
  type AiProvider,
} from "@/lib/ai-models";
import {
  DEFAULT_TOOL_NURSERY_INFO,
  DEFAULT_TOOL_SAVE_LEAD,
  DEFAULT_TOOL_SEARCH_TREES,
  DEFAULT_VISITOR_SYSTEM,
  effectivePrompt,
  fillPlaceholders,
} from "@/lib/ai-prompts";
import type { Settings } from "@/lib/db";
import { hasPromo } from "@/lib/catalog";
import { runGeminiLoop } from "@/lib/gemini";

const MAX_TOOL_ROUNDS = 5;

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

const client = new Anthropic();

/**
 * Tool descriptions are admin-editable (/admin/ai); the input schemas are
 * deliberately NOT — editing parameter shapes breaks function calling.
 */
function buildTools(settings: Settings): Anthropic.Tool[] {
  const p = settings.aiPrompts;
  return [
    {
      name: "search_trees",
      description: effectivePrompt(p.toolSearchTrees, DEFAULT_TOOL_SEARCH_TREES),
      input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "מילות חיפוש בשם העץ, למשל 'זית' או 'צל'. ריק = כל הקטלוג",
        },
        max_height_m: {
          type: "number",
          description: "גובה מקסימלי במטרים (לגינות קטנות)",
        },
      },
      additionalProperties: false,
    },
    },
    {
      name: "get_nursery_info",
      description: effectivePrompt(p.toolNurseryInfo, DEFAULT_TOOL_NURSERY_INFO),
      input_schema: { type: "object", properties: {}, additionalProperties: false },
    },
    {
      name: "save_lead",
      description: effectivePrompt(p.toolSaveLead, DEFAULT_TOOL_SAVE_LEAD),
      input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "שם האורח" },
        phone: { type: "string", description: "מספר טלפון" },
        email: {
          type: "string",
          description: "כתובת מייל, אם האורח מסר (רשות — אל תתעכב עליה)",
        },
        interest: {
          type: "string",
          description: "במה האורח מתעניין, במשפט אחד",
        },
        summary: {
          type: "string",
          description: "סיכום קצר של השיחה עבור צוות המשתלה",
        },
      },
      required: ["name", "phone", "interest"],
      additionalProperties: false,
    },
  },
  ];
}

/**
 * System prompt = the admin-editable template (default in lib/ai-prompts.ts)
 * with contact placeholders filled, plus the owner-written info block.
 */
function buildSystemPrompt(settings: Settings): string {
  const base = fillPlaceholders(
    effectivePrompt(settings.aiPrompts.visitorSystem, DEFAULT_VISITOR_SYSTEM),
    {
      siteName: settings.siteName,
      phone: settings.phone,
      proPhone: settings.proPhone,
    },
  );
  const infoBlock = settings.aiInfoHe.trim()
    ? `\n\n## מידע על המשתלה (נכתב על ידי הבעלים — זה כל מה שמותר לך לומר על המשתלה עצמה)\n${settings.aiInfoHe.trim()}`
    : "";
  return base + infoBlock;
}

async function runTool(
  name: string,
  input: Record<string, unknown>,
  sourcePage: string,
): Promise<{ result: string; leadSaved: boolean }> {
  if (name === "search_trees") {
    const [trees, settings] = await Promise.all([
      repo.getTrees(),
      repo.getSettings(),
    ]);
    const query = String(input.query ?? "").trim();
    const maxH = Number(input.max_height_m) || null;
    const visible = trees.filter(
      (t) => t.saleType !== "unique" || t.availability !== "sold",
    );
    const matches = visible.filter((t) => {
      if (query && !`${t.nameHe} ${t.speciesLatin} ${t.categoryHe} ${t.storyHe} ${t.aiNotesHe}`.includes(query))
        return false;
      // height is authoritative only for veterans (one specific specimen);
      // stock varieties stay in the results — sizes vary per specimen
      if (maxH && t.saleType === "unique" && t.heightM > maxH) return false;
      return true;
    });
    const list = (matches.length > 0 ? matches : visible).slice(0, 10).map((t) => ({
      name: t.nameHe,
      // tag number is a per-specimen identity — veterans only
      code: t.saleType === "unique" ? t.code : undefined,
      latin: t.saleType === "unique" ? t.speciesLatin || undefined : undefined,
      category: t.categoryHe,
      type: t.saleType === "unique" ? "דייר ותיק — עץ יחיד" : "עץ מלאי",
      // per-specimen specs go out only for veterans — a stock variety's DB
      // values (if any linger) are not facts the AI may state
      height_m: t.saleType === "unique" ? t.heightM || undefined : undefined,
      trunk_cm: t.saleType === "unique" ? t.trunkDiameterCm || undefined : undefined,
      age_years: t.saleType === "unique" ? t.ageYears || undefined : undefined,
      availability:
        t.saleType === "unique"
          ? "מוצג בקטלוג"
          : t.availability === "sold"
            ? "אזל מהמלאי"
            : "במלאי",
      price: (() => {
        if (!settings.showPrices || t.priceMode === "hidden") return "למחיר צרו קשר";
        const promo = hasPromo(t);
        const effective = promo ? t.promoPrice! : t.price;
        const base =
          t.saleType === "unique"
            ? `₪${effective.toLocaleString("he-IL")} (מחיר מדויק)`
            : `החל מ־₪${effective.toLocaleString("he-IL")}`;
        return promo ? `${base} — במבצע! (במקום ₪${t.price.toLocaleString("he-IL")})` : base;
      })(),
      story: t.storyHe,
      // the owner's care notes — the only allowed source for care answers
      care_notes: t.aiNotesHe || undefined,
    }));
    return {
      result: JSON.stringify(
        { note: matches.length === 0 && query ? "לא נמצאה התאמה מדויקת — אלה העצים הזמינים" : undefined, trees: list },
        null,
        0,
      ),
      leadSaved: false,
    };
  }

  if (name === "get_nursery_info") {
    const settings = await repo.getSettings();
    return {
      result: JSON.stringify({
        name: settings.siteName,
        hours: settings.hoursHe,
        phone: settings.phone,
        pro_phone: settings.proPhone,
        address:
          settings.addressHe ||
          "כתובת לא הוגדרה — הפנה לטלפון לתיאום הגעה",
        navigation:
          settings.addressHe || settings.navCoords
            ? "כפתורי ניווט Waze / Google Maps נמצאים בעמוד תיאום הביקור באתר"
            : undefined,
        info:
          settings.aiInfoHe.trim() ||
          "אין מידע נוסף מהבעלים — הפנה את השאלה לטלפון, אל תמציא.",
      }),
      leadSaved: false,
    };
  }

  if (name === "save_lead") {
    const email = String(input.email ?? "").trim().slice(0, 120);
    const lead: Lead = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      name: String(input.name ?? "").slice(0, 80),
      phone: String(input.phone ?? "").slice(0, 20),
      email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? email : undefined,
      message: String(input.summary ?? "").slice(0, 1000),
      interest: String(input.interest ?? "").slice(0, 200),
      items: [],
      channel: "ai_chat",
      sourcePage,
      isPro: false,
      status: "new",
    };
    if (lead.name.length < 2 || lead.phone.length < 8) {
      return {
        result: JSON.stringify({ ok: false, error: "שם או טלפון חסרים/קצרים מדי — בקש שוב בנימוס" }),
        leadSaved: false,
      };
    }
    await repo.addLead(lead);
    notifyNewLead(lead).catch((e) => console.error("notify failed:", e));
    return { result: JSON.stringify({ ok: true }), leadSaved: true };
  }

  return { result: JSON.stringify({ error: "unknown tool" }), leadSaved: false };
}

export interface AssistantStreamCallbacks {
  /** A chunk of the visible reply, in order. */
  onDelta?: (text: string) => void;
  /** Streamed text turned out to be a tool preamble — discard what was shown. */
  onReset?: () => void;
}

export interface AssistantResult {
  reply: string;
  leadSaved: boolean;
  provider: AiProvider;
  model: string;
}

/** The engine the owner picked in /admin/settings, if its key is configured. */
function resolveEngine(settings: Settings): { provider: AiProvider; model: string } {
  const provider = settings.aiProvider;
  const model = settings.aiModel;
  if (isValidAiChoice(provider, model) && providerKeyConfigured(provider)) {
    return { provider, model };
  }
  // fall back to whichever provider actually has a key
  if (providerKeyConfigured(DEFAULT_AI_PROVIDER)) {
    return { provider: DEFAULT_AI_PROVIDER, model: DEFAULT_AI_MODEL };
  }
  return { provider: "gemini", model: "gemini-flash-latest" };
}

export async function runVisitorAssistant(
  history: ChatTurn[],
  sourcePage = "/chat",
  callbacks: AssistantStreamCallbacks = {},
): Promise<AssistantResult> {
  const settings = await repo.getSettings();
  const { provider, model } = resolveEngine(settings);
  const system = buildSystemPrompt(settings);
  const chatTools = buildTools(settings);

  if (provider === "gemini") {
    // the shared Gemini loop returns text only; lead saving is observed
    // through the tool executor closure
    let leadSaved = false;
    const reply = await runGeminiLoop({
      model,
      system,
      tools: chatTools,
      history,
      execTool: async (name, input) => {
        const { result, leadSaved: saved } = await runTool(name, input, sourcePage);
        if (saved) leadSaved = true;
        return result;
      },
      callbacks,
      maxRounds: MAX_TOOL_ROUNDS,
      maxOutputTokens: 800,
      errorReply: "סליחה, משהו הסתבך אצלי. אפשר פשוט להתקשר אלינו — נשמח לעזור!",
    });
    return { reply, leadSaved, provider, model };
  }

  const { reply, leadSaved } = await runAnthropicConversation(
    model,
    system,
    chatTools,
    history,
    sourcePage,
    callbacks,
  );
  return { reply, leadSaved, provider, model };
}

async function runAnthropicConversation(
  MODEL: string,
  system: string,
  tools: Anthropic.Tool[],
  history: ChatTurn[],
  sourcePage: string,
  callbacks: AssistantStreamCallbacks,
): Promise<{ reply: string; leadSaved: boolean }> {
  const messages: Anthropic.MessageParam[] = history.map((t) => ({
    role: t.role,
    content: t.content,
  }));
  // cache_control on the last tool caches the whole tools+system prefix
  const cachedTools: Anthropic.Tool[] = tools.map((t, i) =>
    i === tools.length - 1
      ? { ...t, cache_control: { type: "ephemeral" as const } }
      : t,
  );

  let leadSaved = false;

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    // Stream every round: deltas go to the visitor immediately. If the
    // round turns out to be a tool call, onReset clears the preamble.
    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: 800,
      system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
      tools: cachedTools,
      messages,
    });
    let sawTool = false;
    let sentAny = false;
    stream.on("streamEvent", (event) => {
      if (
        event.type === "content_block_start" &&
        event.content_block.type === "tool_use" &&
        !sawTool
      ) {
        sawTool = true;
        if (sentAny) callbacks.onReset?.();
      }
    });
    stream.on("text", (delta) => {
      if (!sawTool) {
        sentAny = true;
        callbacks.onDelta?.(delta);
      }
    });
    const response = await stream.finalMessage();

    if (response.stop_reason === "refusal") {
      return {
        reply: "מצטער, אני לא יכול לעזור בזה. אשמח לענות על כל שאלה על המשתלה והעצים שלנו 🌳",
        leadSaved,
      };
    }

    if (response.stop_reason !== "tool_use") {
      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim();
      return { reply: text || "סליחה, לא הצלחתי לנסח תשובה. אפשר לנסות שוב?", leadSaved };
    }

    messages.push({ role: "assistant", content: response.content });
    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type === "tool_use") {
        try {
          const { result, leadSaved: saved } = await runTool(
            block.name,
            block.input as Record<string, unknown>,
            sourcePage,
          );
          if (saved) leadSaved = true;
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: result,
          });
        } catch (e) {
          console.error(`assistant tool ${block.name} failed:`, e);
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: JSON.stringify({ error: "כלי נכשל זמנית" }),
            is_error: true,
          });
        }
      }
    }
    messages.push({ role: "user", content: toolResults });
  }

  return {
    reply: "סליחה, משהו הסתבך אצלי. אפשר פשוט להתקשר אלינו — נשמח לעזור!",
    leadSaved,
  };
}
