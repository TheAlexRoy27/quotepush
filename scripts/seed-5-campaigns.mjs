/**
 * Seed the 5 industry drip campaigns into all existing orgs.
 * Wipes existing drip sequences first so the new ones are applied cleanly.
 * Run: node scripts/seed-5-campaigns.mjs
 */
import { createConnection } from "mysql2/promise";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) throw new Error("DATABASE_URL not set");

const conn = await createConnection(DB_URL);

// ─── Campaign definitions ──────────────────────────────────────────────────────

const CAMPAIGNS = [
  // ── 1. Insurance Agent ────────────────────────────────────────────────────
  {
    name: "🛡️ Insurance Agent — Form Lead",
    triggerCategory: "Interested",
    steps: [
      {
        name: "Thank You + Availability Ask",
        delayAmount: 0,
        delayUnit: "minutes",
        body: "Hi {{firstName}}, thanks so much for filling out the form! I'd love to connect — is Monday a good time for a quick 10-min call? Just reply YES or let me know what works best for you!",
        branches: [
          {
            branchType: "positive",
            name: "Book a Call",
            delayAmount: 2,
            delayUnit: "minutes",
            body: "That's great, {{firstName}}! Here's my calendar link to lock in a time that works for you: {{link}} — takes less than a minute to book. Looking forward to it! 🗓️",
          },
          {
            branchType: "negative",
            name: "Soft Exit with Cal Link",
            delayAmount: 2,
            delayUnit: "minutes",
            body: "No worries at all, {{firstName}}! Life gets busy. If anything opens up, here's my link to grab a quick 10-min call whenever it's convenient: {{link}} — I'm always happy to help. 😊",
          },
        ],
      },
      {
        name: "Day 3 Follow-up",
        delayAmount: 3,
        delayUnit: "days",
        body: "Hey {{firstName}}, just checking in! I still have some availability this week if you'd like to chat about your coverage options. Even 10 minutes can make a big difference. Reply YES to grab a time!",
      },
      {
        name: "Day 7 Final Check-in",
        delayAmount: 7,
        delayUnit: "days",
        body: "Hi {{firstName}}, last follow-up from me — I don't want to be a bother! If you're still exploring options, I'm here. Here's my calendar: {{link}} — no pressure, just here to help whenever you're ready. 🙏",
      },
    ],
  },

  // ── 2. Real Estate Agent ──────────────────────────────────────────────────
  {
    name: "🏠 Real Estate — Buyer Inquiry",
    triggerCategory: "Interested",
    steps: [
      {
        name: "Welcome + Availability",
        delayAmount: 0,
        delayUnit: "minutes",
        body: "Hi {{firstName}}! Thanks for reaching out about buying a home. I'd love to learn more about what you're looking for — can we hop on a quick 10-min call this week? Reply YES and I'll send over some times!",
        branches: [
          {
            branchType: "positive",
            name: "Send Calendar",
            delayAmount: 3,
            delayUnit: "minutes",
            body: "Awesome, {{firstName}}! Here's my calendar to pick a time that works for you: {{link}} — I'll have some great listings ready to share. Can't wait to help you find your dream home! 🏡",
          },
          {
            branchType: "negative",
            name: "Leave Door Open",
            delayAmount: 3,
            delayUnit: "minutes",
            body: "Totally understand, {{firstName}}! Whenever you're ready to start the search, I'm here. Feel free to book a call at your convenience: {{link}} — no rush at all! 😊",
          },
        ],
      },
      {
        name: "Day 2 Market Update",
        delayAmount: 2,
        delayUnit: "days",
        body: "Hey {{firstName}}, just wanted to share — the market in your area is moving fast right now! I'd love to get you set up with a personalized search. Ready to chat? Reply YES!",
      },
      {
        name: "Day 5 Value Add",
        delayAmount: 5,
        delayUnit: "days",
        body: "Hi {{firstName}}, I put together a quick guide on the top 5 things first-time buyers should know. Want me to send it over? Just reply YES and I'll get it to you right away!",
      },
      {
        name: "Day 10 Final",
        delayAmount: 10,
        delayUnit: "days",
        body: "Hey {{firstName}}, last message from me — I don't want to crowd your inbox! If you're still thinking about buying, I'd love to be your agent. Here's my calendar: {{link}} — I'm always here when you're ready. 🏠",
      },
    ],
  },

  // ── 3. Solar Sales ────────────────────────────────────────────────────────
  {
    name: "☀️ Solar — Savings Quote",
    triggerCategory: "Interested",
    steps: [
      {
        name: "Savings Intro",
        delayAmount: 0,
        delayUnit: "minutes",
        body: "Hi {{firstName}}! Great news — based on your area, you could save significantly on your electric bill with solar. Can I walk you through a free savings estimate? Reply YES for a quick 10-min call!",
        branches: [
          {
            branchType: "positive",
            name: "Book Savings Call",
            delayAmount: 2,
            delayUnit: "minutes",
            body: "Excellent, {{firstName}}! Let's get your free savings estimate scheduled. Here's my calendar: {{link}} — I'll have your personalized numbers ready. This could save you thousands! ☀️",
          },
          {
            branchType: "negative",
            name: "Soft Exit",
            delayAmount: 2,
            delayUnit: "minutes",
            body: "No problem at all, {{firstName}}! Solar savings don't expire — whenever you're curious, I'm happy to run the numbers. Here's my link: {{link}} — zero pressure, just here to help! 😊",
          },
        ],
      },
      {
        name: "Day 3 Urgency",
        delayAmount: 3,
        delayUnit: "days",
        body: "Hey {{firstName}}, just a heads up — current incentives and tax credits are at their highest right now. Locking in sooner means bigger savings. Want me to run your free estimate? Reply YES!",
      },
      {
        name: "Day 7 Social Proof",
        delayAmount: 7,
        delayUnit: "days",
        body: "Hi {{firstName}}, one of my clients in your area just cut their electric bill by 80% with solar. I'd love to show you what's possible for your home. Here's my calendar: {{link}} — 10 minutes could change everything! ☀️",
      },
    ],
  },

  // ── 4. Mortgage Broker ────────────────────────────────────────────────────
  {
    name: "🏦 Mortgage — Rate Quote",
    triggerCategory: "Wants More Info",
    steps: [
      {
        name: "Rate Info + CTA",
        delayAmount: 0,
        delayUnit: "minutes",
        body: "Hi {{firstName}}, thanks for your interest in mortgage rates! Rates are moving daily right now — I'd love to lock in a personalized quote for you. Can we do a quick 10-min call? Reply YES!",
        branches: [
          {
            branchType: "positive",
            name: "Send Pre-Approval Link",
            delayAmount: 3,
            delayUnit: "minutes",
            body: "Perfect, {{firstName}}! Let's get your rate locked in. Here's my calendar to schedule your free consultation: {{link}} — I'll have your personalized rate ready before we even talk. 🏦",
          },
          {
            branchType: "negative",
            name: "Educational Follow-up",
            delayAmount: 3,
            delayUnit: "minutes",
            body: "Totally get it, {{firstName}}! No rush at all. When you're ready to explore rates, I'm just a click away: {{link}} — I can usually get you pre-approved in under 24 hours. 😊",
          },
        ],
      },
      {
        name: "Day 2 Rate Alert",
        delayAmount: 2,
        delayUnit: "days",
        body: "Hey {{firstName}}, rates shifted again today — wanted to make sure you're getting the best deal possible. A 10-min call could save you thousands over the life of your loan. Interested? Reply YES!",
      },
      {
        name: "Day 5 Pre-Approval Push",
        delayAmount: 5,
        delayUnit: "days",
        body: "Hi {{firstName}}, getting pre-approved is free and takes less than 24 hours — and it gives you a huge advantage when making an offer. Ready to get started? Here's my calendar: {{link}} 🏠",
      },
    ],
  },

  // ── 5. Auto Sales ─────────────────────────────────────────────────────────
  {
    name: "🚗 Auto Sales — Test Drive Follow-up",
    triggerCategory: "Interested",
    steps: [
      {
        name: "Test Drive Thank You",
        delayAmount: 5,
        delayUnit: "minutes",
        body: "Hi {{firstName}}, thanks so much for coming in today! It was great meeting you. How are you feeling about the vehicle? Any questions I can answer for you? 🚗",
        branches: [
          {
            branchType: "positive",
            name: "Move to Close",
            delayAmount: 5,
            delayUnit: "minutes",
            body: "That's awesome to hear, {{firstName}}! I'd love to get you behind the wheel permanently. Let's find a time to go over the numbers — here's my calendar: {{link}} — I can have everything ready for you! 🎉",
          },
          {
            branchType: "negative",
            name: "Address Concerns",
            delayAmount: 5,
            delayUnit: "minutes",
            body: "I appreciate your honesty, {{firstName}}! I want to make sure we find the perfect fit for you. Can I ask what's holding you back? I might have options you haven't seen yet — happy to chat: {{link}} 😊",
          },
        ],
      },
      {
        name: "Day 1 Incentive",
        delayAmount: 1,
        delayUnit: "days",
        body: "Hey {{firstName}}, just wanted to let you know — we have some great financing options available right now that could make this even more affordable. Want me to run the numbers for you? Reply YES!",
      },
      {
        name: "Day 3 Urgency",
        delayAmount: 3,
        delayUnit: "days",
        body: "Hi {{firstName}}, the vehicle you looked at is getting a lot of attention — I'd hate for you to miss out! Can we find a time to chat today? Here's my calendar: {{link}} — let's make it happen! 🚗",
      },
      {
        name: "Day 7 Final",
        delayAmount: 7,
        delayUnit: "days",
        body: "Hey {{firstName}}, last message from me — I don't want to be pushy! If you're still in the market or have any questions, I'm here. My calendar is always open: {{link}} — hope to see you soon! 😊",
      },
    ],
  },
];

