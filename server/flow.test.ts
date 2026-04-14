import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock the LLM helper so tests don't make real API calls ──────────────────
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(),
}));

import { invokeLLM } from "./_core/llm";
import { classifyReply } from "./replyClassifier";

// ─── Reply Classifier Tests ───────────────────────────────────────────────────

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

  it("classifies an already a customer reply", async () => {
    (invokeLLM as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify({
              category: "Already a Customer",
              confidence: "high",
              reasoning: "Lead says they are already using the product",
            }),
          },
        },
      ],
    });

    const result = await classifyReply("I'm already a customer!", "Bob");
    expect(result.category).toBe("Already a Customer");
  });

  it("falls back to Other on invalid LLM response", async () => {
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
    expect(result.category).toBe("Other");
    expect(result.confidence).toBe("low");
  });

  it("falls back to Other on LLM error", async () => {
    (invokeLLM as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("LLM timeout"));

    const result = await classifyReply("some message", "Eve");
    expect(result.category).toBe("Other");
    expect(result.confidence).toBe("low");
  });

  it("falls back to Other when category is not in the allowed list", async () => {
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
    expect(result.category).toBe("Other");
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
    const result = renderTemplate("I see you work at {{company}}.", { company: "Acme Corp" });
    expect(result).toBe("I see you work at Acme Corp.");
  });

  it("replaces {{link}} placeholder", async () => {
    const { renderTemplate } = await import("./twilio");
    const result = renderTemplate("Book here: {{link}}", { link: "https://calendly.com/demo" });
    expect(result).toBe("Book here: https://calendly.com/demo");
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
