/**
 * Shared utility helpers for SourceMonster.
 */

/**
 * Convert any string into a URL-safe slug.
 *
 * Rules:
 *  - Lowercases the entire string
 *  - Replaces any run of non-alphanumeric characters with a single hyphen
 *  - Strips leading / trailing hyphens
 *
 * @example slugify("MonsterSaaS — Multi-Tenant Boilerplate!") → "monstersaas-multi-tenant-boilerplate"
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

