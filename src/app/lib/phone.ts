export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function normalizeRuPhone(value: string): string {
  const digits = onlyDigits(value);
  if (!digits) return "";

  let d = digits;
  if (d.startsWith("8")) d = "7" + d.slice(1);
  if (!d.startsWith("7")) d = "7" + d;
  return d.slice(0, 11);
}

export function isValidRuPhone(value: string): boolean {
  return /^7\d{10}$/.test(normalizeRuPhone(value));
}

export function formatRuPhoneInput(value: string): string {
  const normalized = normalizeRuPhone(value);
  if (!normalized) return "+7";

  const rest = normalized.slice(1);
  if (rest.length === 0) return "+7";
  if (rest.length <= 3) return `+7 (${rest}`;
  if (rest.length <= 6) return `+7 (${rest.slice(0, 3)}) ${rest.slice(3)}`;
  if (rest.length <= 8) return `+7 (${rest.slice(0, 3)}) ${rest.slice(3, 6)}-${rest.slice(6)}`;
  return `+7 (${rest.slice(0, 3)}) ${rest.slice(3, 6)}-${rest.slice(6, 8)}-${rest.slice(8, 10)}`;
}

