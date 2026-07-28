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
| `PASSWORD_LOGIN_PASSWORD` | كلمة قوية — أو `npm run admin:rotate` |
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
| متوسطة | نسخ احتياطي Neon مجدول | ✅ `Ops` workflow + سر `DATABASE_URL` |
| منخفضة | نطاق مخصص + بريد معاملاتي | لاحقاً |

### أوامر الإطلاق السريعة

```bash
cd app
npm run db:verify-neon
npm run vercel:print-env   # انسخ القيم إلى Vercel ثم Redeploy
npm run prod:smoke
```

---

## المرحلة 5 — واجهة الجاهزية + نسخ احتياطي (منفَّذة)

| البند | الحالة |
|--------|--------|
| صفحة `/setup` بفحص `/api/diag` | ✅ |
| رابط من `/login` عند غياب القاعدة | ✅ |
| `npm run db:backup-neon` | ✅ → `.data/backups/` |
| CI smoke اختياري على GitHub Actions | ✅ |

---

## المرحلة 6 — بصمة البناء + حالة الإطلاق (منفَّذة)

| البند | الحالة |
|--------|--------|
| `NASAB_BUILD_SHA` / `NASAB_BUILD_TIME` في دالة Vercel | ✅ |
| `/api/health` و`/api/diag` يعرضان `build` | ✅ |
| رابط جاهزية من تذييل الرئيسية | ✅ |
| `npm run launch:status` (Neon محلي + smoke حي) | ✅ |

---

## المرحلة 11 — نواقص توأم + تدوير كلمة المرور (منفَّذة)

| البند | الحالة |
|--------|--------|
| فجوة `possibleTwin` للإخوة الأشقاء بنفس سنة الميلاد | ✅ |
| شارة توأم في قالب الكتاب | ✅ |
| `npm run admin:rotate` لتوليد/كتابة كلمة مرور الدخول | ✅ |

---

## المرحلة 10 — ترتيب مخطط مستقر + Ops مجدول (منفَّذة)

| البند | الحالة |
|--------|--------|
| `comparePeopleByBirth` في FamilyChart / print / Descendants | ✅ |
| شارة نوع التوأم في TwinFamilyPanel | ✅ |
| GitHub Actions يومي: `prod:smoke` + `db:backup-neon` | ✅ `.github/workflows/ops.yml` |
| توثيق النسخ والـ GEDCOM في DEPLOY | ✅ |

---

## المرحلة 9 — دورة توائم GEDCOM (منفَّذة)

| البند | الحالة |
|--------|--------|
| تصدير `_TGID` + `ASSO/RELA twin` | ✅ |
| استيراد ودمج مجموعات التوائم | ✅ |
| `importGedcom` يطبّق `twinGroupId` | ✅ |
| اختبارات round-trip | ✅ |

---

## المرحلة 8 — توائم وترتيب + صقل الإطلاق (منفَّذة)

| البند | الحالة |
|--------|--------|
| ترتيب ميلاد مستقر (`comparePeopleByBirth`) | ✅ |
| تمييز توأم مختلط + اختبارات | ✅ |
| شريط العائلة المباشرة يعرض تسمية التوأم | ✅ |
| نموذج دخول مع Enter + تعطيل عند غياب القاعدة | ✅ |
| `/api/diag` بدون كشف البريد — أعلام حضور فقط | ✅ |
| نسخ أوامر Vercel من `/setup` | ✅ |

---

## المرحلة 7 — بعد ربط القاعدة (مخطَّطة)

| الأولوية | البند | الحالة |
|----------|--------|--------|
| عالية | تدوير كلمة مرور المشرف بعد أول دخول ناجح | ✅ `npm run admin:rotate` (ثم حدّث Vercel) |
| عالية | إنشاء شجرة تجريبية والتحقق من الحفظ على الإنتاج | معلّق على Vercel DB |
| متوسطة | نسخ Neon مجدول | ✅ `ops.yml` |
| متوسطة | نطاق مخصص + شهادة HTTPS | لاحقاً |
| منخفضة | بريد معاملاتي للدعوات | لاحقاً |

---

## معيار نجاح الإطلاق

- [x] Neon يحتوي الجداول والمشرف والخطط
- [x] الكود مرفوع على `main` مع توثيق
- [x] بصمة البناء + `/setup` + `launch:status`
- [x] ترتيب توائم مستقر + صقل الدخول/التشخيص
- [x] دورة توائم GEDCOM (تصدير/استيراد)
- [x] ترتيب مخطط/طباعة مستقر + Ops مجدول
- [x] اقتراح توأم محتمل + تدوير كلمة مرور المشرف
- [ ] `/api/diag` على الإنتاج: `dbConfigured: true` ← **إجراء يدوي على Vercel**
- [ ] تسجيل دخول ناجح من `/login`
- [ ] إنشاء شجرة وحفظ شخص في الإنتاج
