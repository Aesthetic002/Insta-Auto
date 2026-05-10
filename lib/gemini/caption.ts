import { GoogleGenAI } from "@google/genai";

const MODEL = "gemini-2.5-flash";

const DEFAULT_SYSTEM = `You are a social media expert who writes engaging and SEO-optimized Instagram captions. Create a short, catchy caption for the given video topic. Keep the tone natural and appealing. Add highly relevant hashtags at the end that fit the topic. Output ONLY the caption text — no preamble, no quotes, no explanation.`;

export interface CaptionInput {
  outline: string;
  tone?: string;
  hashtagCount?: number;
  systemPromptOverride?: string;
}

export async function generateCaption(input: CaptionInput): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  const ai = new GoogleGenAI({ apiKey });

  const tone = input.tone ?? "engaging, natural, SEO friendly";
  const hashtagCount = input.hashtagCount ?? 2;
  const system =
    input.systemPromptOverride ??
    `${DEFAULT_SYSTEM}\nTone: ${tone}.\nInclude exactly ${hashtagCount} hashtag${hashtagCount === 1 ? "" : "s"} at the end.`;

  const result = await ai.models.generateContent({
    model: MODEL,
    contents: input.outline,
    config: {
      systemInstruction: system,
      temperature: 0.9,
    },
  });

  const text = result.text?.trim();
  if (!text) throw new Error("Gemini returned no text");
  return text;
}
