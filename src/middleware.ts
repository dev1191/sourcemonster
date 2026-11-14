import { defineMiddleware } from "astro:middleware";
import { getSessionCookie, clearSessionCookie } from "./lib/auth/cookies";
import { validateAdminSession } from "./lib/auth/session";
import { logger } from "./lib/logger";

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  try {
    const token = getSessionCookie(context.cookies);

    let adminUser = undefined;
    if (token) {
      const authResult = await validateAdminSession(token);
      if (authResult) {
        adminUser = authResult.user;
        context.locals.adminUser = adminUser;
      } else {
        // Token is invalid or expired, clear the cookie
        clearSessionCookie(context.cookies);
      }
    }

    // Handle protected admin routes
    const isAdminRoute = pathname.startsWith("/admin");
    const isAdminApiRoute = pathname.startsWith("/api/admin");
    const isLoginRoute = pathname === "/admin/login";
    const isLogoutRoute = pathname === "/admin/logout";

    if (isLoginRoute) {
      // If already logged in, redirect away from login page to dashboard
      if (adminUser) {
        return context.redirect("/admin");
      }
      return next();
    }

    if (isLogoutRoute) {
      return next();
    }

    if (isAdminRoute && !adminUser) {
      return context.redirect(`/admin/login?redirect=${encodeURIComponent(pathname)}`);
    }

    if (isAdminApiRoute && !adminUser) {
      return new Response(JSON.stringify({ error: "Unauthorized access" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    return await next();
  } catch (error) {
    logger.error(`[Server Error] Unhandled exception on ${context.request.method} ${pathname}`, error, {
      url: context.url.href,
      clientAddress: context.clientAddress,
    });
    throw error;
  }
});

