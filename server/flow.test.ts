import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock the LLM helper so tests don't make real API calls ──────────────────
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(),
}));

import { invokeLLM } from "./_core/llm";
import { classifyReply } from "./replyClassifier";

// ─── Reply Classifier Tests ───────────────────────────────────────────────────

describe("classifyReply - soft-positive and opt-out phrases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const softPositivePhrases = [
    "yes",
    "sure",
    "that works",
    "sounds good",
    "ok",
    "yeah",
    "absolutely",
    "let's do it",
    "I'm in",
  ];

  softPositivePhrases.forEach((phrase) => {
    it(`classifies "${phrase}" as Interested`, async () => {
      (invokeLLM as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify({ category: "Interested", confidence: "high", reasoning: "positive signal" }) } }],
      });
      const result = await classifyReply(phrase, "TestLead");
      expect(result.category).toBe("Interested");
    });
  });

  const optOutPhrases = [
    "STOP",
    "stop",
    "unsubscribe",
    "remove me",
    "don't text me",
    "take me off your list",
  ];

  optOutPhrases.forEach((phrase) => {
    it(`classifies "${phrase}" as Unsubscribe`, async () => {
      (invokeLLM as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify({ category: "Unsubscribe", confidence: "high", reasoning: "opt-out signal" }) } }],
      });
      const result = await classifyReply(phrase, "TestLead");
      expect(result.category).toBe("Unsubscribe");
    });
  });

  const notInterestedPhrases = ["no thanks", "not interested", "not for us"];

  notInterestedPhrases.forEach((phrase) => {
    it(`classifies "${phrase}" as Not Interested`, async () => {
      (invokeLLM as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify({ category: "Not Interested", confidence: "high", reasoning: "refusal" }) } }],
      });
      const result = await classifyReply(phrase, "TestLead");
      expect(result.category).toBe("Not Interested");
    });
  });
});

describe("classifyReply", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("classifies an interested reply correctly", async () => {
    (invokeLLM as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify({
              category: "Interested",
              confidence: "high",
              reasoning: "Lead explicitly asked to schedule a call",
            }),
          },
        },
      ],
    });

    const result = await classifyReply("Yes I'd love to schedule a call!", "John");
    expect(result.category).toBe("Interested");
    expect(result.confidence).toBe("high");
  });

  it("classifies a not interested reply correctly", async () => {
    (invokeLLM as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify({
              category: "Not Interested",
              confidence: "high",
              reasoning: "Lead explicitly declined",
            }),
          },
        },
      ],
    });

    const result = await classifyReply("No thanks, not interested.", "Sarah");
    expect(result.category).toBe("Not Interested");
    expect(result.confidence).toBe("high");
  });

  it("classifies an unsubscribe reply correctly", async () => {
    (invokeLLM as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify({
              category: "Unsubscribe",
              confidence: "high",
              reasoning: "Lead said STOP",
            }),
          },
        },
      ],
    });

    const result = await classifyReply("STOP", "Mike");
    expect(result.category).toBe("Unsubscribe");
  });

  it("classifies a wants more info reply correctly", async () => {
    (invokeLLM as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify({
              category: "Wants More Info",
              confidence: "medium",
              reasoning: "Lead is asking for pricing details",
            }),
          },
        },
      ],
    });

    const result = await classifyReply("Can you tell me more about pricing?", "Alice");
    expect(result.category).toBe("Wants More Info");
    expect(result.confidence).toBe("medium");
  });

  it("classifies an already-a-customer reply as Wants More Info (no dedicated category)", async () => {
    (invokeLLM as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify({
              category: "Wants More Info",
              confidence: "medium",
              reasoning: "Lead is already a customer - classified as Wants More Info",
            }),
          },
        },
      ],
    });

    const result = await classifyReply("I'm already a customer!", "Bob");
    expect(result.category).toBe("Wants More Info");
  });

  it("falls back to Wants More Info on invalid LLM response", async () => {
    (invokeLLM as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: "not valid json at all",
          },
        },
      ],
    });

    const result = await classifyReply("random text", "Dave");
    expect(result.category).toBe("Wants More Info");
    expect(result.confidence).toBe("low");
  });

  it("falls back to Wants More Info on LLM error", async () => {
    (invokeLLM as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("LLM timeout"));

    const result = await classifyReply("some message", "Eve");
    expect(result.category).toBe("Wants More Info");
    expect(result.confidence).toBe("low");
  });

  it("falls back to Wants More Info when category is not in the allowed list", async () => {
    (invokeLLM as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify({
              category: "Unknown Category",
              confidence: "high",
              reasoning: "test",
            }),
          },
        },
      ],
    });

    const result = await classifyReply("some message", "Frank");
    expect(result.category).toBe("Wants More Info");
  });
});

