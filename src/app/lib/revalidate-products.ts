import { revalidatePath } from "next/cache";
import { invalidateProductsDbCache } from "./products-db";
import { invalidateSearchIndex } from "./catalog-search";
import { notifyIndexNow } from "./indexnow";
import { SITE_URL } from "./site";

/** Ревалидирует все публичные маршруты, затрагиваемые изменением товаров. */
export function revalidatePublicProductPages(slugs: string[] = []): void {
  invalidateProductsDbCache();
  invalidateSearchIndex();
  revalidatePath("/");
  revalidatePath("/catalog");
  revalidatePath("/zapchasti-opel");
  revalidatePath("/zapchasti-gm");
  revalidatePath("/zapchasti-chevrolet");
  for (const slug of slugs) {
    if (slug) revalidatePath(`/product/${slug}`);
  }

  // Ping IndexNow (Yandex) — не блокируем ответ.
  const urls = [
    SITE_URL,
    `${SITE_URL}/catalog`,
    `${SITE_URL}/zapchasti-opel`,
    `${SITE_URL}/zapchasti-gm`,
    `${SITE_URL}/zapchasti-chevrolet`,
    ...slugs.filter(Boolean).map((s) => `${SITE_URL}/product/${s}`),
  ];
  void notifyIndexNow(urls).catch(() => {});
}
