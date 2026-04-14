// ─── QuotePush.io Subscription Plans ───────────────────────────────────────────
// Base:  $199/month — 1 seat, cancel anytime
// Elite: $249/month — unlimited seats, cancel anytime

export const PLANS = {
  base: {
    id: "base" as const,
    name: "Base",
    price: 199_00, // cents
    interval: "month" as const,
    description: "1 seat included. Cancel anytime.",
    features: [
      "Lead management dashboard",
      "CSV import & manual entry",
      "Personalized SMS outreach",
      "AI-powered reply classification",
      "Auto-flow templates",
      "CRM webhook integration",
      "1 team seat",
    ],
  },
  elite: {
    id: "elite" as const,
    name: "Elite",
    price: 249_00, // cents
    interval: "month" as const,
    description: "Unlimited seats. Cancel anytime.",
    features: [
      "Everything in Base",
      "Unlimited team members",
      "Priority support",
      "Advanced analytics (coming soon)",
      "White-label options (coming soon)",
    ],
  },
} as const;

export type PlanId = keyof typeof PLANS;
