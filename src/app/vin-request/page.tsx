import type { Metadata } from "next";
import { VinRequestForm } from "../components/VinRequestForm";
import { SITE_URL } from "../lib/site";

export const metadata: Metadata = {
  title: "VIN-запрос",
  description: "Подбор запчастей по VIN — GM Shop, Екатеринбург.",
  alternates: { canonical: "/vin-request" },
};

export default function VinRequestPage() {
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Главная", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "VIN-запрос", item: `${SITE_URL}/vin-request` },
    ],
  };

  return (
    <div className="space-y-6 pb-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      <VinRequestForm />
    </div>
  );
}
