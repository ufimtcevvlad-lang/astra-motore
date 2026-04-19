import { revalidatePath } from "next/cache";
import { invalidateProductsDbCache } from "./products-db";
import { invalidateSearchIndex } from "./catalog-search";

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
}
