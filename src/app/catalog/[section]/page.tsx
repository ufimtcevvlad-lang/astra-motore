import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CatalogChrome } from "../../components/catalog/CatalogChrome";
import { CatalogProductGrid } from "../../components/catalog/CatalogProductGrid";
import { CatalogSectionHeading } from "../../components/catalog/CatalogSectionHeading";
import { CATALOG_SECTIONS } from "../../data/catalog-sections";
import { getAllProducts } from "../../lib/products-db";
import { socialShareMetadata } from "../../lib/seo";
import { SITE_BRAND, SITE_URL } from "../../lib/site";

type SectionSlug = (typeof CATALOG_SECTIONS)[number]["slug"];

const sectionBySlug = new Map(CATALOG_SECTIONS.map((section) => [section.slug, section] as const));

function getSection(slug: string | undefined) {
  if (!slug) return null;
  return sectionBySlug.get(slug as SectionSlug) ?? null;
}

function productsForSection(slug: string) {
  const section = getSection(slug);
  if (!section) return [];
  return getAllProducts().filter((product) => product.category === section.title);
}

export function generateStaticParams() {
  const products = getAllProducts();
  const titlesWithProducts = new Set(products.map((product) => product.category));
  return CATALOG_SECTIONS
    .filter((section) => titlesWithProducts.has(section.title))
    .map((section) => ({ section: section.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ section?: string }>;
}): Promise<Metadata> {
  const { section: slug } = await params;
  const section = getSection(slug);
  if (!section) {
    return {
      title: `Каталог запчастей — ${SITE_BRAND}`,
      robots: { index: false, follow: true },
    };
  }

  const title = `${section.title} Opel и Chevrolet в Екатеринбурге`;
  const description = `${section.title}: подбор запчастей Opel и Chevrolet по артикулу. Цены, наличие и доставка по Екатеринбургу.`;
  const path = `/catalog/${section.slug}` as const;

  return {
    title,
    description,
    alternates: { canonical: path },
    ...socialShareMetadata({
      title: `${title} — ${SITE_BRAND}`,
      description,
      path,
    }),
  };
}

export default async function CatalogSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section: slug } = await params;
  const section = getSection(slug);
  if (!section) notFound();

  const items = productsForSection(section.slug);
  if (items.length === 0) notFound();

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Главная", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "Каталог", item: `${SITE_URL}/catalog` },
      {
        "@type": "ListItem",
        position: 3,
        name: section.title,
        item: `${SITE_URL}/catalog/${section.slug}`,
      },
    ],
  };

  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${section.title} Opel и Chevrolet`,
    itemListElement: items.slice(0, 24).map((product, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: product.name,
      url: `${SITE_URL}/product/${product.slug}`,
    })),
  };

  return (
    <div className="space-y-6 pb-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }}
      />

      <CatalogChrome
        crumbs={[
          { label: "Главная", href: "/" },
          { label: "Каталог", href: "/catalog" },
          { label: section.title },
        ]}
        title={`${section.title} Opel и Chevrolet в Екатеринбурге`}
        description={
          <>
            В наличии {items.length} позиций. Подберём по артикулу, проверим совместимость и подскажем
            оригинал или качественный аналог.
          </>
        }
      />

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <CatalogSectionHeading>Подбор и наличие</CatalogSectionHeading>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Раздел «{section.title}» собран для быстрых заказов по Opel и Chevrolet. Если сомневаетесь
          в применимости детали, отправьте артикул или VIN: менеджер сверит позицию перед покупкой.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/zapchasti-opel"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800 transition hover:border-amber-300 hover:bg-amber-50"
          >
            Запчасти Opel
          </Link>
          <Link
            href="/zapchasti-chevrolet"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800 transition hover:border-amber-300 hover:bg-amber-50"
          >
            Запчасти Chevrolet
          </Link>
          <Link
            href="/vin-request"
            className="rounded-lg bg-amber-400 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-300"
          >
            VIN-запрос
          </Link>
        </div>
      </section>

      <section className="space-y-4">
        <CatalogSectionHeading>Товары раздела</CatalogSectionHeading>
        <CatalogProductGrid items={items} />
      </section>
    </div>
  );
}
