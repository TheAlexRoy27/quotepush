import { and, eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { getDb } from "./db";
import {
  emailCredentials,
  InsertEmailCredential,
  InsertOrgMember,
  InsertOrganization,
  InsertPhoneOtp,
  InsertUser,
  leads as leadsTable,
  OrgMember,
  OrgRole,
  Organization,
  orgMembers,
  organizations,
  orgTwilioConfigs,
  phoneOtp,
  PlanType,
  users,
  User,
} from "../drizzle/schema";

// ─── Users ────────────────────────────────────────────────────────────────────

export async function findUserByPhone(phone: string): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
  return rows[0];
}

export async function findUserByEmail(email: string): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const creds = await db
    .select()
    .from(emailCredentials)
    .where(eq(emailCredentials.email, email.toLowerCase()))
    .limit(1);
  if (!creds[0]) return undefined;
  const userRows = await db.select().from(users).where(eq(users.id, creds[0].userId)).limit(1);
  return userRows[0];
}

export async function findUserById(id: number): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0];
}

export async function createUserWithPhone(phone: string, name?: string): Promise<User> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const openId = `phone_${phone}_${nanoid(8)}`;
  await db.insert(users).values({
    openId,
    phone,
    name: name ?? null,
    loginMethod: "phone_otp",
    lastSignedIn: new Date(),
    consentAcceptedAt: new Date(),
  });
  const rows = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  if (!rows[0]) throw new Error("Failed to create user");
  return rows[0];
}

export async function createUserWithEmail(
  email: string,
  password: string,
  name?: string
): Promise<User> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const openId = `email_${email}_${nanoid(8)}`;
  await db.insert(users).values({
    openId,
    email: email.toLowerCase(),
    name: name ?? null,
    loginMethod: "email",
    lastSignedIn: new Date(),
    consentAcceptedAt: new Date(),
  });
  const rows = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  if (!rows[0]) throw new Error("Failed to create user");
  const passwordHash = await bcrypt.hash(password, 10);
  await db.insert(emailCredentials).values({
    userId: rows[0].id,
    email: email.toLowerCase(),
    passwordHash,
  });
  return rows[0];
}

export async function verifyEmailPassword(
  email: string,
  password: string
): Promise<User | null> {
  const db = await getDb();
  if (!db) return null;
  const creds = await db
    .select()
    .from(emailCredentials)
    .where(eq(emailCredentials.email, email.toLowerCase()))
    .limit(1);
  if (!creds[0]) return null;
  const valid = await bcrypt.compare(password, creds[0].passwordHash);
  if (!valid) return null;
  const userRows = await db.select().from(users).where(eq(users.id, creds[0].userId)).limit(1);
  return userRows[0] ?? null;
}

export async function updateUserLastSignedIn(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, userId));
}

// ─── Phone OTP ────────────────────────────────────────────────────────────────

export async function createOtp(phone: string): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Invalidate old OTPs for this phone
  await db.delete(phoneOtp).where(eq(phoneOtp.phone, phone));
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  await db.insert(phoneOtp).values({ phone, code, expiresAt });
  return code;
}

export async function verifyOtp(phone: string, code: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const rows = await db
    .select()
    .from(phoneOtp)
    .where(and(eq(phoneOtp.phone, phone), eq(phoneOtp.code, code), eq(phoneOtp.verified, 0)))
    .limit(1);
  if (!rows[0]) return false;
  if (new Date() > rows[0].expiresAt) return false;
  await db.update(phoneOtp).set({ verified: 1 }).where(eq(phoneOtp.id, rows[0].id));
  return true;
}

// ─── Organizations ────────────────────────────────────────────────────────────

