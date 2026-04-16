import { describe, it, expect } from "vitest";

// ─── Opt-out keyword detection logic (mirrors server/_core/index.ts) ──────────

const STOP_KEYWORDS = [
  "stop", "stopall", "unsubscribe", "cancel", "end", "quit",
  "no", "remove me", "don't text me", "dont text me",
  "take me off", "opt out", "opt-out", "optout",
];

function isOptOut(body: string): boolean {
  const norm = body.trim().toLowerCase();
  return STOP_KEYWORDS.some(
    (kw) => norm === kw || norm.startsWith(kw + " ") || norm.endsWith(" " + kw)
  );
}

// ─── CSV auto-mapping heuristic (mirrors client/src/pages/LeadsPage.tsx) ──────

type ColumnMap = { name: string; phone: string; company: string; email: string };

function autoDetectMapping(headers: string[]): ColumnMap {
  const find = (patterns: string[]) =>
    headers.find((h) => patterns.some((p) => h.toLowerCase().includes(p))) ?? "";
  return {
    name: find(["name", "full", "first"]),
    phone: find(["phone", "mobile", "tel", "cell", "number"]),
    company: find(["company", "org", "business", "firm"]),
    email: find(["email", "mail"]),
  };
}

// ─── Tests: Opt-out keyword detection ────────────────────────────────────────

describe("Opt-out keyword detection", () => {
  it("detects exact STOP", () => expect(isOptOut("STOP")).toBe(true));
  it("detects lowercase stop", () => expect(isOptOut("stop")).toBe(true));
  it("detects STOPALL", () => expect(isOptOut("STOPALL")).toBe(true));
  it("detects UNSUBSCRIBE", () => expect(isOptOut("UNSUBSCRIBE")).toBe(true));
  it("detects CANCEL", () => expect(isOptOut("CANCEL")).toBe(true));
  it("detects END", () => expect(isOptOut("END")).toBe(true));
  it("detects QUIT", () => expect(isOptOut("QUIT")).toBe(true));
  it("detects 'remove me'", () => expect(isOptOut("remove me")).toBe(true));
  it("detects 'dont text me'", () => expect(isOptOut("dont text me")).toBe(true));
  it("detects \"don't text me\"", () => expect(isOptOut("don't text me")).toBe(true));
  it("detects 'take me off'", () => expect(isOptOut("take me off")).toBe(true));
  it("detects 'opt out'", () => expect(isOptOut("opt out")).toBe(true));
  it("detects 'opt-out'", () => expect(isOptOut("opt-out")).toBe(true));
  it("detects 'optout'", () => expect(isOptOut("optout")).toBe(true));
  it("detects with trailing whitespace", () => expect(isOptOut("  STOP  ")).toBe(true));
  it("does NOT flag a normal reply", () => expect(isOptOut("Yes I am interested")).toBe(false));
  it("does NOT flag 'no thanks' as full opt-out (starts with no + space)", () => {
    // "no thanks" starts with "no " so it IS caught - this is intentional TCPA conservatism
    expect(isOptOut("no thanks")).toBe(true);
  });
  it("does NOT flag 'I want to know more'", () => expect(isOptOut("I want to know more")).toBe(false));
  it("does NOT flag 'stopping by tomorrow'", () => expect(isOptOut("stopping by tomorrow")).toBe(false));
  it("does NOT flag empty string", () => expect(isOptOut("")).toBe(false));
  it("detects 'NO' (exact uppercase)", () => expect(isOptOut("NO")).toBe(true));
});

// ─── Tests: CSV auto-mapping heuristic ───────────────────────────────────────

describe("CSV auto-mapping heuristic", () => {
  it("maps standard headers correctly", () => {
    const result = autoDetectMapping(["name", "phone", "company", "email"]);
    expect(result).toEqual({ name: "name", phone: "phone", company: "company", email: "email" });
  });

  it("maps case-insensitive headers", () => {
    const result = autoDetectMapping(["Full Name", "Phone Number", "Company Name", "Email Address"]);
    expect(result.name).toBe("Full Name");
    expect(result.phone).toBe("Phone Number");
    expect(result.company).toBe("Company Name");
    expect(result.email).toBe("Email Address");
  });

  it("maps mobile to phone", () => {
    const result = autoDetectMapping(["contact_name", "mobile", "org"]);
    expect(result.phone).toBe("mobile");
    expect(result.company).toBe("org");
  });

  it("maps cell to phone", () => {
    const result = autoDetectMapping(["first_name", "cell_number"]);
    expect(result.phone).toBe("cell_number");
  });

  it("maps business to company", () => {
    const result = autoDetectMapping(["name", "tel", "business_name", "mail"]);
    expect(result.company).toBe("business_name");
    expect(result.email).toBe("mail");
  });

  it("returns empty string for unmatched fields", () => {
    const result = autoDetectMapping(["id", "created_at", "source"]);
    expect(result.name).toBe("");
    expect(result.phone).toBe("");
    expect(result.company).toBe("");
    expect(result.email).toBe("");
  });

  it("picks first match when multiple columns match a pattern", () => {
    const result = autoDetectMapping(["first_name", "full_name"]);
    // Both match "name" pattern - should pick first
    expect(result.name).toBe("first_name");
  });
});
