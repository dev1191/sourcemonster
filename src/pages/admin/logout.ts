import type { APIRoute } from "astro";
import { getSessionCookie, clearSessionCookie } from "../../lib/auth/cookies";
import { revokeAdminSession } from "../../lib/auth/session";

export const POST: APIRoute = async ({ cookies, redirect }) => {
  const token = getSessionCookie(cookies);
  if (token) {
    await revokeAdminSession(token);
  }
  clearSessionCookie(cookies);
  return redirect("/admin/login");
};

export const GET: APIRoute = async ({ cookies, redirect }) => {
  const token = getSessionCookie(cookies);
  if (token) {
    await revokeAdminSession(token);
  }
  clearSessionCookie(cookies);
  return redirect("/admin/login");
};

