import { eq } from "drizzle-orm";
import { db } from "../db";
import { siteSettings } from "../db/schema";

export interface SiteSettingsMap {
  site_name: string;
  contact_email: string;
  contact_phone: string;
  whatsapp_number: string;
  social_twitter: string;
  social_github: string;
  social_linkedin: string;
  seo_default_title: string;
  seo_default_description: string;
  footer_copyright: string;
}

export const DEFAULT_SITE_SETTINGS: SiteSettingsMap = {
  site_name: "Source Monster",
  contact_email: "contact@sourcemonster.in",
  contact_phone: "+91 86072 48802",
  whatsapp_number: "918607248802",
  social_twitter: "https://twitter.com/sourcemonster",
  social_github: "https://github.com/sourcemonster",
  social_linkedin: "https://linkedin.com/company/sourcemonster",
  seo_default_title: "Source Monster | The Future of Digital Execution",
  seo_default_description:
    "Source Monster is a premium digital task force of elite freelancers. We deliver high-performance web development, alpha UI/UX design, and aggressive digital growth strategies.",
  footer_copyright: "© 2026 Source Monster. All rights reserved.",
};

let cachedSettings: SiteSettingsMap | null = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

export async function getSiteSettings(): Promise<SiteSettingsMap> {
  const now = Date.now();
  if (cachedSettings && now < cacheExpiry) {
    return cachedSettings;
  }

  try {
    const records = await db.select().from(siteSettings);
    const dbMap: Record<string, string> = {};

    for (const record of records) {
      dbMap[record.key] = record.value;
    }

    cachedSettings = {
      ...DEFAULT_SITE_SETTINGS,
      ...dbMap,
    };
    cacheExpiry = now + CACHE_TTL_MS;

    return cachedSettings;
  } catch (err) {
    console.warn("⚠️ Could not fetch site settings from DB, using defaults:", err);
    return DEFAULT_SITE_SETTINGS;
  }
}

export async function updateSiteSettings(updates: Partial<SiteSettingsMap>): Promise<void> {
  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined) continue;

    const [existing] = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.key, key))
      .limit(1);

    if (existing) {
      await db
        .update(siteSettings)
        .set({ value: String(value), updatedAt: new Date() })
        .where(eq(siteSettings.id, existing.id));
    } else {
      await db.insert(siteSettings).values({
        key,
        value: String(value),
      });
    }
  }

  // Clear memory cache
  cachedSettings = null;
  cacheExpiry = 0;
}

