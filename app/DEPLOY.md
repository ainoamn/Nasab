# نشر نَسَب (Nasab) — دليل الإطلاق

## جاهزية الإطلاق (Checklist)

### إلزامي قبل فتح الموقع للجمهور

1. انسخ `app/.env.production.example` → `.env` واملأ كل القيم.
2. أنشئ `APP_SECRET` قوياً (≥ 32 حرفاً):
   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```
3. MySQL جاهز و`DATABASE_URL` يشير إليه (ليس SQLite).
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
DATABASE_URL=mysql://user:pass@host:3306/nasab
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

1. ادخل بحسابك الذي يطابق `OWNER_UNION_ID` → تصبح مشرفاً.
2. `/admin/company` — شعار واسم الشركة للمستندات.
3. `/admin/plans` — تأكيد الأسعار والحدود.
4. `/admin/gateways` — تفعيل بوابة + مفاتيح حية (ليس UAT إن أمكن).
5. اختبر مسار شراء كامل: `/checkout?plan=plus`.

---

## ملاحظات أمان مفعّلة في الكود

- JWT في cookie `httpOnly` (+ `Secure` خلف HTTPS)
- OAuth `state` موقّع + `ALLOWED_ORIGINS`
- Rate limiting على login / OAuth / webhooks / الدعوات
- التحقق من توقيع webhooks للبوابات المدعومة
- Security headers
- `DEV_LOCAL_AUTH` معطّل تلقائياً عندما `NODE_ENV=production`
