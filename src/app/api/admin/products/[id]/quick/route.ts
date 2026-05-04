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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const numId = Number(id);
  const body = (await req.json()) as QuickPatchBody;

  const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (body.price != null) {
    const p = Number(body.price);
    if (!Number.isFinite(p) || p < 0) {
      return adminJson({ error: "Некорректная цена" }, { status: 400 });
    }
    patch.price = p;
  }
  if (body.inStock != null) {
    const s = Number(body.inStock);
    if (!Number.isFinite(s) || s < 0) {
      return adminJson({ error: "Некорректный остаток" }, { status: 400 });
    }
    patch.inStock = s;
  }
  if (typeof body.hidden === "boolean") {
    patch.hidden = body.hidden;
  }

  if (Object.keys(patch).length === 1) {
    return adminJson({ error: "Нет данных для обновления" }, { status: 400 });
  }

  await db.update(schema.products).set(patch).where(eq(schema.products.id, numId));

  const [updated] = await db
    .select({ id: schema.products.id, slug: schema.products.slug, price: schema.products.price, inStock: schema.products.inStock, hidden: schema.products.hidden })
    .from(schema.products)
    .where(eq(schema.products.id, numId));

  if (!updated) {
    return adminJson({ error: "Товар не найден" }, { status: 404 });
  }

  revalidatePublicProductPages(updated.slug ? [updated.slug] : []);

  return adminJson(updated);
}
