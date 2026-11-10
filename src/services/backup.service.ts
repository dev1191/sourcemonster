import { client, db } from "../lib/db/client";
import { siteSettings } from "../lib/db/schema";
import { getSiteSettings, updateSiteSettings } from "../lib/settings";
import { Resend } from "resend";

export interface BackupResult {
  filename: string;
  sqlContent: string;
  sizeBytes: number;
  tables: string[];
  totalRows: number;
  timestamp: string;
}

/**
 * Safely format a JavaScript value into a PostgreSQL SQL literal.
 */
function formatSqlValue(val: any): string {
  if (val === null || val === undefined) {
    return "NULL";
  }
  if (typeof val === "boolean") {
    return val ? "TRUE" : "FALSE";
  }
  if (typeof val === "number") {
    return Number.isFinite(val) ? String(val) : "NULL";
  }
  if (val instanceof Date) {
    return `'${val.toISOString()}'`;
  }
  if (typeof val === "object") {
    const jsonStr = JSON.stringify(val);
    return `'${jsonStr.replace(/'/g, "''")}'`;
  }
  // Standard string
  const str = String(val);
  return `'${str.replace(/'/g, "''")}'`;
}

/**
 * Generates a clean, standalone PostgreSQL SQL dump of all application tables.
 */
export async function generateSqlBackup(): Promise<BackupResult> {
  const timestampIso = new Date().toISOString();
  const dateFormatted = timestampIso.replace(/[:.]/g, "-").replace("T", "_").slice(0, 19);
  const filename = `sourcemonster_backup_${dateFormatted}.sql`;

  // Query all application user tables in the public schema
  const tablesResult = await client<{ table_name: string }[]>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name ASC;
  `;

  const tables = tablesResult.map((t) => t.table_name);
  let totalRows = 0;
  const sqlChunks: string[] = [];

  // SQL Header & Session Settings
  sqlChunks.push(
    `-- =====================================================================`,
    `-- SourceMonster Enterprise PostgreSQL Database Backup`,
    `-- Generated At: ${timestampIso}`,
    `-- Engine: SourceMonster Backup Service v1.0`,
    `-- Total Detected Tables: ${tables.length}`,
    `-- =====================================================================`,
    ``,
    `SET statement_timeout = 0;`,
    `SET lock_timeout = 0;`,
    `SET client_encoding = 'UTF8';`,
    `SET standard_conforming_strings = on;`,
    `SET check_function_bodies = false;`,
    `SET client_min_messages = warning;`,
    `SET row_security = off;`,
    ``
  );

  for (const tableName of tables) {
    try {
      // Query column metadata
      const columnsResult = await client<{ column_name: string; data_type: string }[]>`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = ${tableName}
        ORDER BY ordinal_position ASC;
      `;

      if (columnsResult.length === 0) continue;

      const columnNames = columnsResult.map((c) => c.column_name);
      const quotedCols = columnNames.map((c) => `"${c}"`).join(", ");

      // Query all table rows
      const rows = await client.unsafe(`SELECT * FROM "public"."${tableName}";`);
      const rowCount = rows.length;
      totalRows += rowCount;

      sqlChunks.push(
        `-- ---------------------------------------------------------------------`,
        `-- Data for Table: "public"."${tableName}" (${rowCount} rows)`,
        `-- ---------------------------------------------------------------------`
      );

      if (rowCount === 0) {
        sqlChunks.push(`-- (No records in table "${tableName}")\n`);
        continue;
      }

      // Generate INSERT batches
      for (const row of rows) {
        const valuesStr = columnNames.map((col) => formatSqlValue(row[col])).join(", ");
        sqlChunks.push(`INSERT INTO "public"."${tableName}" (${quotedCols}) VALUES (${valuesStr});`);
      }

      sqlChunks.push(``);
    } catch (tblErr) {
      console.error(`⚠️ Failed to dump table "${tableName}":`, tblErr);
      sqlChunks.push(`-- ⚠️ Warning: Failed to dump table "${tableName}" due to error: ${String(tblErr)}\n`);
    }
  }

  sqlChunks.push(
    `-- =====================================================================`,
    `-- End of Backup Dump: ${totalRows} total records dumped across ${tables.length} tables.`,
    `-- =====================================================================`
  );

  const sqlContent = sqlChunks.join("\n");
  const sizeBytes = Buffer.byteLength(sqlContent, "utf-8");

  return {
    filename,
    sqlContent,
    sizeBytes,
    tables,
    totalRows,
    timestamp: timestampIso,
  };
}

/**
 * Sends the generated SQL backup as an email attachment to the configured recipient.
 */
export async function sendBackupToEmail(
  backup: BackupResult,
  overrideEmail?: string | null
): Promise<{ success: boolean; emailId?: string; sentTo: string; error?: string }> {
  const settings = await getSiteSettings();
  const targetEmail =
    overrideEmail?.trim() ||
    settings.backup_email?.trim() ||
    settings.contact_email?.trim() ||
    process.env.CONTACT_EMAIL ||
    "contact@sourcemonster.in";

  const resendApiKey =
    process.env.RESEND_API_KEY ||
    (typeof import.meta !== "undefined" && import.meta.env?.RESEND_API_KEY);

  if (!resendApiKey) {
    const errorMsg = "Resend API key is not configured in environment variables (RESEND_API_KEY).";
    console.error("❌ Backup email dispatch failed:", errorMsg);
    return { success: false, sentTo: targetEmail, error: errorMsg };
  }

  const resend = new Resend(resendApiKey);

  const formattedSize =
    backup.sizeBytes > 1024 * 1024
      ? `${(backup.sizeBytes / (1024 * 1024)).toFixed(2)} MB`
      : `${(backup.sizeBytes / 1024).toFixed(1)} KB`;

  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #030712; color: #f8fafc; border-radius: 16px; border: 1px solid #1e293b; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 24px 30px; border-bottom: 1px solid #334155;">
        <h2 style="color: #FF4D1C; margin: 0 0 6px 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">SourceMonster Database Backup</h2>
        <p style="color: #94a3b8; margin: 0; font-size: 13px;">Scheduled SQL archive attached. Store safely.</p>
      </div>
      
      <div style="padding: 24px 30px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 24px;">
          <tr style="border-bottom: 1px solid #1e293b;">
            <td style="padding: 10px 0; color: #94a3b8;">Archive Filename:</td>
            <td style="padding: 10px 0; color: #f8fafc; font-family: monospace; font-weight: bold; text-align: right;">${backup.filename}</td>
          </tr>
          <tr style="border-bottom: 1px solid #1e293b;">
            <td style="padding: 10px 0; color: #94a3b8;">Backup Size:</td>
            <td style="padding: 10px 0; color: #f8fafc; font-family: monospace; text-align: right;">${formattedSize}</td>
          </tr>
          <tr style="border-bottom: 1px solid #1e293b;">
            <td style="padding: 10px 0; color: #94a3b8;">Tables Dumped:</td>
            <td style="padding: 10px 0; color: #f8fafc; font-family: monospace; text-align: right;">${backup.tables.length} tables</td>
          </tr>
          <tr style="border-bottom: 1px solid #1e293b;">
            <td style="padding: 10px 0; color: #94a3b8;">Total Records:</td>
            <td style="padding: 10px 0; color: #f8fafc; font-family: monospace; text-align: right;">${backup.totalRows} rows</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #94a3b8;">Generated At:</td>
            <td style="padding: 10px 0; color: #f8fafc; font-family: monospace; text-align: right;">${backup.timestamp}</td>
          </tr>
        </table>

        <div style="background: rgba(255, 77, 28, 0.08); border: 1px solid rgba(255, 77, 28, 0.25); border-radius: 12px; padding: 14px 18px; margin-bottom: 20px;">
          <p style="margin: 0; font-size: 12px; color: #ff8e6e; line-height: 1.5;">
            🔒 <strong>Disaster Recovery Ready:</strong> The attached .sql file contains complete transactional table data. To restore, run: <br/>
            <code style="background: rgba(0,0,0,0.4); padding: 2px 6px; border-radius: 4px; font-family: monospace; color: #fff;">psql -d YOUR_DATABASE &lt; ${backup.filename}</code>
          </p>
        </div>
      </div>

      <div style="background: #020617; padding: 14px 30px; text-align: center; border-top: 1px solid #1e293b; font-size: 11px; color: #64748b;">
        SourceMonster Automated Backup Service &bull; ${new Date().getFullYear()}
      </div>
    </div>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: "SourceMonster Backup <contact@sourcemonster.in>",
      to: [targetEmail],
      subject: `🛡️ Database Backup [SourceMonster] - ${backup.filename}`,
      html: htmlContent,
      attachments: [
        {
          filename: backup.filename,
          content: Buffer.from(backup.sqlContent, "utf-8"),
        },
      ],
    });

    if (error) {
      console.error("❌ Resend email dispatch failed:", error);
      return { success: false, sentTo: targetEmail, error: error.message };
    }

    // Update last_backup_at timestamp in settings
    try {
      await updateSiteSettings({ last_backup_at: backup.timestamp });
    } catch (saveErr) {
      console.warn("⚠️ Failed to update last_backup_at in settings:", saveErr);
    }

    console.log(`✅ Database backup (${formattedSize}) successfully dispatched to ${targetEmail}`);
    return { success: true, emailId: data?.id, sentTo: targetEmail };
  } catch (err: any) {
    console.error("❌ Unexpected error sending backup email:", err);
    return { success: false, sentTo: targetEmail, error: err?.message || String(err) };
  }
}
