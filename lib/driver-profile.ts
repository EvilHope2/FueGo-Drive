export function normalizeDriverWhatsApp(raw: string) {
  const digits = raw.replace(/\D/g, "");

  if (!digits) return "";
  if (digits.startsWith("549")) return `+${digits}`;
  if (digits.startsWith("54")) return `+549${digits.slice(2)}`;
  if (digits.startsWith("0")) return `+549${digits.replace(/^0+/, "")}`;

  return `+549${digits}`;
}

export function isValidDriverWhatsApp(phone: string) {
  return /^\+549\d{6,}$/.test(phone);
}

export function normalizeVehiclePlate(raw: string) {
  return raw.trim().toUpperCase();
}

export function hasLockedValue(value: string | null | undefined) {
  return Boolean(value && value.trim().length > 0);
}