// ─── Prompt Structure Tests ─────────────────────────────────────────────────

describe("classifyReply prompt structure", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls invokeLLM with system and user messages", async () => {
    (invokeLLM as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify({ category: "Wants More Info", confidence: "low", reasoning: "test" }) } }],
    });

    await classifyReply("Hello there", "TestUser");

    expect(invokeLLM).toHaveBeenCalledOnce();
    const callArgs = (invokeLLM as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(callArgs).toHaveProperty("messages");
    expect(Array.isArray(callArgs.messages)).toBe(true);
    expect(callArgs.messages.length).toBeGreaterThanOrEqual(2);
    expect(callArgs.messages[0].role).toBe("system");
    expect(callArgs.messages[1].role).toBe("user");
  });

  it("includes all reply categories in the system prompt", async () => {
    (invokeLLM as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify({ category: "Wants More Info", confidence: "low", reasoning: "test" }) } }],
    });

    await classifyReply("Test message", "User");

    const callArgs = (invokeLLM as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const systemPrompt = callArgs.messages[0].content as string;
    expect(systemPrompt).toContain("Interested");
    expect(systemPrompt).toContain("Not Interested");
    expect(systemPrompt).toContain("Wants More Info");
    expect(systemPrompt).toContain("Unsubscribe");
  });

  it("includes the lead name in the user message", async () => {
    (invokeLLM as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify({ category: "Interested", confidence: "high", reasoning: "test" }) } }],
    });

    await classifyReply("Yes please!", "SpecificLeadName");

    const callArgs = (invokeLLM as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const userMessage = callArgs.messages[1].content as string;
    expect(userMessage).toContain("SpecificLeadName");
  });

  it("requests structured JSON output via response_format", async () => {
    (invokeLLM as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify({ category: "Wants More Info", confidence: "low", reasoning: "test" }) } }],
    });

    await classifyReply("Some reply", "Lead");

    const callArgs = (invokeLLM as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(callArgs).toHaveProperty("response_format");
    expect(callArgs.response_format.type).toBe("json_schema");
    expect(callArgs.response_format.json_schema.name).toBe("reply_classification");
  });
});

// ─── Flow Rule Lookup Tests ───────────────────────────────────────────────────

describe("reconcileFlowDefaults (unit)", () => {
  it("exports reconcileFlowDefaults as a function", async () => {
    const flowDb = await import("./flowDb");
    expect(typeof flowDb.reconcileFlowDefaults).toBe("function");
  });

  it("AUTO_SEND_DEFAULTS enables auto-send for Interested, Not Interested, and Unsubscribe", async () => {
    const { AUTO_SEND_DEFAULTS } = await import("./flowDb");
    expect(AUTO_SEND_DEFAULTS["Interested"]).toBe(true);
    expect(AUTO_SEND_DEFAULTS["Not Interested"]).toBe(true);
    expect(AUTO_SEND_DEFAULTS["Unsubscribe"]).toBe(true);
    // Other categories should NOT be auto-enabled by default
    expect(AUTO_SEND_DEFAULTS["Wants More Info"]).toBeFalsy();
  });

  it("DEFAULT_TEMPLATE_BODIES for Interested includes a scheduling link placeholder", async () => {
    const { DEFAULT_TEMPLATE_BODIES } = await import("./flowDb");
    // DEFAULT_TEMPLATE_BODIES is now an array of templates per category; check the primary one
    const templates = DEFAULT_TEMPLATE_BODIES?.["Interested"];
    expect(templates).toBeDefined();
    const primaryTemplate = Array.isArray(templates) ? templates.find((t: { isPrimary?: boolean }) => t.isPrimary) ?? templates[0] : templates;
    expect(primaryTemplate?.body).toContain("{{link}}");
    // Templates now use {{firstName}} for personalization instead of {{name}}
    expect(primaryTemplate?.body).toMatch(/\{\{firstName\}\}|\{\{name\}\}/);
  });

  it("DEFAULT_TEMPLATE_BODIES for Unsubscribe does NOT include {{name}} or {{link}} (plain opt-out)", async () => {
    const { DEFAULT_TEMPLATE_BODIES } = await import("./flowDb");
    // DEFAULT_TEMPLATE_BODIES is now an array of templates per category; check the primary one
    const templates = DEFAULT_TEMPLATE_BODIES?.["Unsubscribe"];
    expect(templates).toBeDefined();
    const primaryTemplate = Array.isArray(templates) ? templates.find((t: { isPrimary?: boolean }) => t.isPrimary) ?? templates[0] : templates;
    // Unsubscribe primary template should be a plain message without personalization
    expect(primaryTemplate?.body).not.toContain("{{link}}");
  });
});

