type WatermarkVariant = "card" | "full";

const PRODUCT_IMAGE_PREFIXES = ["/images/catalog/", "/uploads/products/"];

export function isWatermarkableImageUrl(src: string | null | undefined): src is string {
  if (!src) return false;
  if (src.startsWith("/images/watermarked/")) return false;
  if (src === "/images/catalog/_pending.jpg") return false;
  return PRODUCT_IMAGE_PREFIXES.some((prefix) => src.startsWith(prefix));
}

export function watermarkedImageUrl(
  src: string | null | undefined,
  variant: WatermarkVariant = "card",
): string {
  if (!isWatermarkableImageUrl(src)) return src ?? "";
  return `/images/watermarked/${variant}${src.replace(/\.(jpe?g|png|webp)$/i, ".webp")}`;
}
