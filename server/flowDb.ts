import { and, eq } from "drizzle-orm";
import {
  FlowRule,
  FlowTemplate,
  InsertFlowRule,
  InsertFlowTemplate,
  InsertMessageClassification,
  REPLY_CATEGORIES,
  ReplyCategory,
  TemplateFolder,
  InsertTemplateFolder,
  flowRules,
  flowTemplates,
  messageClassifications,
  templateFolders,
} from "../drizzle/schema";
import { getDb } from "./db";

// ─── Default template bodies per category (multiple per category) ─────────────

const DEFAULT_TEMPLATES: Record<ReplyCategory, Array<{ name: string; body: string; isPrimary?: boolean }>> = {
  Interested: [
    {
      name: "Interested — Schedule a Call",
      isPrimary: true,
      body: `Hi {{firstName}}, awesome — so glad to hear that! 🎉

Let's get something on the calendar. You can grab a time that works best for you right here: {{link}}

Looking forward to connecting with you soon!`,
    },
    {
      name: "Interested — Send Quote Now",
      body: `Hi {{firstName}}, great news — I'll put together a custom quote for {{company}} right away.

Give me a few minutes and I'll have it over to you. In the meantime, feel free to check out what others are saying: {{link}}

Talk soon!`,
    },
    {
      name: "Interested — Warm Follow-Up",
      body: `Hi {{firstName}}, that's fantastic! I'd love to show you exactly how we can help {{company}}.

Can we hop on a quick 15-minute call this week? Just pick a time here: {{link}}

No pressure — just a friendly chat!`,
    },
  ],
  "Not Interested": [
    {
      name: "Not Interested — Graceful Exit",
      isPrimary: true,
      body: `Hi {{firstName}}, totally understood — no pressure at all!

If your situation changes or you'd ever like to revisit, don't hesitate to reach out. Wishing you all the best!`,
    },
    {
      name: "Not Interested — Leave the Door Open",
      body: `Hi {{firstName}}, no worries at all — I completely understand timing isn't always right.

I'll check back in a few months in case things change. In the meantime, feel free to reach out anytime. Take care!`,
    },
    {
      name: "Not Interested — Ask for Referral",
      body: `Hi {{firstName}}, thanks for letting me know — I really appreciate your honesty!

If you ever know someone who might benefit from what we offer, I'd love an introduction. Have a great day!`,
    },
  ],
  "Wants More Info": [
    {
      name: "Wants More Info — Send Details",
      isPrimary: true,
      body: `Hi {{firstName}}, happy to share more!

Here's a quick overview of what we offer and how it could benefit {{company}}. Would a short call work to go over the details? You can book a time here: {{link}}

Let me know what questions you have!`,
    },
    {
      name: "Wants More Info — Video Overview",
      body: `Hi {{firstName}}, great question — I put together a short 2-minute overview that explains everything clearly.

Check it out here: {{link}}

After watching, let me know if you'd like to chat — happy to answer any questions!`,
    },
    {
      name: "Wants More Info — Case Study",
      body: `Hi {{firstName}}, I'd love to share how we helped a company similar to {{company}} recently.

Here's a quick case study: {{link}}

Would love to show you how we could do the same for you. Want to set up a quick call?`,
    },
  ],
  Unsubscribe: [
    {
      name: "Unsubscribe — Opt-Out Confirmation",
      isPrimary: true,
      body: `You've been removed from our list and will receive no further messages. Reply START anytime if you'd like to reconnect. Take care!`,
    },
    {
      name: "Unsubscribe — Soft Opt-Out",
      body: `Got it — I've removed you from our outreach list. No more messages from us!

If you ever change your mind, just reply START and we'll be happy to reconnect. Wishing you all the best!`,
    },
  ],
};

// Categories that should have auto-send ON by default
const AUTO_SEND_DEFAULTS: Partial<Record<ReplyCategory, boolean>> = {
  Interested: true,
  "Not Interested": true,
  Unsubscribe: true,
};

// ─── Flow Templates ───────────────────────────────────────────────────────────

export async function listFlowTemplates(orgId: number, category?: ReplyCategory): Promise<FlowTemplate[]> {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(flowTemplates.orgId, orgId)];
  if (category) conditions.push(eq(flowTemplates.category, category));
  return db.select().from(flowTemplates).where(and(...conditions));
}

export async function getFlowTemplateById(id: number): Promise<FlowTemplate | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(flowTemplates).where(eq(flowTemplates.id, id)).limit(1);
  return result[0];
}

