import { invokeLLM } from "./_core/llm";
import { REPLY_CATEGORIES, ReplyCategory } from "../drizzle/schema";

export interface ClassificationResult {
  category: ReplyCategory;
  confidence: "high" | "medium" | "low";
  reasoning: string;
}

const CATEGORY_DESCRIPTIONS: Record<ReplyCategory, string> = {
  Interested:
    'The lead is interested, wants to proceed, or is open to a call. ' +
    'This includes soft positive signals such as: "yes", "sure", "that works", "sounds good", ' +
    '"absolutely", "I\'m in", "let\'s do it", "ok", "okay", "yeah", "yep", "definitely", ' +
    '"I\'d love to", "when can we talk", "send me more", "book me in", "let\'s connect", ' +
    '"that sounds interesting", "I\'m interested", or any reply that expresses openness or agreement.',
  "Not Interested":
    'The lead is not interested or declines the offer. ' +
    'This includes: "no", "no thanks", "not interested", "not right now", "maybe later", ' +
    '"we\'re good", "we already have something", "not for us", "pass", "nope", "not a fit", ' +
    '"don\'t need it", "we\'re all set", or any polite or direct refusal without asking to stop texts.',
  "Wants More Info":
    'The lead is asking questions or requesting details before deciding. ' +
    'This includes: "what is this about?", "can you tell me more?", "how much does it cost?", ' +
    '"what do you offer?", "how does it work?", "send me info", "what are your rates?", ' +
    '"tell me more", or any reply that shows curiosity but not yet commitment.',
  "Already a Customer":
    'The lead is already a customer, client, or user of the product/service. ' +
    'This includes: "I\'m already a customer", "we already use you", "I have an account", ' +
    '"we\'re already signed up", "I know your product", or similar.',
  Unsubscribe:
    'The lead explicitly wants to stop receiving messages and opt out. ' +
    'This includes: "STOP", "stop", "unsubscribe", "remove me", "take me off your list", ' +
    '"don\'t text me", "don\'t contact me", "please stop", "opt out", "leave me alone", ' +
    '"stop texting me", "remove my number", or any clear request to cease all communication.',
  Other:
    "The reply doesn't clearly fit any of the above categories, is ambiguous, " +
    'is a greeting without clear intent, or is unrelated to the outreach.',
};

// Few-shot examples to anchor the model's judgment
const FEW_SHOT_EXAMPLES = `
Examples:
- "Yes, that works for me!" → Interested
- "Sure, let's chat" → Interested
- "Sounds good, book me in" → Interested
- "Absolutely, I'd love to learn more" → Interested
- "Ok" → Interested
- "Yeah why not" → Interested
- "No thanks" → Not Interested
- "Not interested" → Not Interested
- "We're all set, thanks" → Not Interested
- "Not for us right now" → Not Interested
- "STOP" → Unsubscribe
- "Please remove me from your list" → Unsubscribe
- "Don't text me again" → Unsubscribe
- "Unsubscribe" → Unsubscribe
- "How much does it cost?" → Wants More Info
- "What exactly do you offer?" → Wants More Info
- "I'm already a client of yours" → Already a Customer
- "Hey" → Other
`.trim();

/**
 * Classify an inbound SMS reply into one of the predefined reply categories.
 * Uses the built-in LLM with structured JSON output and rich few-shot examples.
 */
export async function classifyReply(
  replyText: string,
  leadName?: string | null
): Promise<ClassificationResult> {
  const categoryList = REPLY_CATEGORIES.map(
    (c) => `- "${c}": ${CATEGORY_DESCRIPTIONS[c]}`
  ).join("\n\n");

  const systemPrompt = `You are a sales assistant AI that classifies SMS replies from leads into predefined categories.
Your job is to read a lead's reply to an outreach SMS and determine which category best describes their intent.

Pay special attention to:
- Soft positive signals (yes, sure, ok, that works, sounds good, let's chat) → always classify as "Interested"
- Explicit opt-out signals (STOP, unsubscribe, remove me, don't text me) → always classify as "Unsubscribe"
- Polite refusals without opt-out intent (no thanks, not interested, not for us) → classify as "Not Interested"

Categories:
${categoryList}

${FEW_SHOT_EXAMPLES}

Always respond with valid JSON matching the schema exactly. Be decisive — pick the single best category.
When in doubt between Interested and Other, prefer Interested if there is any positive signal.
When in doubt between Unsubscribe and Not Interested, prefer Unsubscribe if the lead wants to stop texts.`;

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
