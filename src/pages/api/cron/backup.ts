import type { APIRoute } from "astro";
import { generateSqlBackup, sendBackupToEmail } from "../../../services/backup.service";
import { getSiteSettings } from "../../../lib/settings";

export const prerender = false;

async function checkAuth(request: Request, url: URL): Promise<boolean> {
  const settings = await getSiteSettings();
  const configuredSecret =
    process.env.CRON_SECRET ||
    settings.backup_cron_secret ||
    "sm_cron_backup_secret_key";

  // Check Bearer token in headers
  const authHeader = request.headers.get("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7).trim();
    if (token === configuredSecret) return true;
  }

  // Check custom header
  const customHeader = request.headers.get("x-cron-secret");
  if (customHeader && customHeader.trim() === configuredSecret) {
    return true;
  }

  // Check URL query param: ?secret=...
  const querySecret = url.searchParams.get("secret");
  if (querySecret && querySecret.trim() === configuredSecret) {
    return true;
  }

  return false;
}

export const GET: APIRoute = async ({ request, url }) => {
  const isAuthorized = await checkAuth(request, url);
  if (!isAuthorized) {
    return new Response(JSON.stringify({ error: "Unauthorized: Invalid or missing cron secret." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const backup = await generateSqlBackup();

    // Check if the caller requested a direct file download
    const isDownload = url.searchParams.get("download") === "true";
    if (isDownload) {
      return new Response(backup.sqlContent, {
        status: 200,
        headers: {
          "Content-Type": "application/sql; charset=utf-8",
          "Content-Disposition": `attachment; filename="${backup.filename}"`,
        },
      });
    }

    // Otherwise, dispatch email and respond with JSON status
    const emailRes = await sendBackupToEmail(backup);

    return new Response(
      JSON.stringify({
        success: emailRes.success,
        message: emailRes.success
          ? "Database backup generated and emailed successfully."
          : `Backup generated but email dispatch failed: ${emailRes.error}`,
        filename: backup.filename,
        tableCount: backup.tables.length,
        totalRows: backup.totalRows,
        sizeBytes: backup.sizeBytes,
        sentTo: emailRes.sentTo,
        timestamp: backup.timestamp,
        error: emailRes.error,
      }),
      {
        status: emailRes.success ? 200 : 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    console.error("❌ Cron backup execution failed:", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err?.message || "Internal server error during backup execution.",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

export const POST: APIRoute = async (context) => {
  return GET(context);
};
