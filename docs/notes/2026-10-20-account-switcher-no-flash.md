# 2026-10-20 — سرعة بلا وميض (BHD-ACCOUNT-SWITCHER §5)

المراجع:
- [`docs/BHD-ACCOUNT-SWITCHER.md`](../BHD-ACCOUNT-SWITCHER.md) القسم 5
- [`docs/BHD-APP-SWITCHER.md`](../BHD-APP-SWITCHER.md)
- منشور: https://id.bhd-om.com/docs/BHD-ACCOUNT-SWITCHER.md

## السلوك

1. تبديل حساب: `POST /api/auth/switch` → تحديث الرأس من JSON فوراً. ممنوع `location.reload`.
2. إن اختلف `sub` عن جلسة نَسَب: مسح `kimi_sid` ثم تنقّل مرة إلى `/app`؛ الحارس يحوّل إلى `start` فقط بلا جلسة.
3. فتح تطبيق من الشبكة أو الفوتر: `launchUrlForApp` = مساحة العمل، ليس `startUrl`.
4. عند أول مؤشر: `preconnect` لمنشأ التطبيقات؛ عند فتح الشبكة: `prefetch` لمسارات العمل.

## ملفات

| ملف | دور |
|---|---|
| `docs/BHD-ACCOUNT-SWITCHER.md` | نسخة حرفية من ONE-BHD |
| `docs/BHD-APP-SWITCHER.md` | نسخة حرفية |
| `docs/BHD-SESSION-POLICY.md` | نسخة حرفية |
| `app/src/components/bhd/BhdAppSwitcher.tsx` | `hintHop` + `launchUrlForApp` + تنقّل نفس المنشأ |
| `app/src/lib/bhd/apps.ts` | كتالوج مجمد؛ `launchUrlForApp` = workspace |
| `app/src/hooks/useAuth.ts` | switch بلا reload؛ rebind عبر `/app` |
| `app/src/components/NavigationWarmup.tsx` | `hopOrigins` preconnect |
| `app/src/components/bhd/BhdSiteFooter.tsx` | روابط البرامج عبر workspace |

## اختبار قبول

1. التبديل يغيّر الصورة والبريد فوراً بلا شاشة بيضاء.
2. تطبيق سبق زيارته يفتح مساحة العمل مباشرة.
3. أول زيارة بلا جلسة تمرّ بـ `start` مرة واحدة ثم تثبت الجلسة.