export async function createOrganization(
  name: string,
  ownerId: number
): Promise<Organization> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64) + "-" + nanoid(6);
  await db.insert(organizations).values({ name, slug });
  const orgRows = await db
    .select()
    .from(organizations)
    .where(eq(organizations.slug, slug))
    .limit(1);
  if (!orgRows[0]) throw new Error("Failed to create organization");
  const org = orgRows[0];
  // Add owner as first member
  await db.insert(orgMembers).values({
    orgId: org.id,
    userId: ownerId,
    role: "owner",
    inviteAccepted: 1,
  });
  return org;
}

export async function getOrganizationById(id: number): Promise<Organization | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(organizations).where(eq(organizations.id, id)).limit(1);
  return rows[0];
}

export async function updateOrganization(
  id: number,
  data: Partial<Pick<Organization, "name" | "plan" | "stripeCustomerId" | "stripeSubscriptionId" | "subscriptionStatus">>
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(organizations).set(data).where(eq(organizations.id, id));
}

// ─── Org Members ──────────────────────────────────────────────────────────────

export async function getOrgMembership(
  userId: number
): Promise<(OrgMember & { org: Organization }) | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  // Get the first accepted membership for this user
  const rows = await db
    .select()
    .from(orgMembers)
    .where(and(eq(orgMembers.userId, userId), eq(orgMembers.inviteAccepted, 1)))
    .limit(1);
  if (!rows[0]) return undefined;
  const orgRows = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, rows[0].orgId))
    .limit(1);
  if (!orgRows[0]) return undefined;
  return { ...rows[0], org: orgRows[0] };
}

export async function listOrgMembers(orgId: number): Promise<(OrgMember & { user: User })[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      // org_members fields
      memberId: orgMembers.id,
      orgId: orgMembers.orgId,
      userId: orgMembers.userId,
      role: orgMembers.role,
      inviteToken: orgMembers.inviteToken,
      inviteAccepted: orgMembers.inviteAccepted,
      inviteEmail: orgMembers.inviteEmail,
      invitePhone: orgMembers.invitePhone,
      memberCreatedAt: orgMembers.createdAt,
      memberUpdatedAt: orgMembers.updatedAt,
      // user fields
      userName: users.name,
      userEmail: users.email,
      userPhone: users.phone,
      userRole: users.role,
      userCreatedAt: users.createdAt,
      userLastSignedIn: users.lastSignedIn,
      userLoginMethod: users.loginMethod,
    })
    .from(orgMembers)
    .innerJoin(users, eq(users.id, orgMembers.userId))
    .where(eq(orgMembers.orgId, orgId))
    .orderBy(orgMembers.createdAt);

  return rows.map((r) => ({
    id: r.memberId,
    orgId: r.orgId,
    userId: r.userId,
    role: r.role,
    inviteToken: r.inviteToken,
    inviteAccepted: r.inviteAccepted,
    inviteEmail: r.inviteEmail,
    invitePhone: r.invitePhone,
    createdAt: r.memberCreatedAt,
    updatedAt: r.memberUpdatedAt,
    user: {
      id: r.userId,
      name: r.userName,
      email: r.userEmail,
      phone: r.userPhone,
      role: r.userRole,
      createdAt: r.userCreatedAt,
      lastSignedIn: r.userLastSignedIn,
      loginMethod: r.userLoginMethod,
      openId: "",
    } as User,
  }));
}

export async function getOrgMemberCount(orgId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db
    .select()
    .from(orgMembers)
    .where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.inviteAccepted, 1)));
  return rows.length;
}

export async function createInvite(
  orgId: number,
  inviteEmail?: string,
  invitePhone?: string,
  role: OrgRole = "member"
): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const token = nanoid(32);
  // Create a placeholder userId = 0 (will be filled when invite is accepted)
  // We use a sentinel userId=0 for pending invites
  await db.insert(orgMembers).values({
    orgId,
    userId: 0,
    role,
    inviteToken: token,
    inviteEmail: inviteEmail ?? null,
    invitePhone: invitePhone ?? null,
    inviteAccepted: 0,
  });
  return token;
}

