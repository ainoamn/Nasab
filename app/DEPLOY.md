# نشر نَسَب (Nasab) — دليل الإطلاق

## جاهزية الإطلاق (Checklist)

### إلزامي قبل فتح الموقع للجمهور

1. انسخ `app/.env.production.example` → `.env` واملأ كل القيم.
2. أنشئ `APP_SECRET` قوياً (≥ 32 حرفاً):
   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```
3. قاعدة بيانات جاهزة و`DATABASE_URL` يشير إليها (MySQL أو Neon PostgreSQL — ليس SQLite).
4. اضبط `OWNER_UNION_ID` لاتحاد حسابك (أول دخول بهذا الـ ID يصبح مشرفاً).
5. اضبط `APP_PUBLIC_URL` و`ALLOWED_ORIGINS` على نطاق HTTPS الفعلي.
6. مرّر `VITE_KIMI_AUTH_URL` و`VITE_APP_ID` عند البناء.
7. فعّل بوابة دفع: التحويل البنكي يُفعَّل افتراضياً — أكمل بيانات الحساب من `/admin/gateways`. لثواني/Stripe ضع مفاتيح حية وأوقف وضع الاختبار.
8. راجع أسعار الخطط في `/admin/plans` (الافتراضي: بلس 9.9 ر.ع. / طباعة 19.9 ر.ع. سنوياً).
9. شغّل فحص الجاهزية:
   ```bash
   cd app
   NODE_ENV=production npm run prod:check
   ```

### ممنوع في الإنتاج

- `DEV_LOCAL_AUTH=true` (يُتجاهل تلقائياً عند `NODE_ENV=production`، لكن لا تضعه true)
- `DATABASE_URL=file:...`
- أسرار ضعيفة أو مشاركة ملف `.env` في Git

### كوكيز HTTPS

في الإنتاج خلف نطاق حقيقي تُضبط الجلسة تلقائياً: `Secure` + `SameSite=None` + `HttpOnly`.
تأكد أن الموقع يُخدم عبر HTTPS أمام التطبيق.
---

## متغيرات البيئة

انظر `app/.env.production.example` للنموذج الكامل.

```env
NODE_ENV=production
PORT=3000
APP_ID=...
APP_SECRET=...                    # 32+ characters
DATABASE_URL=postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require
# أو: DATABASE_URL=mysql://user:pass@host:3306/nasab
APP_PUBLIC_URL=https://yourdomain.com
TRUST_PROXY=true
ALLOWED_ORIGINS=https://yourdomain.com
KIMI_AUTH_URL=...
KIMI_OPEN_URL=...
OWNER_UNION_ID=...
GOOGLE_CLIENT_ID=...              # اختياري
GOOGLE_CLIENT_SECRET=...
DEV_LOCAL_AUTH=false
```

---

## Docker (المسار الموصى به)

```bash
cd app
cp .env.production.example .env
# عدّل .env ثم:
docker compose up -d --build
```

عند الإقلاع يقوم الـ entrypoint تلقائياً بـ:

1. انتظار جاهزية MySQL
2. `drizzle-kit push --force` لتطبيق الـ schema
3. تشغيل الخادم وبذر الخطط/البوابات/إعدادات الشركة

- التطبيق: المنفذ `3000` (أو `APP_PUBLISH_PORT`)
- MySQL: المنفذ `3306` محلياً (أو `MYSQL_PUBLISH_PORT`)

فحص الصحة: `GET http://localhost:3000/api/health`

---

## Neon PostgreSQL

1. من لوحة Neon انسخ **pooled** connection string إلى `DATABASE_URL`.
2. طبّق الجداول:
   ```bash
   cd app
   # DATABASE_URL=postgresql://...
   npm run db:push
   ```
3. لا ترفع رابط الاتصال إلى Git — استخدم `.env` / `.env.production` (مُستبعدان) أو متغيرات Vercel.
4. إن ظهرت كلمة المرور في محادثة/لوق: أعد تدويرها من Neon فوراً.

---

## Vercel

### لماذا نُقل الكود إلى `server/`؟

Vercel يحوّل كل ملف `.ts` تحت `api/` إلى دالة serverless منفصلة (ويفشل TypeScript على المسارات `@db/*`). لذلك:

| المسار | الدور |
|--------|--------|
| `server/` | مصدر الـ API (Hono + tRPC) |
| `server/boot.ts` | تطبيق Hono + استماع Node (Docker / VPS) |
| `server/vercel.ts` | غلاف `hono/vercel` |
| `api/index.js` | يُولَّد أثناء `npm run build` — دالة واحدة لجميع `/api/*` |
| `dist/public/` | واجهة Vite الثابتة |
| `dist/boot.js` | خادم Node المجمّع لـ Docker |

### إعداد المشروع على Vercel

1. **Root Directory:** `app`
2. **Build Command:** `node scripts/vercel-build.mjs` (يكتب `.vercel/output` عبر Build Output API)
3. لا تعتمد على مجلد `api/` كمصدر — الدالة تُبنى في `.vercel/output/functions/api.func`
4. **Environment Variables** (Production + Preview إن لزم):

