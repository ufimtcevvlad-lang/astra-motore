"use client";

import { notFound } from "next/navigation";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ProductImage } from "../../components/ProductImage";
import { products } from "../../data/products";
import { ProductClient } from "./ProductClient";

function ProductNotFoundDebug({ id }: { id: string | undefined }) {
  const ids = products.map((p) => p.id).join(", ");

  return (
    <div className="space-y-3 rounded-xl border border-red-200 bg-white p-6">
      <h1 className="text-xl font-bold text-red-600">Товар не найден</h1>
      <p className="text-sm text-slate-700">
        params.id: <b>{String(id)}</b>
      </p>
      <p className="text-sm text-slate-700">
        доступные id в каталоге: <b>{ids}</b>
      </p>
      <Link
        href="/"
        className="inline-block text-sm text-sky-600 hover:text-sky-700 font-medium"
      >
        ← Назад в каталог
      </Link>
    </div>
  );
}

export default function ProductPageClient() {
  const params = useParams<{ id?: string }>();
  const id = params?.id;

  if (!id) {
    return <ProductNotFoundDebug id={id} />;
  }

  const product = products.find((p) => String(p.id) === String(id));
  if (!product) {
    return <ProductNotFoundDebug id={id} />;
  }

  return (
    <div className="space-y-6">
      <Link
        href="/"
        className="inline-block text-sm text-sky-600 hover:text-sky-700 font-medium"
      >
        ← Назад в каталог
      </Link>
      <div className="grid gap-6 md:grid-cols-[1.3fr_1fr]">
        <div className="space-y-4">
          <div className="aspect-[4/3] relative rounded-lg bg-slate-100 overflow-hidden">
            <ProductImage
              src={product.image}
              alt={product.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
          <h1 className="text-xl font-semibold">{product.name}</h1>
          <p className="text-sm text-slate-600">{product.description}</p>
          <p className="text-sm text-slate-500">
            Марка: {product.brand} • Авто: {product.car}
          </p>
          <p className="text-sm text-slate-500">Артикул: {product.sku}</p>
        </div>
        <ProductClient product={product} />
      </div>
    </div>
  );
}