export async function acceptInvite(token: string, userId: number): Promise<OrgMember | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(orgMembers)
    .where(and(eq(orgMembers.inviteToken, token), eq(orgMembers.inviteAccepted, 0)))
    .limit(1);
  if (!rows[0]) return null;
  await db
    .update(orgMembers)
    .set({ userId, inviteAccepted: 1, inviteToken: null })
    .where(eq(orgMembers.id, rows[0].id));
  const updated = await db
    .select()
    .from(orgMembers)
    .where(eq(orgMembers.id, rows[0].id))
    .limit(1);
  return updated[0] ?? null;
}

export async function updateMemberRole(
  orgId: number,
  memberId: number,
  role: OrgRole
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(orgMembers)
    .set({ role })
    .where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.id, memberId)));
}

export async function removeMember(orgId: number, memberId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .delete(orgMembers)
    .where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.id, memberId)));
}

// ─── Org Twilio Config ────────────────────────────────────────────────────────

export async function getOrgTwilioConfig(orgId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(orgTwilioConfigs)
    .where(eq(orgTwilioConfigs.orgId, orgId))
    .limit(1);
  return rows[0];
}

export async function upsertOrgTwilioConfig(
  orgId: number,
  accountSid: string,
  authToken: string,
  phoneNumber: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .insert(orgTwilioConfigs)
    .values({ orgId, accountSid, authToken, phoneNumber })
    .onDuplicateKeyUpdate({ set: { accountSid, authToken, phoneNumber } });
}

// ─── Seat Enforcement ─────────────────────────────────────────────────────────

export async function canAddMember(orgId: number): Promise<boolean> {
  const org = await getOrganizationById(orgId);
  if (!org) return false;
  if (org.plan === "elite") return true; // unlimited seats
  // Base plan: check active subscription and seat count
  const count = await getOrgMemberCount(orgId);
  return count < 1; // Base includes 1 seat; additional seats require Elite
}

// ─── Super-Admin: List All Organizations ─────────────────────────────────────

export interface OrgSummary {
  id: number;
  name: string;
  slug: string;
  plan: string;
  subscriptionStatus: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  createdAt: Date;
  memberCount: number;
  leadCount: number;
  ownerName: string | null;
  ownerEmail: string | null;
  ownerPhone: string | null;
}

export async function listAllOrganizations(): Promise<OrgSummary[]> {
  const db = await getDb();
  if (!db) return [];

  const orgs = await db.select().from(organizations).orderBy(organizations.createdAt);

  const result: OrgSummary[] = [];
  for (const org of orgs) {
    // Count accepted members
    const members = await db
      .select()
      .from(orgMembers)
      .where(and(eq(orgMembers.orgId, org.id), eq(orgMembers.inviteAccepted, 1)));
    const memberCount = members.length;

    // Count leads
    const leadRows = await db
      .select()
      .from(leadsTable)
      .where(eq(leadsTable.orgId, org.id));
    const leadCount = leadRows.length;

    // Find owner
    const ownerMember = members.find((m) => m.role === "owner");
    let ownerName: string | null = null;
    let ownerEmail: string | null = null;
    let ownerPhone: string | null = null;

    if (ownerMember && ownerMember.userId > 0) {
      const ownerRows = await db
        .select()
        .from(users)
        .where(eq(users.id, ownerMember.userId))
        .limit(1);
      if (ownerRows[0]) {
        ownerName = ownerRows[0].name ?? null;
        ownerEmail = ownerRows[0].email ?? null;
        ownerPhone = ownerRows[0].phone ?? null;
      }
    }

    result.push({
      id: org.id,
      name: org.name,
      slug: org.slug,
      plan: org.plan,
      subscriptionStatus: org.subscriptionStatus ?? null,
      stripeCustomerId: org.stripeCustomerId ?? null,
      stripeSubscriptionId: org.stripeSubscriptionId ?? null,
      createdAt: org.createdAt,
      memberCount,
      leadCount,
      ownerName,
      ownerEmail,
      ownerPhone,
    });
  }

  return result;
}
