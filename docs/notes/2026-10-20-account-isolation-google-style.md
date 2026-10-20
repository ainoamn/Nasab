# 2026-10-20 — عزل الحساب بأسلوب جوجل

المرجع: [`docs/BHD-ACCOUNT-SWITCHER.md`](../BHD-ACCOUNT-SWITCHER.md) (نسخة حرفية من ONE-BHD).

## الإصلاح

| عيب | الحل |
|---|---|
| التبديل يبقي بيانات الحساب السابق | بعد `POST /switch` → `applyAccountIsolation()` = `start?returnTo=المسار` فيعيد ربط جلسة نَسَب |
| التبديل يفتح `login?add=1` | `add=1` فقط من زر الإضافة عبر `addAccountUrl()` |
| الرابط المباشر لا يتعرّف على الحساب النشط | `BhdSilentSso` يقارن هوية `me` مع `bhdSub` المحلي |
| شارة المصدر داخل الصورة | الشارة بجانب البريد (`bhd-switcher-who-meta`) |
| `/login` بلا `add=1` يطلب دخولاً | إن وُجدت جلسة نَسَب → `/app` مباشرة |

## ملفات النسخ للمنتجات الأخرى

انسخ من هذا المستودع أو من ONE-BHD:

1. `docs/BHD-ACCOUNT-SWITCHER.md`
2. `app/src/components/bhd/BhdAppSwitcher.tsx` (+ أنماط الوجه/الشارة)
3. `app/src/components/bhd/BhdSilentSso.tsx`
4. `app/src/lib/identity/client.ts`
5. `app/src/lib/bhd/apps.ts`
