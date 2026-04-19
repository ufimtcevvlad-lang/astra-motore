import { db, schema } from "./index";
import { CATALOG_SECTIONS, CATALOG_GROUPS } from "../../data/catalog-sections";
import { eq } from "drizzle-orm";

/**
 * Синхронизирует таблицу categories с хардкодом CATALOG_SECTIONS.
 * Добавляет отсутствующие slug, обновляет title/group для существующих.
 * Старые slug, которых больше нет в хардкоде, не трогает.
 */
export function seedCategories(): void {
  const now = new Date().toISOString();
  const groupBySlug = new Map(CATALOG_GROUPS.map((g) => [g.slug, g.title]));
  const existing = db.select().from(schema.categories).all();
  const existingBySlug = new Map(existing.map((c) => [c.slug, c]));

  for (let i = 0; i < CATALOG_SECTIONS.length; i++) {
    const section = CATALOG_SECTIONS[i];
    const groupName = groupBySlug.get(section.groupSlug) ?? section.groupSlug;
    const prev = existingBySlug.get(section.slug);
    if (!prev) {
      db.insert(schema.categories).values({
        slug: section.slug,
        title: section.title,
        groupSlug: section.groupSlug,
        groupName,
        sortOrder: i,
        createdAt: now,
      }).run();
    } else if (prev.title !== section.title || prev.groupSlug !== section.groupSlug || prev.groupName !== groupName) {
      db.update(schema.categories).set({
        title: section.title,
        groupSlug: section.groupSlug,
        groupName,
        sortOrder: i,
      }).where(eq(schema.categories.id, prev.id)).run();
    }
  }
}
