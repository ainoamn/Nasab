# 2026-10-04 — جلسة نَسَب حتى «خروج» (BHD-SESSION-POLICY)

المرجع: [`docs/BHD-SESSION-POLICY.md`](../BHD-SESSION-POLICY.md) (نسخة من `ainoamn/ONE-BHD`).

## ما تغيّر في الكود

| الملف | التغيير |
|---|---|
| `app/contracts/constants.ts` | `Session.maxAgeMs` = 400 يوم (كان 48 ساعة) |
| `app/server/kimi/session.ts` | `SESSION_TTL = "400d"` — `exp` في JWT يطابق عمر الكوكي |
| `app/server/auth-me.ts` | `GET /api/auth/me` يقرأ الجلسة ويعيد JSON فقط، بلا `Set-Cookie` |
| `app/server/auth-router.ts` | `auth.me` يعيد المستخدم فقط، بلا إعادة إصدار الكوكي |
| `app/src/components/auth/SessionKeepAlive.tsx` | محذوف، وأزيل من `App.tsx` |
| `app/src/hooks/useAuth.ts` | `refetchOnWindowFocus: false` و`refetchOnReconnect: false` لـ `auth.me` |
| `app/src/components/NavigationWarmup.tsx` | لا تسخين لصفحة `/login` |
| `app/server/auth-me.test.ts` · `app/server/session-idle.test.ts` | اختبار 400 يوم، واختبار أن `/api/auth/me` لا يكتب كوكي |

## ما كان مطابقاً أصلاً

- لا One Tap ولا تحميل لمكتبة جوجل في نَسَب.
- لا `location.reload()` عند عودة التبويب أو التركيز (زر «إعادة المحاولة» في `AppErrorBoundary` بنقرة المستخدم فقط).
- الخروج بزر «خروج» فقط: `auth.logout` يرفع `sessionVersion` ويمسح `kimi_sid` ثم `end-session` على الهوية.
- انتهاء جلسة نَسَب مع بقاء `bhd_id` → تحويل صامت إلى `/api/auth/bhd/start` (`useAuth`).
- الكوكي: `HttpOnly`، `Secure` في الإنتاج، `SameSite=Lax`، Host-only.

## التوثيق

- نسخ `BHD-SESSION-POLICY.md` وتحديث `BHD-UNIFIED-LOGIN-AND-APPS.md` و`BHD-PRODUCT-SSO-ADMIN.md` و`BHD-IDENTITY-SSO.md` من ONE-BHD.
- القسم 12.4 (نَسَب) في الدليل الموحّد: صف الجلسة، فقرة التقنيات، تاريخ التثبيت — في نَسَب وفي ONE-BHD (`e1bad4c`).
- `NASAB-BHD-SSO.md` و`BHD-NASAB-INTEGRATION.md` و`CHANGELOG.md`.

## الالتزامات والتحقق

- نَسَب: `1ec9b0b` على `main` — 211 اختباراً ناجحاً، `tsc -b` نظيف.
- ONE-BHD: `e1bad4c` على `main`.
- النشر: `npx vercel --prod --yes` من `C:\dev\Nasab`، ثم `https://nasab-mu.vercel.app/api/health` يجب أن يُظهر البناء الجديد.
- إن ظهر «The specified token is not valid»: شغّل `npx vercel login` ووافق على الرابط خلال 10 دقائق، ثم أعد النشر.

## اختبار يدوي بعد النشر

1. ادخل نَسَب واترك التبويب ساعات أو أغلق المتصفح وأعد فتحه → يبقى داخلاً بلا تحديث للصفحة.
2. في أدوات المطوّر: طلب `/api/auth/me` لا يحمل `Set-Cookie`.
3. اضغط «خروج» → خروج من نَسَب والهوية.
