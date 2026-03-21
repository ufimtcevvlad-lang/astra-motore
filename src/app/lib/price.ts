/**
 * Округление розничной цены вверх с шагом 50 ₽
 * (например 802,15 → 850; 583,83 → 600).
 */
export function roundRetailRubles(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  return Math.ceil(raw / 50) * 50;
}
