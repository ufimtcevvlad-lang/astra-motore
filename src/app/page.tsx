import { ProductCatalog } from "./components/ProductCatalog";

export default function HomePage() {
  return (
    <div className="space-y-8">
      <section className="rounded-2xl bg-gradient-to-br from-sky-600 to-sky-800 p-6 sm:p-8 text-white shadow-xl">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">
          Astra Motors
        </h1>
        <p className="text-sky-100 text-lg max-w-2xl mb-1">
          Надёжные автозапчасти с быстрой доставкой
        </p>
        <p className="text-sky-200/90 text-sm max-w-xl">
          Оригиналы и качественные аналоги. Подберём по марке и модели авто — оставьте заявку, перезвоним и уточним детали.
        </p>
      </section>

      <ProductCatalog />
    </div>
  );
}