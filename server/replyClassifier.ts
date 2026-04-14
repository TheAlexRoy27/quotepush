import { invokeLLM } from "./_core/llm";
import { REPLY_CATEGORIES, ReplyCategory } from "../drizzle/schema";

export interface ClassificationResult {
  category: ReplyCategory;
  confidence: "high" | "medium" | "low";
  reasoning: string;
}

const CATEGORY_DESCRIPTIONS: Record<ReplyCategory, string> = {
  Interested: "The lead is interested, wants to proceed, wants to schedule a call, or is asking about next steps.",
  "Not Interested": "The lead is not interested, declines the offer, or says they don't need the product/service.",
  "Wants More Info": "The lead is asking questions, requesting details, pricing, features, or more information before deciding.",
  "Already a Customer": "The lead is already a customer, client, or user of the product/service.",
  Unsubscribe: "The lead wants to stop receiving messages, opt out, or says 'stop', 'unsubscribe', 'remove me', etc.",
  Other: "The reply doesn't clearly fit any of the above categories, is ambiguous, or is a generic response.",
};

/**
 * Classify an inbound SMS reply into one of the predefined reply categories.
 * Uses the built-in LLM with structured JSON output.
 */
export async function classifyReply(
  replyText: string,
  leadName?: string | null
): Promise<ClassificationResult> {
  const categoryList = REPLY_CATEGORIES.map(
    (c) => `- "${c}": ${CATEGORY_DESCRIPTIONS[c]}`
  ).join("\n");

  const systemPrompt = `You are a sales assistant AI that classifies SMS replies from leads into predefined categories.
Your job is to read a lead's reply to an outreach SMS and determine which category best describes their intent.

Categories:
${categoryList}

Always respond with valid JSON matching the schema exactly. Be decisive — pick the single best category.`;

  const userPrompt = `${leadName ? `Lead name: ${leadName}\n` : ""}Lead's SMS reply: "${replyText}"

Classify this reply into exactly one category.`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "reply_classification",
          strict: true,
          schema: {
            type: "object",
            properties: {
              category: {
                type: "string",
                enum: REPLY_CATEGORIES as unknown as string[],
                description: "The best matching category for this reply",
              },
              confidence: {
                type: "string",
                enum: ["high", "medium", "low"],
                description: "How confident you are in this classification",
              },
              reasoning: {
                type: "string",
                description: "Brief one-sentence explanation of why this category was chosen",
              },
            },
            required: ["category", "confidence", "reasoning"],
            additionalProperties: false,
          },
        },
      },
    });

    const rawContent = response?.choices?.[0]?.message?.content;
    if (!rawContent) throw new Error("Empty LLM response");
    const content = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);

    const parsed = JSON.parse(content) as ClassificationResult;

    // Validate category is one of the known values
    if (!REPLY_CATEGORIES.includes(parsed.category as ReplyCategory)) {
      console.warn(`[Classifier] Unknown category returned: ${parsed.category}, defaulting to Other`);
      return { category: "Other", confidence: "low", reasoning: "Unknown category from LLM" };
    }

    return parsed;
  } catch (err) {
    console.error("[Classifier] LLM classification failed:", err);
    // Graceful fallback — don't break the webhook flow
    return {
      category: "Other",
      confidence: "low",
      reasoning: "Classification failed — defaulted to Other",
    };
  }
}
