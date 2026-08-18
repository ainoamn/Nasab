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
- جلسة نَسَب تبقى الكوكي `kimi_sid` الموقَّعة بـ `APP_SECRET`.
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
| GET | `/api/auth/bhd/callback` | استبدال `code` والتحقق من `id_token` ثم `kimi_sid` |
| GET | `/api/auth/bhd/logout` | مسح جلسة نَسَب ثم `/oauth/end-session` |

واجهة `/login` تحوّل فوراً إلى `GET /api/auth/bhd/start` ثم شاشة الهوية على `id.bhd-om.com`. زر Google أُزيل من نَسَب (جوجل فقط على نطاق الهوية). دخول المشرف يبقى على `/login?admin=1`.

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

1. `GET https://nasab.bhd-om.com/api/health` → `"build":"98d1d7c"` أو أحدث
2. `GET https://id.bhd-om.com/.well-known/openid-configuration` يتضمن `"bhd-nasab"`
3. `https://nasab.bhd-om.com/login` يحوّل إلى شاشة «دخول حساب BHD» على `id.bhd-om.com`
4. مستخدم Google قديم بنفس البريد الموثّق لا يُنشأ له صف ثانٍ
5. فشل العودة → `/login?error=bhd&reason=…` (`token` = رفض `/oauth/token`، `state` = كوكي PKCE، `denied` = رفض الهوية)
6. الخروج من نَسَب يمسح `kimi_sid` ويحوّل إلى `end-session`
7. `bhdSsoConfigured: true` بعد ضبط السر على المشروعين؛ بدونه الهوية تقبل PKCE لـ `bhd-nasab`
