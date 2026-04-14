import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
  // Manus OAuth login has been disabled. The callback route is kept to avoid
  // broken links but redirects to the standard auth page instead of processing.
  app.get("/api/oauth/callback", (_req: Request, res: Response) => {
    res.redirect(302, "/auth");
  });
}
