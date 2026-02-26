export function normalizePhone(phone: string) {
  return phone.replace(/[^\d]/g, "");
}

export function buildWhatsAppLink(phone: string, message: string) {
  const cleanPhone = normalizePhone(phone);

  if (!cleanPhone) {
    return "#";
  }

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}