export async function createFlowTemplate(data: InsertFlowTemplate): Promise<FlowTemplate | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(flowTemplates).values(data);
  const insertId = (result as unknown as [{ insertId: number }])[0]?.insertId;
  return getFlowTemplateById(insertId);
}

export async function updateFlowTemplate(
  id: number,
  data: Partial<InsertFlowTemplate>
): Promise<FlowTemplate | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(flowTemplates).set(data).where(eq(flowTemplates.id, id));
  return getFlowTemplateById(id);
}

export async function deleteFlowTemplate(id: number): Promise<{ success: boolean }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(flowRules).set({ templateId: null }).where(eq(flowRules.templateId, id));
  await db.delete(flowTemplates).where(eq(flowTemplates.id, id));
  return { success: true };
}

// ─── Flow Rules ───────────────────────────────────────────────────────────────

export async function listFlowRules(orgId: number): Promise<FlowRule[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(flowRules).where(eq(flowRules.orgId, orgId));
}

export async function getFlowRuleByCategory(orgId: number, category: ReplyCategory): Promise<FlowRule | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(flowRules)
    .where(and(eq(flowRules.orgId, orgId), eq(flowRules.category, category)))
    .limit(1);
  return result[0];
}

export async function upsertFlowRule(orgId: number, data: {
  category: ReplyCategory;
  templateId?: number | null;
  autoSend?: boolean;
}): Promise<FlowRule | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await getFlowRuleByCategory(orgId, data.category);
  const values: InsertFlowRule = {
    orgId,
    category: data.category,
    templateId: data.templateId ?? null,
    autoSend: data.autoSend ? 1 : 0,
  };

  if (existing) {
    await db
      .update(flowRules)
      .set(values)
      .where(and(eq(flowRules.orgId, orgId), eq(flowRules.category, data.category)));
  } else {
    await db.insert(flowRules).values(values);
  }
  return getFlowRuleByCategory(orgId, data.category);
}

/** Ensure all categories have a default flow rule row for the given org */
export async function seedFlowRules(orgId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  for (const category of REPLY_CATEGORIES) {
    const existing = await getFlowRuleByCategory(orgId, category);
    if (!existing) {
      const autoSend = AUTO_SEND_DEFAULTS[category] ? 1 : 0;
      await db.insert(flowRules).values({ orgId, category, templateId: null, autoSend });
    }
  }
}

/** Seed multiple default templates per category and assign the primary one to the flow rule */
export async function seedDefaultTemplates(orgId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  for (const category of REPLY_CATEGORIES) {
    const existing = await listFlowTemplates(orgId, category);
    if (existing.length === 0) {
      const templates = DEFAULT_TEMPLATES[category];
      let primaryId: number | undefined;

      for (const tpl of templates) {
        const inserted = await createFlowTemplate({ orgId, name: tpl.name, category, body: tpl.body, isActive: 1 });
        if (inserted && tpl.isPrimary) {
          primaryId = inserted.id;
        }
      }

      // Assign the primary template to the flow rule
      if (primaryId !== undefined) {
        const autoSend = AUTO_SEND_DEFAULTS[category] ?? false;
        await upsertFlowRule(orgId, { category, templateId: primaryId, autoSend });
      }
    }
  }
}

/** Reconcile existing flow rules and templates to match current defaults (idempotent) */
export async function reconcileFlowDefaults(orgId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  for (const [category, shouldAutoSend] of Object.entries(AUTO_SEND_DEFAULTS)) {
    if (!shouldAutoSend) continue;
    const rule = await getFlowRuleByCategory(orgId, category as ReplyCategory);
    if (rule && rule.autoSend !== 1 && rule.templateId) {
      await db
        .update(flowRules)
        .set({ autoSend: 1 })
        .where(and(eq(flowRules.orgId, orgId), eq(flowRules.category, category as ReplyCategory)));
    }
  }
}

// Export for testing purposes
export { DEFAULT_TEMPLATES as DEFAULT_TEMPLATE_BODIES, AUTO_SEND_DEFAULTS };

// ─── Message Classifications ──────────────────────────────────────────────────

export async function createMessageClassification(data: InsertMessageClassification) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(messageClassifications).values(data);
}

export async function getClassificationByMessageId(messageId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(messageClassifications)
    .where(eq(messageClassifications.messageId, messageId))
    .limit(1);
  return result[0];
}

// ─── Template Folders ─────────────────────────────────────────────────────────

export async function listTemplateFolders(orgId: number): Promise<TemplateFolder[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(templateFolders).where(eq(templateFolders.orgId, orgId));
}

