import { describe, expect, it } from "vitest";
import { buildWhatsAppUrl } from "@/lib/whatsAppShare";

describe("buildWhatsAppUrl", () => {
  it("encodes Arabic greeting text", () => {
    const url = buildWhatsAppUrl("كل عام وأنت بخير\nhttps://ex/p/1");
    expect(url.startsWith("https://wa.me/?text=")).toBe(true);
    expect(decodeURIComponent(url.replace("https://wa.me/?text=", ""))).toContain(
      "كل عام وأنت بخير",
    );
    expect(decodeURIComponent(url.replace("https://wa.me/?text=", ""))).toContain(
      "https://ex/p/1",
    );
  });
});
