/**
 * Округление розничной цены вверх по ТЗ:
 * до 500 ₽ — шаг 50 ₽; от 500 ₽ — шаг 100 ₽.
 */
export function roundRetailRubles(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  if (raw < 500) {
    return Math.ceil(raw / 50) * 50;
  }
  return Math.ceil(raw / 100) * 100;
}
