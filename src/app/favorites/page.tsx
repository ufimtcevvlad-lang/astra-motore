import type { Metadata } from "next";
import { CatalogChrome } from "../components/catalog/CatalogChrome";
import { FavoritesPageContent } from "./FavoritesPageContent";

export const metadata: Metadata = {
  title: "Избранное",
  description: "Сохранённые товары из каталога GM Shop.",
  robots: { index: false, follow: true },
};

export default function FavoritesPage() {
  return (
    <div className="space-y-6 pb-8">
      <CatalogChrome
        crumbs={[
          { label: "Главная", href: "/" },
          { label: "Каталог", href: "/catalog" },
          { label: "Избранное" },
        ]}
        title="Избранное"
        description="Товары, которые вы отметили сердечком. Хранятся в вашем браузере."
      />
      <FavoritesPageContent />
    </div>
  );
}