| المتغير | مطلوب |
|---------|--------|
| `DATABASE_URL` | نعم (Neon pooled) |
| `APP_ID` / `APP_SECRET` | نعم |
| `KIMI_AUTH_URL` / `KIMI_OPEN_URL` | نعم |
| `VITE_APP_ID` / `VITE_KIMI_AUTH_URL` | نعم (وقت البناء) |
| `APP_PUBLIC_URL` / `ALLOWED_ORIGINS` | نعم (نطاقك على HTTPS) |
| `OWNER_UNION_ID` | مُستحسن |
| `PASSWORD_LOGIN_EMAIL` / `PASSWORD_LOGIN_PASSWORD` | اختياري — دخول مشرف بالبريد بدون Kimi |
| `TRUST_PROXY` | `true` |

### حساب المشرف (دخول بالبريد)

| الحقل | القيمة |
|--------|--------|
| البريد | `admin@bhd.om` |
| كلمة المرور | `Admin@1234` |
| اتحاد المالك | `password:admin@bhd.om` |

متغيرات Vercel المطلوبة لنفس الحساب:

```
PASSWORD_LOGIN_EMAIL=admin@bhd.om
PASSWORD_LOGIN_PASSWORD=Admin@1234
OWNER_UNION_ID=password:admin@bhd.om
DATABASE_URL=postgresql://...neon.../neondb?sslmode=require
APP_SECRET=<32+ chars>
APP_PUBLIC_URL=https://nasab-mu.vercel.app
ALLOWED_ORIGINS=https://nasab-mu.vercel.app
```

إنشاء/تحديث صف المشرف في Neon:

```bash
cd app
npm run admin:ensure
```

فحص بعد النشر:

- `GET /api/health` → `{"ok":true,"dbConfigured":true,"dialect":"postgres"}`
- `GET /api/health?db=1` → `"db":"ok"` (يفحص Neon فعلياً)
- `GET /api/trpc/auth.config` → `passwordLogin: true`
- `POST /api/trpc/auth.loginLocal` ببريد المشرف → 200 + cookie
- `/login` يظهر حقول البريد وكلمة المرور

### إن فشل تسجيل الدخول (504 / مهلة)

1. في Vercel → Project → Settings → Environment Variables تأكد من وجود **`DATABASE_URL`** = رابط Neon **pooled** (`…-pooler.…?sslmode=require`).
2. أو من الجهاز (بعد `vercel login`):
   ```bash
   cd app
   npm run vercel:env
   ```
   ثم **Redeploy** للإنتاج.
3. على Vercel يُستخدم سائق Neon HTTP (`@neondatabase/serverless`) وليس TCP — لا حاجة لـ Render إذا اكتمل إعداد Neon + المتغيرات.

عند **504** على `/api/*` عموماً: تأكد أن البناء هو `node scripts/vercel-build.mjs` وأن الدالة تستخدم Node listener (`getRequestListener`).

---

```bash
cd app
npm run build:vercel-output   # أو: node scripts/vercel-build.mjs
npm run build:server          # Docker/VPS
```

---

## تشغيل بدون Docker

```bash
cd app
npm ci
export VITE_KIMI_AUTH_URL=...
export VITE_APP_ID=...
npm run build
npm run db:push
NODE_ENV=production npm run prod:check
npm start
```

---

## Webhooks الدفع

| البوابة | URL |
|--------|-----|
| Thawani | `https://yourdomain.com/api/webhooks/thawani` |
| Stripe | `https://yourdomain.com/api/webhooks/stripe` |
| PayPal | `https://yourdomain.com/api/webhooks/paypal` |
| إرجاع الدفع | `https://yourdomain.com/api/checkout/complete?invoice=...` |

سجّل هذه الروابط في لوحات البوابات بعد تفعيل كل بوابة.

---

## بعد الإطلاق (تشغيل تشغيلي)

1. ادخل بحسابك (أول دخول يصبح مشرفاً إن كان `OWNER_UNION_ID` فارغاً و`BOOTSTRAP_FIRST_ADMIN=true`).
2. أو عيّن مشرفاً يدوياً:
   ```bash
   node scripts/promote-admin.mjs --union-id=YOUR_ID
   # أو بعد معرفة الـ ID: node scripts/configure-launch.mjs --union-id=YOUR_ID --domain=https://yourdomain.com
   ```
3. `/admin/company` — شعار واسم الشركة للمستندات.
4. `/admin/plans` — تأكيد الأسعار والحدود.
5. `/admin/gateways` — راجع التحويل البنكي (بيانات `BANK_*` من `.env`) أو فعّل Thawani/Stripe بمفاتيح حية.
6. اختبر مسار شراء كامل: `/checkout?plan=plus`.

### ضبط الإطلاق بسرعة

```bash
cd app
node scripts/configure-launch.mjs --domain=https://yourdomain.com --union-id=YOUR_KIMI_UNION_ID --bank-name="..." --account-name="..." --account-number="..." --iban="OM..."
```

---

## ملاحظات أمان مفعّلة في الكود

- JWT في cookie `httpOnly` (+ `Secure` خلف HTTPS)
- OAuth `state` موقّع + `ALLOWED_ORIGINS`
- Rate limiting على login / OAuth / webhooks / الدعوات
- التحقق من توقيع webhooks للبوابات المدعومة
- Security headers
- `DEV_LOCAL_AUTH` معطّل تلقائياً عندما `NODE_ENV=production`
