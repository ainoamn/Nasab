# تنفيذ هوية BHD في نَسَب

> تنفيذ القسم 6 من المواصفة المعتمدة — دون تعديل القيم المجمّدة.  
> المصدر: [`BHD-IDENTITY-SSO.md`](./BHD-IDENTITY-SSO.md) (`bhd-identity.v1`)  
> المستودع: [ainoamn/Nasab](https://github.com/ainoamn/Nasab)

## ماذا يربط وماذا يبقى محلياً

| الطبقة | أين | ماذا يُحفظ |
|---|---|---|
| الهوية | `https://id.bhd-om.com` | حساب BHD (بريد / Google) |
| نَسَب | قاعدة Neon الخاصة بنَسَب | الشجرات، الأعضاء، الفوترة، العمود `bhd_sub` |

- لا تُشارك `DATABASE_URL` مع البوابة أو وازن أو حسابي.
- جلسة نَسَب تبقى الكوكي `kimi_sid` الموقَّعة بـ `APP_SECRET`، 400 يوم أو حتى «خروج» الصريح، بلا خمول ولا نبضات تجديد؛ `GET /api/auth/me` للقراءة فقط (`BHD-SESSION-POLICY.md`).
- الهوية تستخدم كوكي `bhd_id` على نطاقها فقط.
- الأدوار (`user` / `admin`) وعضوية الشجرة محلية. الهوية لا تمنح مشرفاً.

## العميل

| المفتاح | القيمة |
|---|---|
| `client_id` | `bhd-nasab` |
| `redirect_uri` الإنتاج | `https://nasab.bhd-om.com/api/auth/bhd/callback` |
| `redirect_uri` Vercel | `https://nasab-mu.vercel.app/api/auth/bhd/callback` |
| `redirect_uri` محلي | `http://localhost:5173/api/auth/bhd/callback` |
| `post_logout_redirect_uri` | أصل الموقع + `/` |

## المسارات

| الطريقة | المسار | الوظيفة |
|---|---|---|
| GET | `/api/auth/bhd/start` | PKCE + كوكي `bhd_oauth_state` ثم تحويل إلى `/oauth/authorize` |
| GET | `/api/auth/bhd/callback` | استبدال `code` والتحقق من `id_token` ثم ربط `bhd_sub` (مع الإبقاء على دور الأدمن إن وُجد) ومسح الجلسة السابقة ثم `kimi_sid` |
| GET | `/api/auth/bhd/logout` | مسح جلسة نَسَب ثم `/oauth/end-session` |
| GET | `/api/auth/admin-entry` | دخول الإدارة → `start?returnTo=/admin` (القسم 4.9) |

واجهة أزرار «تسجيل الدخول» تذهب مباشرة إلى `GET /api/auth/bhd/start` ثم شاشة الهوية على `id.bhd-om.com`. `/login` غلاف أخطاء فقط؛ `?admin=1` و`?local=1` يحوّلان إلى `admin-entry`. لا كلمة مرور محلية للمستخدم النهائي. صلاحية المشرف محلية في جدول نَسَب فقط.

بعد الدخول يظهر مشغّل التطبيقات (`BhdAppSwitcher`) في الرأس. رابط «الحساب» في المشغّل يفتح `https://id.bhd-om.com/account`. إعدادات شجرة نَسَب تبقى في `/account` للمنتج. المواصفة: [`BHD-APP-SWITCHER.md`](./BHD-APP-SWITCHER.md). الخطة: [`BHD-NASAB-INTEGRATION.md`](./BHD-NASAB-INTEGRATION.md). دليل الأدمن: [`BHD-PRODUCT-SSO-ADMIN.md`](./BHD-PRODUCT-SSO-ADMIN.md). الدليل المرجعي: [`BHD-UNIFIED-LOGIN-AND-APPS.md`](./BHD-UNIFIED-LOGIN-AND-APPS.md).

## ربط الحسابات الحالية

ترتيب المطابقة (يتوقف عند أول نجاح):

1. صف موجود `bhd_sub = id_token.sub`
2. بريد موثّق مطابق لحساب `google:…` أو `password:…`
3. وإلا مستخدم نَسَب جديد `unionId = bhd:{sub}` بدور `user` وخطة `free` — بلا كلمة مرور محلية

لا يُغيَّر `unionId` للحسابات القديمة حتى تبقى الشجرات مربوطة بنفس `users.id`.

## متغيرات البيئة

على مشروع Vercel **nasab**:

```env
BHD_IDENTITY_ISSUER=https://id.bhd-om.com
BHD_OAUTH_CLIENT_ID=bhd-nasab
BHD_OAUTH_CLIENT_SECRET=
BHD_OAUTH_REDIRECT_URI=https://nasab.bhd-om.com/api/auth/bhd/callback
BHD_IDENTITY_TOKEN_SECRET=
```

`BHD_IDENTITY_ISSUER` الافتراضي في الكود هو `https://id.bhd-om.com` (النطاق الحي).

على مشروع **one-bhd**:

```env
BHD_OAUTH_CLIENT_SECRET_NASAB=<نفس BHD_OAUTH_CLIENT_SECRET>
```

`BHD_IDENTITY_TOKEN_SECRET` في نَسَب يطابق `IDENTITY_TOKEN_SECRET` أو `AUTH_SECRET` للهوية طالما التوقيع HS256 (JWKS فارغ).

## التحقق

```bash
cd app
npm test
npx tsc -b
```

بعد النشر:

1. `GET https://nasab.bhd-om.com/api/health` → `"build"` يساوي `git rev-parse --short origin/main`
2. `GET https://id.bhd-om.com/.well-known/openid-configuration` يتضمن `"bhd-nasab"`
3. زر «تسجيل الدخول» يفتح `GET /api/auth/bhd/start` ثم شاشة الهوية — بلا بطاقة نَسَب الوسيطة
4. مستخدم Google قديم بنفس البريد الموثّق لا يُنشأ له صف ثانٍ
5. فشل العودة → `/login?error=bhd&reason=…` (`token` = رفض `/oauth/token`، `state` = كوكي PKCE، `denied` = رفض الهوية)
6. الخروج من نَسَب يمسح `kimi_sid` ويحوّل إلى `end-session`
7. `/api/diag` → `bhdSsoConfigured: true` عندما يكون المُصدِر و`client_id` جاهزين (السر اختياري مع PKCE)
8. ملاحظة «البناء الحي متأخر» على `/setup` فقط. إن استمر التأخير مع حد Vercel المجاني: Deployments → Redeploy
9. مشغّل «تطبيقات BHD» على نطاق الهوية بعد تسجيل الدخول — ليس جزءاً من مسار دخول نَسَب
