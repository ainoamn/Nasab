import { env } from "./env";

/** استخراج IP العميل — يثق برؤوس proxy فقط عند TRUST_PROXY=true */
export function getClientIp(headers: Headers): string | null {
  if (env.trustProxy) {
    const forwarded = headers.get("x-forwarded-for");
    if (forwarded) {
      const first = forwarded.split(",")[0]?.trim();
      if (first) return first;
    }
    const realIp = headers.get("x-real-ip")?.trim();
    if (realIp) return realIp;
    const cf = headers.get("cf-connecting-ip")?.trim();
    if (cf) return cf;
  }
  return null;
}
