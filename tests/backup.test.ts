import { describe, it, expect } from "vitest";

describe("Database Backup Formatting & Serialization", () => {
  it("should format SQL literals correctly across all supported types", () => {
    function formatSqlValue(val: any): string {
      if (val === null || val === undefined) return "NULL";
      if (typeof val === "boolean") return val ? "TRUE" : "FALSE";
      if (typeof val === "number") return Number.isFinite(val) ? String(val) : "NULL";
      if (val instanceof Date) return `'${val.toISOString()}'`;
      if (typeof val === "object") {
        return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
      }
      return `'${String(val).replace(/'/g, "''")}'`;
    }

    expect(formatSqlValue(null)).toBe("NULL");
    expect(formatSqlValue(undefined)).toBe("NULL");
    expect(formatSqlValue(true)).toBe("TRUE");
    expect(formatSqlValue(false)).toBe("FALSE");
    expect(formatSqlValue(42)).toBe("42");
    expect(formatSqlValue(3.14159)).toBe("3.14159");
    expect(formatSqlValue("SourceMonster's App")).toBe("'SourceMonster''s App'");
    expect(formatSqlValue(["typescript", "astro"])).toBe("'[\"typescript\",\"astro\"]'");
    expect(formatSqlValue({ key: "val's" })).toBe("'{\"key\":\"val''s\"}'");
  });

  it("should produce valid SQL file naming conventions", () => {
    const timestampIso = new Date("2026-11-10T07:45:00.000Z").toISOString();
    const dateFormatted = timestampIso.replace(/[:.]/g, "-").replace("T", "_").slice(0, 19);
    const filename = `sourcemonster_backup_${dateFormatted}.sql`;

    expect(filename).toBe("sourcemonster_backup_2026-11-10_07-45-00.sql");
    expect(filename.endsWith(".sql")).toBe(true);
  });
});
