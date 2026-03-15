"use client";

import { use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductImage } from "../../components/ProductImage";
import { products } from "../../data/products";
import { useCart } from "../../components/CartContext";

function ProductDetails({ id }: { id: string }) {
  const product = products.find(p => p.id === id);
  const { addToCart } = useCart();

  if (!product) return notFound();

  return (
    <div className="space-y-6">
      <Link href="/" className="inline-block text-sm text-sky-600 hover:text-sky-700 font-medium">
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
      <div className="space-y-4 rounded-lg bg-white p-4 shadow-sm border border-slate-200 h-fit">
        <p className="text-lg font-bold text-sky-600">
          {product.price.toLocaleString("ru-RU")} ₽
        </p>
        <p className="text-xs text-slate-500">
          В наличии: {product.inStock} шт.
        </p>
        <button
          onClick={() => addToCart(product)}
          className="w-full rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-sky-700 transition shadow-sm"
        >
          В корзину
        </button>
        <p className="text-xs text-slate-500">
          После оформления заказа менеджер свяжется с вами для подтверждения и
          подбора аналогов при необходимости.
        </p>
      </div>
      </div>
    </div>
  );
}

export default function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <ProductDetails id={id} />;
}