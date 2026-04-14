import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { jwtVerify } from "jose";
import { parse as parseCookieHeader } from "cookie";
import { COOKIE_NAME } from "@shared/const";
import { ENV } from "./env";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

/** Try to authenticate via custom JWT (phone/email login) */
async function tryCustomJwtAuth(req: CreateExpressContextOptions["req"]): Promise<User | null> {
  try {
    const cookies = parseCookieHeader(req.headers.cookie ?? "");
    const token = cookies[COOKIE_NAME];
    if (!token) return null;

    const secret = new TextEncoder().encode(ENV.jwtSecret);
    const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });

    // Custom JWT has userId (number), Manus JWT has openId (string)
    const userId = (payload as any).userId;
    if (typeof userId !== "number") return null;

    const db = await getDb();
    if (!db) return null;

    const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  // Try custom JWT first (phone/email auth), then fall back to Manus OAuth
  user = await tryCustomJwtAuth(opts.req);

  if (!user) {
    try {
      user = await sdk.authenticateRequest(opts.req);
    } catch {
      user = null;
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
