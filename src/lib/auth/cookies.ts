import type { AstroCookies } from "astro";

export const ADMIN_SESSION_COOKIE_NAME = "sm_admin_session";

export function setSessionCookie(
  cookies: AstroCookies,
  token: string,
  expiresAt: Date
): void {
  cookies.set(ADMIN_SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export function getSessionCookie(cookies: AstroCookies): string | undefined {
  return cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value;
}

export function clearSessionCookie(cookies: AstroCookies): void {
  cookies.delete(ADMIN_SESSION_COOKIE_NAME, {
    path: "/",
  });
}

