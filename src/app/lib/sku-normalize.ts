/**
 * Компактный вид артикула для поиска и дедупликации.
 * Убирает пробелы, тире, точки, слеши и любые прочие разделители:
 * `TM 41 105`, `TM-41.105`, `tm_41105` -> `TM41105`.
 */
export function normalizeSkuForSearch(value: string | null | undefined): string {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/[^0-9a-zа-я]+/gi, "")
    .toUpperCase();
}
