/** رابط واتساب بنص جاهز للنسخ/الإرسال */
export function buildWhatsAppUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/** يفتح واتساب في تبويب جديد بالنص المعطى */
export function openWhatsAppShare(text: string): void {
  const url = buildWhatsAppUrl(text);
  window.open(url, "_blank", "noopener,noreferrer");
}