export async function getFolderById(id: number): Promise<TemplateFolder | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(templateFolders).where(eq(templateFolders.id, id)).limit(1);
  return result[0];
}

export async function createTemplateFolder(data: InsertTemplateFolder): Promise<TemplateFolder | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(templateFolders).values(data);
  const insertId = (result as unknown as [{ insertId: number }])[0]?.insertId;
  return getFolderById(insertId);
}

export async function updateTemplateFolder(id: number, data: Partial<InsertTemplateFolder>): Promise<TemplateFolder | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(templateFolders).set(data).where(eq(templateFolders.id, id));
  return getFolderById(id);
}

export async function deleteTemplateFolder(id: number): Promise<{ success: boolean }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Unassign templates from this folder
  await db.update(flowTemplates).set({ folderId: null }).where(eq(flowTemplates.folderId, id));
  await db.delete(templateFolders).where(eq(templateFolders.id, id));
  return { success: true };
}

// ─── Sample Folder Seed Data ──────────────────────────────────────────────────

const SAMPLE_FOLDERS: Array<{
  name: string;
  icon: string;
  color: string;
  sortOrder: number;
  templates: Array<{ name: string; category: typeof REPLY_CATEGORIES[number]; body: string }>;
}> = [
  {
    name: "🔥 Hot Leads",
    icon: "Flame",
    color: "red",
    sortOrder: 0,
    templates: [
      {
        name: "Hot Lead — Book Now",
        category: "Interested",
        body: `Hi {{firstName}}! You're on my radar as a top priority 🔥

I have a limited opening this week and I'd love to lock it in for you. Grab your spot here: https://calendly.com/yourname

Let's make something happen — you won't regret it!`,
      },
      {
        name: "Hot Lead — Exclusive Offer",
        category: "Interested",
        body: `Hey {{firstName}}, I have something special just for you 🎁

As one of our most engaged prospects, I want to offer you an exclusive deal that's not available publicly. Check it out here: https://yoursite.com/exclusive

This expires Friday — let me know if you want to claim it!`,
      },
      {
        name: "Hot Lead — Fast-Track Quote",
        category: "Wants More Info",
        body: `Hi {{firstName}}, I can see you're serious about moving forward — so am I!

I'm putting together a fast-track custom quote for {{company}} right now. You can also see our full pricing breakdown here: https://yoursite.com/pricing

I'll have it to you within the hour. Sound good?`,
      },
    ],
  },
  {
    name: "📅 Follow-Ups",
    icon: "CalendarClock",
    color: "blue",
    sortOrder: 1,
    templates: [
      {
        name: "Follow-Up — Day 3 Check-In",
        category: "Interested",
        body: `Hi {{firstName}}, just circling back from our last chat!

I wanted to make sure my message didn't get buried. Still happy to walk you through everything — you can book a quick call here: https://calendly.com/yourname

No pressure, just want to make sure you have what you need 😊`,
      },
      {
        name: "Follow-Up — Week 2 Nudge",
        category: "Interested",
        body: `Hey {{firstName}}, hope your week is going well!

I'm still here if you'd like to revisit the conversation about {{company}}. A lot of our clients see results within the first 30 days — here's a quick overview: https://yoursite.com/results

Would love to help you get there too. Want to reconnect?`,
      },
      {
        name: "Follow-Up — Final Touch",
        category: "Interested",
        body: `Hi {{firstName}}, I don't want to be a bother — this is my last follow-up!

If the timing isn't right, totally understood. But if you're still curious, here's everything in one place: https://yoursite.com/overview

Either way, wishing you and {{company}} all the best 🙌`,
      },
      {
        name: "Follow-Up — Wants More Info",
        category: "Wants More Info",
        body: `Hi {{firstName}}, I wanted to follow up on the info I sent over!

Did you get a chance to look through it? Here's the link again in case it got lost: https://yoursite.com/details

Happy to answer any questions — just reply here or book a call: https://calendly.com/yourname`,
      },
    ],
  },
  {
    name: "💡 Nurture Sequences",
    icon: "Lightbulb",
    color: "amber",
    sortOrder: 2,
    templates: [
      {
        name: "Nurture — Value Drop",
        category: "Wants More Info",
        body: `Hi {{firstName}}, I wanted to share something I think you'll find useful 💡

We just published a guide on the top 5 mistakes businesses like {{company}} make — and how to avoid them: https://yoursite.com/guide

No strings attached — just thought it might be helpful. Let me know what you think!`,
      },
      {
        name: "Nurture — Success Story",
        category: "Wants More Info",
        body: `Hey {{firstName}}, quick story I thought you'd appreciate!

A company similar to {{company}} came to us with the same challenge you mentioned. Here's what happened: https://yoursite.com/case-study

Would love to show you how we could replicate those results for you. Interested in a quick chat?`,
      },
      {
        name: "Nurture — Industry Insight",
        category: "Wants More Info",
        body: `Hi {{firstName}}, just saw this and immediately thought of you 📊

The industry is shifting fast — here's a quick breakdown of what's changing and what it means for {{company}}: https://yoursite.com/insights

Happy to walk you through the implications. Want to jump on a call this week?`,
      },
    ],
  },
  {
    name: "🤝 Re-Engagement",
    icon: "Handshake",
    color: "green",
    sortOrder: 3,
    templates: [
      {
        name: "Re-Engage — Been a While",
        category: "Interested",
        body: `Hi {{firstName}}, it's been a little while — I hope things are going well at {{company}}!

I wanted to reach back out because we've made some exciting updates since we last spoke. Here's what's new: https://yoursite.com/updates

Would love to reconnect and see if the timing is better now. Interested in a quick chat?`,
      },
      {
        name: "Re-Engage — New Offer",
        category: "Interested",
        body: `Hey {{firstName}}, long time no talk! 👋

We just launched something new that I think would be a great fit for {{company}}. Here's the quick overview: https://yoursite.com/new

No pressure — just thought of you right away when we launched it. Worth a 10-minute call?`,
      },
      {
        name: "Re-Engage — Check-In",
        category: "Not Interested",
        body: `Hi {{firstName}}, I know it's been a while since we last connected!

I just wanted to check in and see how things are going at {{company}}. No agenda — just a friendly hello 😊

If you ever want to reconnect, I'm always here: https://calendly.com/yourname`,
      },
    ],
  },
  {
    name: "🚫 Objection Handlers",
    icon: "ShieldCheck",
    color: "purple",
    sortOrder: 4,
    templates: [
      {
        name: "Objection — Too Expensive",
        category: "Not Interested",
        body: `Hi {{firstName}}, I completely understand — budget is always a factor!

I'd love to show you how our ROI typically pays for itself within 60 days. Here's a quick breakdown: https://yoursite.com/roi

Would it be worth a 15-minute call to see if the numbers make sense for {{company}}?`,
      },
      {
        name: "Objection — Bad Timing",
        category: "Not Interested",
        body: `Hi {{firstName}}, totally get it — timing is everything!

I'll make a note to follow up in a couple of months. In the meantime, here's a resource that might be useful when the time comes: https://yoursite.com/resources

No pressure at all — just want to be here when you're ready 🙂`,
      },
      {
        name: "Objection — Already Have a Solution",
        category: "Not Interested",
        body: `Hi {{firstName}}, that's great — glad you have something in place!

I'd just love to show you a quick side-by-side comparison to make sure you're getting the best deal. Here's a 2-minute overview: https://yoursite.com/compare

If we're not a better fit, no hard feelings at all. Worth a quick look?`,
      },
    ],
  },
  {
    name: "📋 Unsubscribe & Opt-Out",
    icon: "BellOff",
    color: "gray",
    sortOrder: 5,
    templates: [
      {
        name: "Opt-Out — Confirmed",
        category: "Unsubscribe",
        body: `You've been removed from our list and won't receive any further messages from us.

If you ever change your mind, you can always reconnect here: https://yoursite.com/contact

Wishing you all the best! 👋`,
      },
      {
        name: "Opt-Out — Soft Goodbye",
        category: "Unsubscribe",
        body: `Got it — I've removed you from our outreach list. No more messages!

It was great connecting with you, {{firstName}}. If you ever want to revisit, just reply START or visit: https://yoursite.com

Take care and best of luck with {{company}}!`,
      },
    ],
  },
];

/** Seed sample folders and templates for a new org (idempotent) */
export async function seedTemplateFolders(orgId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const existing = await listTemplateFolders(orgId);
  if (existing.length > 0) return; // Already seeded

  for (const folderDef of SAMPLE_FOLDERS) {
    const folder = await createTemplateFolder({
      orgId,
      name: folderDef.name,
      icon: folderDef.icon,
      color: folderDef.color,
      sortOrder: folderDef.sortOrder,
    });
    if (!folder) continue;

    for (const tpl of folderDef.templates) {
      await createFlowTemplate({
        orgId,
        name: tpl.name,
        category: tpl.category,
        body: tpl.body,
        isActive: 1,
        folderId: folder.id,
      });
    }
  }
}