// ─── Apply to all orgs ─────────────────────────────────────────────────────────

const [orgs] = await conn.execute("SELECT id FROM organizations");
console.log(`Found ${orgs.length} org(s)`);

for (const org of orgs) {
  const orgId = org.id;
  console.log(`\nSeeding org ${orgId}...`);

  // Clear existing drip sequences for this org
  const [existingSeqs] = await conn.execute(
    "SELECT id FROM drip_sequences WHERE orgId = ?",
    [orgId]
  );
  for (const seq of existingSeqs) {
    await conn.execute("DELETE FROM drip_steps WHERE sequenceId = ?", [seq.id]);
  }
  await conn.execute("DELETE FROM drip_sequences WHERE orgId = ?", [orgId]);
  console.log(`  Cleared ${existingSeqs.length} existing sequences`);

  for (const campaign of CAMPAIGNS) {
    // Insert sequence
    const [seqResult] = await conn.execute(
      "INSERT INTO drip_sequences (orgId, name, triggerCategory, isActive, createdAt, updatedAt) VALUES (?, ?, ?, 1, NOW(), NOW())",
      [orgId, campaign.name, campaign.triggerCategory]
    );
    const seqId = seqResult.insertId;
    console.log(`  Created sequence: ${campaign.name} (id=${seqId})`);

    for (let i = 0; i < campaign.steps.length; i++) {
      const step = campaign.steps[i];
      const [stepResult] = await conn.execute(
        "INSERT INTO drip_steps (sequenceId, stepNumber, name, delayAmount, delayUnit, body, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())",
        [seqId, i + 1, step.name, step.delayAmount, step.delayUnit, step.body]
      );
      const stepId = stepResult.insertId;
      console.log(`    Step ${i + 1}: ${step.name} (id=${stepId})`);

      // Insert branch steps if defined
      if (step.branches) {
        for (const branch of step.branches) {
          const [branchResult] = await conn.execute(
            "INSERT INTO drip_steps (sequenceId, stepNumber, name, delayAmount, delayUnit, body, branchType, parentStepId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())",
            [seqId, i + 1, branch.name, branch.delayAmount, branch.delayUnit, branch.body, branch.branchType, stepId]
          );
          console.log(`      Branch (${branch.branchType}): ${branch.name} (id=${branchResult.insertId})`);
        }
      }
    }
  }
}

await conn.end();
console.log("\n✅ All 5 industry campaigns seeded successfully!");
