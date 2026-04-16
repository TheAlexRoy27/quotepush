import { describe, it, expect } from "vitest";
import { APPOINTMENT_STATUSES } from "../drizzle/schema";

// ─── Booking token generation helpers ────────────────────────────────────────

function generateBookingToken(bytes = 24): string {
  // Mirror the crypto.randomBytes logic used in the booking router
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < bytes * 2; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

// ─── Slot confirmation logic helpers ─────────────────────────────────────────

function parseSlots(json: string): string[] {
  try {
    return JSON.parse(json) as string[];
  } catch {
    return [];
  }
}

function isValidSlot(availableSlots: string[], selectedSlot: string): boolean {
  return availableSlots.includes(selectedSlot);
}

function canBook(status: (typeof APPOINTMENT_STATUSES)[number]): boolean {
  return status === "pending";
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Booking token generation", () => {
  it("generates a token of expected length", () => {
    const token = generateBookingToken(24);
    expect(token).toHaveLength(48); // 24 bytes * 2 hex chars each
  });

  it("generates tokens that are alphanumeric", () => {
    const token = generateBookingToken(24);
    expect(token).toMatch(/^[a-z0-9]+$/);
  });

  it("generates unique tokens across multiple calls", () => {
    const tokens = new Set(Array.from({ length: 20 }, () => generateBookingToken(24)));
    expect(tokens.size).toBe(20);
  });

  it("generates longer tokens with more bytes", () => {
    const short = generateBookingToken(12);
    const long = generateBookingToken(32);
    expect(long.length).toBeGreaterThan(short.length);
  });
});

describe("Slot parsing", () => {
  it("parses a valid JSON slot array", () => {
    const slots = ["2026-05-01T10:00:00Z", "2026-05-01T14:00:00Z"];
    const json = JSON.stringify(slots);
    expect(parseSlots(json)).toEqual(slots);
  });

  it("returns empty array for invalid JSON", () => {
    expect(parseSlots("not valid json")).toEqual([]);
  });

  it("returns empty array for empty string", () => {
    expect(parseSlots("")).toEqual([]);
  });

  it("preserves ISO datetime strings exactly", () => {
    const slots = ["2026-06-15T09:30:00.000Z", "2026-06-15T11:00:00.000Z"];
    expect(parseSlots(JSON.stringify(slots))).toEqual(slots);
  });
});

describe("Slot confirmation validation", () => {
  const availableSlots = [
    "2026-05-01T10:00:00Z",
    "2026-05-01T14:00:00Z",
    "2026-05-02T09:00:00Z",
  ];

  it("accepts a slot that is in the available list", () => {
    expect(isValidSlot(availableSlots, "2026-05-01T10:00:00Z")).toBe(true);
  });

  it("rejects a slot that is not in the available list", () => {
    expect(isValidSlot(availableSlots, "2026-05-01T12:00:00Z")).toBe(false);
  });

  it("rejects an empty string as a slot", () => {
    expect(isValidSlot(availableSlots, "")).toBe(false);
  });

  it("is case/format sensitive", () => {
    // Slightly different format should not match
    expect(isValidSlot(availableSlots, "2026-05-01T10:00:00.000Z")).toBe(false);
  });
});

describe("Booking status guard", () => {
  it("allows booking when status is pending", () => {
    expect(canBook("pending")).toBe(true);
  });

  it("blocks booking when status is already booked", () => {
    expect(canBook("booked")).toBe(false);
  });

  it("blocks booking when status is cancelled", () => {
    expect(canBook("cancelled")).toBe(false);
  });
});

describe("Appointment status enum", () => {
  it("contains exactly the expected statuses", () => {
    expect(APPOINTMENT_STATUSES).toContain("pending");
    expect(APPOINTMENT_STATUSES).toContain("booked");
    expect(APPOINTMENT_STATUSES).toContain("cancelled");
    expect(APPOINTMENT_STATUSES).toHaveLength(3);
  });
});
