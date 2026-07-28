# خطة الترقية والتطوير — نَسَب (Nasab)

تاريخ التنفيذ: 2026-07-28  
المستودع: [github.com/ainoamn/Nasab](https://github.com/ainoamn/Nasab)  
الموقع: [nasab-mu.vercel.app](https://nasab-mu.vercel.app)

---

## الهدف

ربط الإنتاج بقاعدة **Neon PostgreSQL** الحقيقية، تثبيت الدخول، ورفع جاهزية الإطلاق.

---

## المرحلة 1 — قاعدة البيانات الحقيقية (Neon) ✅ منفَّذة محلياً

| الفحص | الحالة |
|--------|--------|
| اتصال Neon pooled (eu-west-2) | ✅ |
| 18 جدولاً في `public` | ✅ |
| مشرف `admin@bhd.om` / `password:admin@bhd.om` | ✅ |
| خطط الاشتراك (3) | ✅ بعد `npm run db:seed-neon` |
| بوابات الدفع (5) | ✅ |
| `npm run db:verify-neon` | ✅ كلها ناجحة |

أوامر التحقق:

```bash
cd app
npm run db:verify-neon
npm run admin:ensure
npm run db:seed-neon
```

---

## المرحلة 2 — ربط Vercel بالقاعدة ⚠️ يحتاج إجراء منك

`/api/diag` على الإنتاج يظهر حالياً:

```json
{ "dbConfigured": false, "hasAppSecret": false, "sidecar": true }
```

يعني الكود جاهز (sidecar موجود) لكن **متغيرات البيئة غير مضبوطة على Vercel**.

### نفّذ الآن (دقيقتان)

1. سجّل دخول CLI:
   ```bash
   cd app
   vercel login
   vercel link   # Root Directory = app
   npm run vercel:env
   ```
2. أو من لوحة Vercel → Settings → Environment Variables (Production):

| المتغير | القيمة |
|---------|--------|
| `DATABASE_URL` | رابط Neon **pooled** من `.env.production` |
| `APP_SECRET` | ≥ 32 حرفاً (يُولَّد تلقائياً عبر `vercel:env`) |
| `PASSWORD_LOGIN_EMAIL` | `admin@bhd.om` |
| `PASSWORD_LOGIN_PASSWORD` | `Admin@1234` |
| `OWNER_UNION_ID` | `password:admin@bhd.om` |
| `APP_PUBLIC_URL` | `https://nasab-mu.vercel.app` |
| `ALLOWED_ORIGINS` | `https://nasab-mu.vercel.app` |
| `TRUST_PROXY` | `true` |

3. **Redeploy** للإنتاج.
4. تحقق: `https://nasab-mu.vercel.app/api/diag` → `dbConfigured: true`
5. دخول: `/login` → `admin@bhd.om` / `Admin@1234`

---

## المرحلة 3 — ترقيات المنتج (منفَّذة في هذا الإطلاق)

1. دخول عبر `POST /api/auth/password-login` (Hono) بدل tRPC input الذي يعلّق على Vercel.
2. Sidecar `db-pg.cjs` (Neon HTTP) يُحمَّل فقط عند الحاجة.
3. `/api/diag` لفحص الربط بدون كشف أسرار.
4. تنبيه في صفحة `/login` إذا القاعدة غير مربوطة.
5. سكربتات: `db:verify-neon`، `db:seed-neon`، `vercel:env`.

---

## المرحلة 4 — ترقية مستمرة (جارية)

| الأولوية | البند | الحالة |
|----------|--------|--------|
| عالية | تفعيل `DATABASE_URL` على Vercel | ⚠️ يدوي — `npm run vercel:print-env` ثم الصق في اللوحة |
| عالية | إصلاح قراءة جسم POST على Vercel | ✅ `shouldAddHelpers: false` + form-urlencoded |
| متوسطة | فحص دخان للإنتاج | ✅ `npm run prod:smoke` |
| متوسطة | نسخ احتياطي Neon مجدول | لاحقاً |
| منخفضة | نطاق مخصص + بريد معاملاتي | لاحقاً |

### أوامر الإطلاق السريعة

```bash
cd app
npm run db:verify-neon
npm run vercel:print-env   # انسخ القيم إلى Vercel ثم Redeploy
npm run prod:smoke
```

---

## معيار نجاح الإطلاق

- [x] Neon يحتوي الجداول والمشرف والخطط
- [x] الكود مرفوع على `main` مع توثيق
- [ ] `/api/diag` على الإنتاج: `dbConfigured: true`
- [ ] تسجيل دخول ناجح من `/login`
- [ ] إنشاء شجرة وحفظ شخص في الإنتاج