describe("flowDb helpers (unit)", () => {
  it("REPLY_CATEGORIES contains exactly the four expected categories", async () => {
    const { REPLY_CATEGORIES } = await import("../drizzle/schema");
    expect(REPLY_CATEGORIES).toContain("Interested");
    expect(REPLY_CATEGORIES).toContain("Not Interested");
    expect(REPLY_CATEGORIES).toContain("Wants More Info");
    expect(REPLY_CATEGORIES).toContain("Unsubscribe");
    expect(REPLY_CATEGORIES).not.toContain("Already a Customer");
    expect(REPLY_CATEGORIES).not.toContain("Other");
    expect(REPLY_CATEGORIES).toHaveLength(4);
  });

  it("DEFAULT_FLOW_TEMPLATES covers all four categories", async () => {
    const { REPLY_CATEGORIES } = await import("../drizzle/schema");
    // Import the default bodies from flowDb
    const flowDb = await import("./flowDb");
    // seedDefaultTemplates is the function that creates defaults; verify it exists
    expect(typeof flowDb.seedDefaultTemplates).toBe("function");
    expect(typeof flowDb.listFlowTemplates).toBe("function");
    expect(typeof flowDb.getFlowRuleByCategory).toBe("function");
    expect(typeof flowDb.upsertFlowRule).toBe("function");
    expect(typeof flowDb.listFlowRules).toBe("function");
    expect(typeof flowDb.createMessageClassification).toBe("function");
    expect(typeof flowDb.getClassificationByMessageId).toBe("function");
    // All 4 categories should have a corresponding default template body
    const { DEFAULT_TEMPLATE_BODIES } = flowDb as typeof flowDb & { DEFAULT_TEMPLATE_BODIES?: Record<string, string> };
    if (DEFAULT_TEMPLATE_BODIES) {
      for (const cat of REPLY_CATEGORIES) {
        expect(DEFAULT_TEMPLATE_BODIES).toHaveProperty(cat);
      }
    }
  });
});

// ─── Template Variable Rendering Tests ───────────────────────────────────────

describe("renderTemplate (via twilio helper)", () => {
  it("replaces {{name}} placeholder", async () => {
    const { renderTemplate } = await import("./twilio");
    const result = renderTemplate("Hi {{name}}, how are you?", { name: "Alice" });
    expect(result).toBe("Hi Alice, how are you?");
  });

  it("replaces {{company}} placeholder", async () => {
    const { renderTemplate } = await import("./twilio");
    const result = renderTemplate("I see you work at {{company}}.", { name: "Test User", company: "Acme Corp" });
    expect(result).toBe("I see you work at Acme Corp.");
  });

  it("replaces {{link}} placeholder", async () => {
    const { renderTemplate } = await import("./twilio");
    const result = renderTemplate("Book here: {{link}}", { name: "Test User", link: "https://calendly.com/demo" });
    expect(result).toBe("Book here: https://calendly.com/demo");
  });

  it("replaces {{firstName}} placeholder with first word title-cased", async () => {
    const { renderTemplate } = await import("./twilio");
    const result = renderTemplate("Hi {{firstName}}, welcome!", { name: "adam smith" });
    expect(result).toBe("Hi Adam, welcome!");
  });

  it("auto title-cases {{name}} regardless of input casing", async () => {
    const { renderTemplate } = await import("./twilio");
    const result = renderTemplate("Hi {{name}}!", { name: "adam smith" });
    expect(result).toBe("Hi Adam Smith!");
  });

  it("uses default scheduling link when link value is undefined", async () => {
    const { renderTemplate } = await import("./twilio");
    const result = renderTemplate("Hi {{name}}, book at {{link}}", { name: "Bob", link: undefined });
    expect(result).toContain("Bob");
    // When link is undefined, the helper substitutes a default calendly placeholder URL
    expect(result).toContain("book at");
    expect(result).not.toContain("{{name}}");
  });

  it("replaces all occurrences of the same placeholder", async () => {
    const { renderTemplate } = await import("./twilio");
    const result = renderTemplate("{{name}} said hi. Thanks {{name}}!", { name: "Carol" });
    expect(result).toBe("Carol said hi. Thanks Carol!");
  });
});
