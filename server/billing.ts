import Stripe from "stripe";
import { getOrganizationById, updateOrganization } from "./orgDb";
import { PLANS, PlanId } from "./products";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2026-03-25.dahlia",
});

// ─── Create Checkout Session ──────────────────────────────────────────────────

export async function createCheckoutSession(opts: {
  orgId: number;
  planId: PlanId;
  userEmail?: string | null;
  userName?: string | null;
  userId: number;
  origin: string;
}): Promise<string> {
  const plan = PLANS[opts.planId];

  // Get or create Stripe customer
  const org = await getOrganizationById(opts.orgId);
  let customerId = org?.stripeCustomerId ?? undefined;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: opts.userEmail ?? undefined,
      name: opts.userName ?? undefined,
      metadata: { orgId: String(opts.orgId), userId: String(opts.userId) },
    });
    customerId = customer.id;
    await updateOrganization(opts.orgId, { stripeCustomerId: customerId });
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    allow_promotion_codes: true,
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `QuotePush.io ${plan.name} Plan`,
            description: plan.description,
          },
          unit_amount: plan.price,
          recurring: { interval: plan.interval },
        },
        quantity: 1,
      },
    ],
    client_reference_id: String(opts.userId),
    metadata: {
      orgId: String(opts.orgId),
      planId: opts.planId,
      user_id: String(opts.userId),
      customer_email: opts.userEmail ?? "",
      customer_name: opts.userName ?? "",
    },
    success_url: `${opts.origin}/billing?success=1&plan=${opts.planId}`,
    cancel_url: `${opts.origin}/billing?canceled=1`,
  });

  return session.url ?? "";
}

// ─── Create Customer Portal Session ──────────────────────────────────────────

export async function createPortalSession(opts: {
  orgId: number;
  origin: string;
}): Promise<string> {
  const org = await getOrganizationById(opts.orgId);
  if (!org?.stripeCustomerId) throw new Error("No Stripe customer found for this organization");

  const session = await stripe.billingPortal.sessions.create({
    customer: org.stripeCustomerId,
    return_url: `${opts.origin}/billing`,
  });

  return session.url;
}

// ─── Handle Stripe Webhook Event ─────────────────────────────────────────────

export async function handleStripeWebhook(payload: Buffer, sig: string): Promise<void> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "";
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, sig, webhookSecret);
  } catch (err) {
    throw new Error(`Webhook signature verification failed: ${err}`);
  }

  // Test event passthrough
  if (event.id.startsWith("evt_test_")) {
    console.log("[Stripe Webhook] Test event detected");
    return;
  }

  console.log(`[Stripe Webhook] ${event.type} - ${event.id}`);

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const orgId = session.metadata?.orgId ? parseInt(session.metadata.orgId) : null;
      const planId = session.metadata?.planId as PlanId | undefined;
      const subId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
      if (orgId && planId && subId) {
        await updateOrganization(orgId, {
          plan: planId,
          stripeSubscriptionId: subId,
          subscriptionStatus: "active",
        });
        console.log(`[Stripe] Org ${orgId} upgraded to ${planId}`);
      }
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const orgRows = await findOrgByCustomerId(sub.customer as string);
      if (orgRows) {
        const status = sub.status as import("../drizzle/schema").SubscriptionStatus;
        const planId = (sub.metadata?.planId as PlanId) ?? orgRows.plan;
        await updateOrganization(orgRows.id, {
          plan: planId,
          stripeSubscriptionId: sub.id,
          subscriptionStatus: status,
        });
      }
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const orgRows = await findOrgByCustomerId(sub.customer as string);
      if (orgRows) {
        await updateOrganization(orgRows.id, {
          subscriptionStatus: "canceled",
        });
      }
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const orgRows = await findOrgByCustomerId(invoice.customer as string);
      if (orgRows) {
        await updateOrganization(orgRows.id, { subscriptionStatus: "past_due" });
      }
      break;
    }

    default:
      console.log(`[Stripe Webhook] Unhandled event: ${event.type}`);
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function findOrgByCustomerId(customerId: string) {
  const { getDb } = await import("./db");
  const { organizations } = await import("../drizzle/schema");
  const { eq } = await import("drizzle-orm");
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(organizations).where(eq(organizations.stripeCustomerId, customerId)).limit(1);
  return rows[0];
}

export { stripe };
