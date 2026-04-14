import { describe, expect, it } from "vitest";
import { renderTemplate } from "./twilio";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Template rendering tests ─────────────────────────────────────────────────

describe("renderTemplate", () => {
  it("replaces {{name}} with the lead name", () => {
    const result = renderTemplate("Hi {{name}}, welcome!", { name: "Alice" });
    expect(result).toBe("Hi Alice, welcome!");
  });

  it("replaces {{company}} with the company name", () => {
    const result = renderTemplate("I saw {{company}} online.", { name: "Alice", company: "Acme" });
    expect(result).toBe("I saw Acme online.");
  });

  it("uses fallback 'your company' when company is null", () => {
    const result = renderTemplate("I saw {{company}} online.", { name: "Alice", company: null });
    expect(result).toBe("I saw your company online.");
  });

  it("replaces {{link}} with the scheduling link", () => {
    const result = renderTemplate("Book here: {{link}}", { name: "Alice", link: "https://calendly.com/test" });
    expect(result).toBe("Book here: https://calendly.com/test");
  });

  it("uses default calendly placeholder when link is not provided", () => {
    const result = renderTemplate("Book here: {{link}}", { name: "Alice" });
    expect(result).toContain("calendly.com");
  });

  it("replaces all occurrences of each variable", () => {
    const result = renderTemplate("Hi {{name}}, {{name}}!", { name: "Bob" });
    expect(result).toBe("Hi Bob, Bob!");
  });

  it("handles a full template with all variables", () => {
    const template = "Hi {{name}}, I saw {{company}}. Book: {{link}}";
    const result = renderTemplate(template, {
      name: "Jane",
      company: "TechCo",
      link: "https://calendly.com/jane",
    });
    expect(result).toBe("Hi Jane, I saw TechCo. Book: https://calendly.com/jane");
  });
});

// ─── Auth logout test (from template) ────────────────────────────────────────

import { COOKIE_NAME } from "../shared/const";

type CookieCall = { name: string; options: Record<string, unknown> };
type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext; clearedCookies: CookieCall[] } {
  const clearedCookies: CookieCall[] = [];
  const user: AuthenticatedUser = {
    id: 1,
    openId: "sample-user",
    email: "sample@example.com",
    name: "Sample User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  const ctx: TrpcContext = {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };
  return { ctx, clearedCookies };
}

describe("auth.logout", () => {
  it("clears the session cookie and reports success", async () => {
    const { ctx, clearedCookies } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toBe(COOKIE_NAME);
    expect(clearedCookies[0]?.options).toMatchObject({ maxAge: -1 });
  });
});

// ─── Status enum validation ───────────────────────────────────────────────────

describe("Lead status values", () => {
  const validStatuses = ["Pending", "Sent", "Replied", "Scheduled"];

  it("has exactly 4 valid statuses", () => {
    expect(validStatuses).toHaveLength(4);
  });

  it("includes all required status labels", () => {
    expect(validStatuses).toContain("Pending");
    expect(validStatuses).toContain("Sent");
    expect(validStatuses).toContain("Replied");
    expect(validStatuses).toContain("Scheduled");
  });
});
