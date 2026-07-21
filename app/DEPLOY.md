# نشر نَسَب (Nasab)

## قبل النشر (إلزامي)

1. **أمان الدفع**: ربط جلسة الدفع برقم الفاتورة + التحقق من توقيع webhooks (Stripe / PayPal / Thawani).
2. **OAuth**: `state` موقّع لـ Google و Kimi + `ALLOWED_ORIGINS` لمنع open redirect.
3. **قاعدة البيانات**: MySQL في الإنتاج — `npm run db:push` أو `npm run db:migrate` بعد `db:generate`.
4. **أسرار الإنتاج**: `APP_SECRET` قوي، `DATABASE_URL`، مفاتيح Kimi/Google، `OWNER_UNION_ID`.
5. **Build**: مرّر `VITE_KIMI_AUTH_URL` و `VITE_APP_ID` عند `npm run build`.
6. **HTTPS**: إلزامي — cookies الجلسة تستخدم `Secure` + `SameSite=None` خلف HTTPS.
7. **Proxy**: `TRUST_PROXY=true` خلف nginx/Caddy/Cloudflare فقط.
8. **Rate limiting**: login، OAuth، webhooks، الدعوات (مفعّل في الكود).

## متغيرات البيئة (إنتاج)

```env
NODE_ENV=production
PORT=3000
APP_ID=...
APP_SECRET=...                    # 32+ bytes random
DATABASE_URL=mysql://...
APP_PUBLIC_URL=https://yourdomain.com
TRUST_PROXY=true
ALLOWED_ORIGINS=https://yourdomain.com
KIMI_AUTH_URL=...
KIMI_OPEN_URL=...
OWNER_UNION_ID=...
GOOGLE_CLIENT_ID=...              # optional
GOOGLE_CLIENT_SECRET=...
```

## Build & تشغيل

```bash
cd app
npm ci
export VITE_KIMI_AUTH_URL=...
export VITE_APP_ID=...
npm run build
npm run db:push    # or db:migrate on MySQL
npm start
```

## Docker

```bash
cd app
docker compose up -d --build
```

- التطبيق: المنفذ `3000`
- MySQL: المنفذ `3306` (محلي)
- عدّل `.env` قبل التشغيل

## Webhooks الدفع

| البوابة | URL |
|--------|-----|
| Thawani | `https://yourdomain.com/api/webhooks/thawani` |
| Stripe | `https://yourdomain.com/api/webhooks/stripe` |
| PayPal | `https://yourdomain.com/api/webhooks/paypal` |
| إرجاع الدفع | `https://yourdomain.com/api/checkout/complete?invoice=...` |

## الصحة والمراقبة

- `GET /api/health` — فحص جاهزية الخادم
- لا تستخدم endpoint عام للـ ping عبر tRPC

## بعد الإطلاق (موصى به)

- تطبيق خصوصية الأفراد بين أعضاء الشجرة (مفعّل جزئياً)
- تقليل مدة JWT + إبطال الجلسة عند logout (7 أيام + `sessionVersion`)
- سجل تدقيق المشرف (`admin_audit_logs`)
- اختبارات: `npm test`
