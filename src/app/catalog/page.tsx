import Link from "next/link";
import type { Metadata } from "next";
import { CatalogChrome } from "../components/catalog/CatalogChrome";
import { ProductCatalog } from "../components/ProductCatalog";
import { getAllProducts } from "../lib/products-db";
import { SITE_BRAND, SITE_URL } from "../lib/site";
import { socialShareMetadata } from "../lib/seo";
import { buildCatalogCanonical, buildCatalogSeoFromParams } from "../lib/catalog-canonical";

type CatalogSearchParams = Record<string, string | string[] | undefined>;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<CatalogSearchParams>;
}): Promise<Metadata> {
  const params = (await searchParams) ?? {};
  const canonical = buildCatalogCanonical(params);
  const seo = buildCatalogSeoFromParams(params);

  const title = seo ? seo.title : "Каталог запчастей";
  const description = seo
    ? seo.description
    : "Каталог GM Shop: автозапчасти GM — Opel и Chevrolet. Поиск по артикулу, группы и витрина по типу детали. Оригинал и аналоги.";

  const pathForOg = (canonical.replace(SITE_URL, "") || "/catalog") as `/${string}`;

  return {
    title,
    description,
    alternates: { canonical },
    ...socialShareMetadata({
      title: `${title} — ${SITE_BRAND}`,
      description,
      path: pathForOg,
    }),
  };
}

export default function CatalogPage() {
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Главная", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "Каталог", item: `${SITE_URL}/catalog` },
    ],
  };

  return (
    <div className="space-y-6 pb-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      <CatalogChrome
        crumbs={[
          { label: "Главная", href: "/" },
          { label: "Каталог" },
        ]}
        title="Каталог запчастей"
        description={
          <>
            Ищите по названию или артикулу. Не нашли нужное —{" "}
            <Link href="/contacts" className="font-medium text-amber-800 underline-offset-2 hover:underline">
              напишите нам
            </Link>
            , подберём.
          </>
        }
      />

      <ProductCatalog hideHubIntro products={getAllProducts()} />
    </div>
  );
}
