# 2026-10-20 — حسابات متعددة من رأس نَسَب

المراجع:
- [`docs/BHD-SESSION-POLICY.md`](../BHD-SESSION-POLICY.md)
- [`docs/BHD-APP-SWITCHER.md`](../BHD-APP-SWITCHER.md) §2.2
- [`docs/BHD-UNIFIED-LOGIN-AND-APPS.md`](../BHD-UNIFIED-LOGIN-AND-APPS.md) §0.2

## السلوك المطلوب

1. ادخل بالحساب الأول عبر SSO.
2. من الرأس → بطاقة الحساب → «إضافة حساب» → `https://id.bhd-om.com/login?add=1` ثم ادخل بالثاني.
3. التبديل من قائمة الحسابات في الرأس دون كلمة مرور: `POST https://id.bhd-om.com/api/auth/switch` ثم `GET /api/auth/bhd/start` صامت.
4. «خروج من هذا الحساب» يفعّل التالي إن وُجد. «خروج من كل الحسابات» → `end-session?all=1`.

## ملفات نَسَب

| ملف | دور |
|---|---|
| `app/src/components/bhd/BhdAppSwitcher.tsx` | قائمة حسابات + إضافة + خروج هذا/الكل |
| `app/src/components/AppHeader.tsx` | يمرّر الحسابات والcallbacks |
| `app/src/hooks/useAuth.ts` | يجلب roster من الهوية ويتولى switch/add/logout |
| `app/src/lib/identity/accounts.ts` | استدعاءات CORS إلى `/api/auth/{me,switch,logout}` |
| `app/src/lib/bhd/apps.ts` | كتالوج مجمد من ONE-BHD (`workspacePath=/app`) |
| `app/src/App.tsx` | مسار `/app` → لوحة الأشجار |
| `app/server/auth-router.ts` | `logout({ all? })` + `endSessionUrl` مع `all=1` |

## اعتماد الهوية

يحتاج `id.bhd-om.com` نشر `product-cors` على مسارات `me`/`switch`/`logout` (ملفات `product-cors.ts` في ONE-BHD). بدونها تظهر أزرار الإضافة/الخروج لكن قائمة التبديل تبقى فارغة من نَسَب.

## اختبار يدوي

1. حسابان على الهوية عبر «إضافة حساب».
2. من نَسَب: التبديل يغيّر الجلسة فوراً بلا نموذج.
3. خروج هذا الحساب يفعّل الآخر.
4. خروج الكل يطلب دخولاً جديداً.
