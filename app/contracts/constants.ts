export const Session = {
  cookieName: "kimi_sid",
  /** 7 أيام — مع إبطال عبر sessionVersion */
  maxAgeMs: 7 * 24 * 60 * 60 * 1000,
} as const;

export const ErrorMessages = {
  unauthenticated: "Authentication required",
  insufficientRole: "Insufficient permissions",
} as const;

export const Paths = {
  login: "/login",
  oauthCallback: "/api/oauth/callback",
} as const;

/* ───────────── ثوابت منصة نَسَب ───────────── */

export const TREE_ROLES = ["owner", "admin", "editor", "viewer"] as const;
export type TreeRole = (typeof TREE_ROLES)[number];

export const INVITE_ROLES = ["admin", "editor", "viewer"] as const;
export type InviteRole = (typeof INVITE_ROLES)[number];

export const PERSON_PRIVACY = ["private", "family", "linked", "public"] as const;
export type PersonPrivacy = (typeof PERSON_PRIVACY)[number];

export const TREE_VISIBILITY = ["private", "unlisted", "public"] as const;
export type TreeVisibility = (typeof TREE_VISIBILITY)[number];

/** حالة الشجرة في لوحة التحكم */
export const TREE_STATUS = ["active", "paused", "archived"] as const;
export type TreeStatus = (typeof TREE_STATUS)[number];

/** خطط الاشتراك */
export const SUBSCRIPTION_PLANS = ["free", "plus", "print"] as const;
export type SubscriptionPlan = (typeof SUBSCRIPTION_PLANS)[number];

export const FREE_PLAN_PERSON_LIMIT = 500;

/** تصنيفات المصروفات في المحاسبة */
export const EXPENSE_CATEGORIES = [
  "hosting",
  "marketing",
  "salaries",
  "operations",
  "other",
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

/** بوابات الدفع المدعومة */
export const PAYMENT_GATEWAY_SLUGS = [
  "thawani",
  "stripe",
  "paypal",
  "bank_transfer",
  "manual",
] as const;
export type PaymentGatewaySlug = (typeof PAYMENT_GATEWAY_SLUGS)[number];

export const INVOICE_STATUS = ["paid", "pending", "cancelled"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUS)[number];

/** دور المستخدم على مستوى المنصة */
export const USER_ROLES = ["user", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const FEMALE_DISPLAY = ["full", "firstOnly", "hidden"] as const;
export type FemaleDisplay = (typeof FEMALE_DISPLAY)[number];

export const RELATIONSHIP_TYPES = ["parent", "spouse"] as const;
export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number];

/** اسم placeholder للأم غير المسجّلة في الشجرة */
export const UNNAMED_MOTHER_LABEL = "—";

// تدرج ألوان الأجيال (حتى 12 جيلاً ثم يتكرر)
export const GENERATION_COLORS = [
  "#0F5132", // أخضر عماني غامق
  "#1B6B4A",
  "#2E8B62",
  "#B8860B", // ذهبي
  "#C9971C",
  "#8B4513", // نحاسي
  "#A0522D",
  "#37526B", // أزرق ليلي
  "#4A6B8A",
  "#6B3A5B", // عنابي
  "#84516F",
  "#5B5B5B",
] as const;
