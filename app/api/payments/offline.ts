import type { PaymentAdapter } from "./types";

export const bankTransferAdapter: PaymentAdapter = {
  slug: "bank_transfer",

  async createCheckout(config, input) {
    const lines: string[] = [];
    if (config.bankName) lines.push(`البنك: ${config.bankName}`);
    if (config.accountName) lines.push(`اسم الحساب: ${config.accountName}`);
    if (config.accountNumber) lines.push(`رقم الحساب: ${config.accountNumber}`);
    if (config.iban) lines.push(`IBAN: ${config.iban}`);
    if (config.instructions) lines.push(config.instructions);
    lines.push(`المبلغ: ${(input.amount / 1000).toFixed(3)} ${input.currency}`);
    lines.push(`رقم الفاتورة: ${input.invoiceNumber}`);

    return {
      kind: "offline",
      instructions: lines.join("\n"),
      bankDetails: {
        bankName: config.bankName ?? "",
        accountName: config.accountName ?? "",
        accountNumber: config.accountNumber ?? "",
        iban: config.iban ?? "",
      },
    };
  },
};

export const manualAdapter: PaymentAdapter = {
  slug: "manual",

  async createCheckout(config, input) {
    const instructions =
      config.instructions?.trim() ||
      "تواصل مع الدعم لإتمام الدفع. احتفظ برقم الفاتورة أدناه.";

    return {
      kind: "offline",
      instructions: `${instructions}\n\nالمبلغ: ${(input.amount / 1000).toFixed(3)} ${input.currency}\nرقم الفاتورة: ${input.invoiceNumber}`,
    };
  },
};
