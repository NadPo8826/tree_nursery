import type Anthropic from "@anthropic-ai/sdk";

/**
 * Generic Gemini function-calling loop (REST + SSE, no SDK dependency).
 * Takes tools in the Anthropic format and a tool executor, so the visitor
 * assistant and the Telegram secretary run the same brainstem on Google's
 * engine — guardrails and tool behavior stay identical across providers.
 */

export interface GeminiCallbacks {
  onDelta?: (text: string) => void;
  onReset?: () => void;
}

interface GeminiPart {
  text?: string;
  functionCall?: { name: string; args: Record<string, unknown> };
  functionResponse?: { name: string; response: Record<string, unknown> };
}
interface GeminiContent {
  role: "user" | "model";
  parts: GeminiPart[];
}

/** Gemini's OpenAPI-subset schema doesn't know additionalProperties. */
function toGeminiSchema(schema: Record<string, unknown>): Record<string, unknown> {
  const { additionalProperties: _drop, ...rest } = schema;
  const clean: Record<string, unknown> = { ...rest };
  if (clean.properties) {
    clean.properties = Object.fromEntries(
      Object.entries(clean.properties as Record<string, Record<string, unknown>>).map(
        ([k, v]) => [k, toGeminiSchema(v)],
      ),
    );
  }
  return clean;
}

export async function runGeminiLoop(params: {
  model: string;
  system: string;
  tools: Anthropic.Tool[];
  history: { role: "user" | "assistant"; content: string }[];
  /** Executes a tool call; returns the JSON string handed back to the model. */
  execTool: (name: string, input: Record<string, unknown>) => Promise<string>;
  callbacks?: GeminiCallbacks;
  maxRounds?: number;
  maxOutputTokens?: number;
  errorReply: string;
}): Promise<string> {
  const {
    model,
    system,
    tools,
    history,
    execTool,
    callbacks = {},
    maxRounds = 5,
    maxOutputTokens = 800,
    errorReply,
  } = params;
  const apiKey = process.env.GEMINI_API_KEY!;
  const contents: GeminiContent[] = history.map((t) => ({
    role: t.role === "assistant" ? "model" : "user",
    parts: [{ text: t.content }],
  }));
  const functionDeclarations = tools.map((t) => ({
    name: t.name,
    description: t.description,
    parameters: toGeminiSchema(t.input_schema as Record<string, unknown>),
  }));

  for (let round = 0; round < maxRounds; round++) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: system }] },
          contents,
          tools: [{ functionDeclarations }],
          generationConfig: { maxOutputTokens },
        }),
      },
    );
    if (!res.ok || !res.body) {
      console.error("gemini request failed:", res.status, await res.text());
      return errorReply;
    }

    // collect this round's parts while streaming visible text out
    const modelParts: GeminiPart[] = [];
    let sawTool = false;
    let sentAny = false;
    let textAcc = "";
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let sep;
      while ((sep = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, sep).trim();
        buffer = buffer.slice(sep + 1);
        if (!line.startsWith("data:")) continue;
        let chunk: { candidates?: { content?: { parts?: GeminiPart[] } }[] };
        try {
          chunk = JSON.parse(line.slice(5));
        } catch {
          continue;
        }
        for (const part of chunk.candidates?.[0]?.content?.parts ?? []) {
          modelParts.push(part);
          if (part.functionCall && !sawTool) {
            sawTool = true;
            if (sentAny) callbacks.onReset?.();
          }
          if (part.text && !sawTool) {
            sentAny = true;
            textAcc += part.text;
            callbacks.onDelta?.(part.text);
          } else if (part.text) {
            textAcc += part.text;
          }
        }
      }
    }

    const calls = modelParts.filter((p) => p.functionCall);
    if (calls.length === 0) {
      return textAcc.trim() || errorReply;
    }

    contents.push({ role: "model", parts: modelParts });
    const responses: GeminiPart[] = [];
    for (const call of calls) {
      const fc = call.functionCall!;
      try {
        const result = await execTool(fc.name, fc.args ?? {});
        responses.push({
          functionResponse: { name: fc.name, response: JSON.parse(result) },
        });
      } catch (e) {
        console.error(`gemini tool ${fc.name} failed:`, e);
        responses.push({
          functionResponse: { name: fc.name, response: { error: "הכלי נכשל זמנית" } },
        });
      }
    }
    contents.push({ role: "user", parts: responses });
  }

  return errorReply;
}
