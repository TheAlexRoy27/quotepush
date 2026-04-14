import { describe, expect, it } from "vitest";
import { extractValue, mapPayloadToLead } from "./webhookEngine";

// ─── extractValue tests ───────────────────────────────────────────────────────

describe("extractValue", () => {
  it("extracts a top-level field", () => {
    expect(extractValue({ name: "Alice" }, "name")).toBe("Alice");
  });

  it("extracts a nested field using dot notation", () => {
    expect(extractValue({ contact: { full_name: "Bob" } }, "contact.full_name")).toBe("Bob");
  });

  it("extracts deeply nested fields", () => {
    expect(extractValue({ a: { b: { c: "deep" } } }, "a.b.c")).toBe("deep");
  });

  it("returns undefined for missing field", () => {
    expect(extractValue({ name: "Alice" }, "phone")).toBeUndefined();
  });

  it("returns undefined for missing nested field", () => {
    expect(extractValue({ contact: {} }, "contact.phone")).toBeUndefined();
  });

  it("returns undefined for empty path", () => {
    expect(extractValue({ name: "Alice" }, "")).toBeUndefined();
  });

  it("returns undefined for null input", () => {
    expect(extractValue(null, "name")).toBeUndefined();
  });

  it("converts numbers to strings", () => {
    expect(extractValue({ count: 42 }, "count")).toBe("42");
  });

  it("returns undefined for empty string value", () => {
    expect(extractValue({ name: "" }, "name")).toBeUndefined();
  });

  it("trims whitespace from values", () => {
    expect(extractValue({ name: "  Alice  " }, "name")).toBe("Alice");
  });
});

// ─── mapPayloadToLead tests ───────────────────────────────────────────────────

describe("mapPayloadToLead", () => {
  const mappings = {
    name: "full_name",
    phone: "mobile",
    company: "company_name",
    email: "email_address",
  };

  it("maps a flat payload correctly", () => {
    const payload = {
      full_name: "Jane Doe",
      mobile: "+15551234567",
      company_name: "Acme",
      email_address: "jane@acme.com",
    };
    const result = mapPayloadToLead(payload, mappings);
    expect(result).toEqual({
      name: "Jane Doe",
      phone: "+15551234567",
      company: "Acme",
      email: "jane@acme.com",
    });
  });

  it("maps a nested payload using dot notation", () => {
    const nestedMappings = {
      name: "contact.name",
      phone: "contact.phone",
      company: "contact.company",
      email: "contact.email",
    };
    const payload = {
      contact: {
        name: "John Smith",
        phone: "+15559876543",
        company: "TechCo",
        email: "john@techco.com",
      },
    };
    const result = mapPayloadToLead(payload, nestedMappings);
    expect(result).toEqual({
      name: "John Smith",
      phone: "+15559876543",
      company: "TechCo",
      email: "john@techco.com",
    });
  });

  it("returns null when name is missing", () => {
    const payload = { mobile: "+15551234567" };
    expect(mapPayloadToLead(payload, mappings)).toBeNull();
  });

  it("returns null when phone is missing", () => {
    const payload = { full_name: "Jane Doe" };
    expect(mapPayloadToLead(payload, mappings)).toBeNull();
  });

  it("returns result without optional fields when they are absent", () => {
    const payload = { full_name: "Jane Doe", mobile: "+15551234567" };
    const result = mapPayloadToLead(payload, mappings);
    expect(result).not.toBeNull();
    expect(result?.name).toBe("Jane Doe");
    expect(result?.phone).toBe("+15551234567");
    expect(result?.company).toBeUndefined();
    expect(result?.email).toBeUndefined();
  });

  it("handles GoHighLevel-style nested payload", () => {
    const ghlMappings = { name: "contact.fullName", phone: "contact.phone", company: "contact.companyName", email: "contact.email" };
    const payload = {
      contact: {
        fullName: "Sarah Connor",
        phone: "+15550001111",
        companyName: "Skynet",
        email: "sarah@skynet.io",
      },
      event: "contact.created",
    };
    const result = mapPayloadToLead(payload, ghlMappings);
    expect(result?.name).toBe("Sarah Connor");
    expect(result?.phone).toBe("+15550001111");
    expect(result?.company).toBe("Skynet");
  });

  it("handles HubSpot-style properties payload", () => {
    const hubspotMappings = {
      name: "properties.firstname",
      phone: "properties.phone",
      company: "properties.company",
      email: "properties.email",
    };
    const payload = {
      properties: {
        firstname: "Tony Stark",
        phone: "+15553334444",
        company: "Stark Industries",
        email: "tony@stark.com",
      },
    };
    const result = mapPayloadToLead(payload, hubspotMappings);
    expect(result?.name).toBe("Tony Stark");
    expect(result?.company).toBe("Stark Industries");
  });
});
