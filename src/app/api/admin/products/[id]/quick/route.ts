import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-middleware";
import { db, schema } from "@/app/lib/db";
import { eq } from "drizzle-orm";
import { revalidatePublicProductPages } from "@/app/lib/revalidate-products";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, max-age=0, must-revalidate",
};

function adminJson<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: {
      ...NO_STORE_HEADERS,
      ...(init?.headers ?? {}),
    },
  });
}

interface QuickPatchBody {
  price?: number;
  inStock?: number;
  hidden?: boolean;
}

async function readAdminProductRow(id: number) {
  const [row] = await db
    .select({
      id: schema.products.id,
      externalId: schema.products.externalId,
      sku: schema.products.sku,
      name: schema.products.name,
      brand: schema.products.brand,
      country: schema.products.country,
      categoryId: schema.products.categoryId,
      categoryTitle: schema.categories.title,
      car: schema.products.car,
      price: schema.products.price,
      inStock: schema.products.inStock,
      image: schema.products.image,
      hidden: schema.products.hidden,
      createdAt: schema.products.createdAt,
      updatedAt: schema.products.updatedAt,
      slug: schema.products.slug,
    })
    .from(schema.products)
    .leftJoin(schema.categories, eq(schema.products.categoryId, schema.categories.id))
    .where(eq(schema.products.id, id));

  return row ?? null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) {
    return adminJson({ error: "Некорректный товар" }, { status: 400 });
  }
  const body = (await req.json()) as QuickPatchBody;

  const existing = await readAdminProductRow(numId);
  if (!existing) {
    return adminJson({ error: "Товар не найден" }, { status: 404 });
  }

  const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (body.price != null) {
    const p = Number(body.price);
    if (!Number.isFinite(p) || p < 0) {
      return adminJson({ error: "Некорректная цена" }, { status: 400 });
    }
    patch.price = Math.round(p);
  }
  if (body.inStock != null) {
    const s = Number(body.inStock);
    if (!Number.isFinite(s) || s < 0) {
      return adminJson({ error: "Некорректный остаток" }, { status: 400 });
    }
    patch.inStock = Math.round(s);
  }
  if (typeof body.hidden === "boolean") {
    patch.hidden = body.hidden;
  }

  if (Object.keys(patch).length === 1) {
    return adminJson({ error: "Нет данных для обновления" }, { status: 400 });
  }

  await db.update(schema.products).set(patch).where(eq(schema.products.id, numId));

  const updated = await readAdminProductRow(numId);

  if (!updated) {
    return adminJson({ error: "Товар не найден" }, { status: 404 });
  }

  const saveMismatch =
    (typeof patch.price === "number" && updated.price !== patch.price) ||
    (typeof patch.inStock === "number" && updated.inStock !== patch.inStock) ||
    (typeof patch.hidden === "boolean" && updated.hidden !== patch.hidden);

  if (saveMismatch) {
    console.error("Admin quick save mismatch", {
      id: numId,
      requested: patch,
      saved: {
        price: updated.price,
        inStock: updated.inStock,
        hidden: updated.hidden,
      },
    });
    return adminJson(
      { error: "Сервер не подтвердил сохранение. Обновите страницу и попробуйте ещё раз." },
      { status: 500 }
    );
  }

  revalidatePublicProductPages(updated.slug ? [updated.slug] : []);

  return adminJson(updated);
}
