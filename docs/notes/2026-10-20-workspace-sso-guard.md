# 2026-10-20 — حارس مساحة العمل (SSO صامت)

## المشكلة

`/dashboard` و`/app` كانت تُرجع `index.html` دائماً. الزائر القادم من حسابي/وازن/الهوية بجلسة `bhd_id` كان ينتظر تحميل React ثم `useAuth` قبل `start`، فيبدو أن نَسَب «يطلب دخولاً» رغم أن الهوية تعرفه.

## الإصلاح

Edge middleware في نشر Vercel (`server/edge-session-guard.js`):

- بلا `kimi_sid` على مسار محمي → `307` إلى `/api/auth/bhd/start?returnTo=…`
- الهوية ترى `bhd_id` → تصدر الكود بلا نموذج → `callback` يضبط جلسة نَسَب
- مع `kimi_sid` → الصفحة مباشرة

المسارات المحمية: `/app` · `/dashboard` · `/account` · `/checkout` · `/admin` · `/trees/*`  
مستثناة: `/` · `/login` · `/share/*` · `/invite/*` · `/api/*` · `/docs/*`
