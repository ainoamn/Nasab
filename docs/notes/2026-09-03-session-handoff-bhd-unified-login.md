# حزمة تسليم — نَسَب × هوية BHD · 3 سبتمبر 2026

> للمتابعة من جهاز آخر: اسحب `main` من GitHub ثم اعمل من مجلد `app/`.  
> هذه المذكرة تلخّص **محادثة Cursor** الخاصة بربط نَسَب بالدخول الموحّد ومشغّل التطبيقات وتطبيق الدليل المرجعي.

## حالة المستودع

| البند | القيمة |
|---|---|
| المستودع | https://github.com/ainoamn/Nasab |
| الفرع | `main` (لا فرع وسيط — الدمج مباشرة على main) |
| آخر commit عند كتابة هذه الحزمة | `daf8455` — Record live publish of 9990320… |
| جذر التطبيق | `app/` (Root Directory على Vercel = `app`) |
| مشروع Vercel | `nasab` |
| الإنتاج | `https://nasab.bhd-om.com` · نسخة Vercel: `https://nasab-mu.vercel.app` |
| الهوية | `https://id.bhd-om.com` · `client_id=bhd-nasab` |
| دليل ONE-BHD (مصدر القواعد) | https://github.com/ainoamn/ONE-BHD · `docs/BHD-UNIFIED-LOGIN-AND-APPS.md` |

### أوامر البدء على الجهاز الآخر

```bash
git clone https://github.com/ainoamn/Nasab.git
# أو إن كان المستودع موجوداً:
cd Nasab
git pull origin main
cd app
npm install
# الأسرار من Vercel Encrypted — لا تُرفع إلى Git
```

بعد أي تغيير لاحق:

```bash
cd app && npm test && npx tsc -b
cd ..
git add -A   # تجنّب .vercel/ والمجلد العربي غير المتتبَّع
git commit -m "…"
git push origin main
# النشر من جذر المستودع (ليس من app/):
npx vercel --prod --yes
```

**لا ترفع:** `.vercel/` · المجلد المحلي `موقع shجره العائله/` · ملفات `.env` · أسرار.

---

## ماذا توحّد وماذا يبقى محلياً (عقد لا يُكسر)

| يوحَّد | يبقى في نَسَب فقط |
|---|---|
| الدخول عبر `id.bhd-om.com` | الأشجار، الأعضاء، الدعوات، GEDCOM |
| مشغّل التطبيقات (تسع نقاط) | فواتير نَسَب والخطط والكوبونات |
| `bhd_sub` = JWT `sub` | أدوار الشجرة + `users.role` المحلي |
| جلسة تنقّل عبر كوكي `bhd_id` على الهوية | كوكي المنتج `kimi_sid` Host-only |

- **لا** مشاركة `DATABASE_URL` مع الهوية.
- **لا** `Domain=.bhd-om.com` على أي كوكي.
- **لا** جوجل / كلمة مرور للمستخدم النهائي على واجهة نَسَب بعد SSO.
- **لا** أدمن موحّد من الهوية لكل المواقع. أدمن نَسَب = `users.role=admin` مربوط بـ `bhd_sub` فقط.

المراجع الإلزامية داخل المستودع:

- [`BHD-UNIFIED-LOGIN-AND-APPS.md`](./BHD-UNIFIED-LOGIN-AND-APPS.md) — خاصة §0.1 / 0.2 / 0.5 / 0.7 / 4.9 / **12.4**
- [`BHD-PRODUCT-SSO-ADMIN.md`](./BHD-PRODUCT-SSO-ADMIN.md)
- [`NASAB-BHD-SSO.md`](./NASAB-BHD-SSO.md)
- [`BHD-NASAB-INTEGRATION.md`](./BHD-NASAB-INTEGRATION.md)

---

## ما أُنجز في هذه المحادثة (مرتّب)

### 1) SSO + مشغّل (كان حياً قبل جولة أغسطس الأخيرة)
- `GET /api/auth/bhd/start|callback|logout` في `app/server/bhd/auth.ts`
- ربط مستخدم: `bhd_sub` ثم بريد موثّق `google:`/`password:` مع الإبقاء على الدور · وإلا مستخدم جديد `role=user`
- كتالوج `app/src/lib/bhd/apps.ts` · `BhdAppSwitcher` في `AppHeader`
- نَسَب في الكتالوج: `mode: "sso"`

### 2) خمول 48 ساعة (`0dd14ea` وما قبله داخل السلسلة)
- `Session.maxAgeMs` و JWT TTL = 48 ساعة
- `GET /api/auth/me` + `SessionKeepAlive` + تجديد في `auth.me`
- منع صريح لغير المشرف على `/admin`

### 3) القسم 0.7 / 4.9 — أدمن عبر SSO
- `GET /api/auth/admin-entry` → `start?returnTo=/admin`
- إزالة لوحة كلمة المرور من `/login`؛ `?admin=1` → `admin-entry`
- `callback` يمسح جلسة المنتج السابقة قبل الكوكي الجديدة
- فوتر «دخول الإدارة» → `admin-entry`

### 4) مطابقة 0.1 و 0.5 (`9990320`)
- فوتر «برامجنا» + روابط الشركة على `www.bhd-om.com`
- حبر `#092d24` · أخضر `#075c45` · رمل · IBM Plex Sans Arabic
- تعطيل جوجل وكلمة المرور المحلية عندما SSO جاهز
- مزامنة كتالوج المشغّل مع ONE-BHD

### 5) نشر وتوثيق (`daf8455`)
- رفع `main` · نشر Vercel · تحديث سجل 12.4 و`CHANGELOG`

---

## ملفات مهمة للرجوع السريع

| ملف | الدور |
|---|---|
| `app/server/bhd/auth.ts` | start / callback / logout |
| `app/server/admin-entry.ts` | دخول الإدارة |
| `app/server/auth-me.ts` | تجديد الجلسة |
| `app/server/queries/bhd-users.ts` | ربط `bhd_sub` |
| `app/src/pages/Login.tsx` | غلاف → الهوية فقط |
| `app/src/components/bhd/BhdSiteFooter.tsx` | فوتر المجموعة |
| `app/src/components/auth/SessionKeepAlive.tsx` | خمول منزلق |
| `app/src/lib/bhd/apps.ts` | كتالوج مجمّد للمشغّل |

---

## تحقق حي سريع (من الجهاز الآخر)

```bash
curl -sS https://nasab-mu.vercel.app/api/health
# توقّع: "build":"daf8455" أو أحدث SHA بعد نشر لاحق

curl -sSI https://nasab-mu.vercel.app/api/auth/bhd/start | findstr /i Location
# توقّع: Location: https://id.bhd-om.com/oauth/authorize?...

curl -sSI https://nasab-mu.vercel.app/api/auth/admin-entry | findstr /i Location
# توقّع: .../api/auth/bhd/start?returnTo=%2Fadmin
```

ملاحظة: من بعض الشبكات قد تنتهي مهلة `nasab.bhd-om.com` بينما `nasab-mu.vercel.app` يعمل — تحقق بالاثنين إن لزم.

---

## ماذا بقي / خطوات تالية مقترحة

1. **تعيين أدمن نَسَب لحسابك على الهوية:** بعد أول SSO بنفس البريد القديم يبقى `admin` إن كان الصف مربوطاً؛ وإلا عيّن `role=admin` في Neon على الصف ذي `bhd_sub` (ليس من شاشة الهوية).
2. اختبار قبول: دخول الهوية → نَسَب بلا كلمة مرور ثانية → `/admin` إن كنت أدمن محلياً → منتج ثانٍ بلا نموذج.
3. إن تغيّر كتالوج ONE-BHD: انسخ `apps.ts` مجدداً إلى نَسَب بعد قلب أي منتج إلى `sso`.
4. أي عمل لاحق على الهوية/البوابة: مستودع `ONE-BHD` منفصل — اسحبه أيضاً إن احتجت تحديث الدليل المرجعي.

---

## محادثة Cursor المرتبطة

- عنوان تقريبي: ربط نَسَب بالدخول الموحّد BHD وتطبيق الدليل.
- مسار المحادثة محلياً (على الجهاز الذي كُتبت فيه):  
  `C:\Users\ahami\.cursor\projects\c-dev-Nasab\agent-transcripts\578c38e1-5c04-4d2a-82a5-87398a0aa552`
- هذه المذكرة هي المصدر المعتمد داخل Git للمتابعة من الجهاز الثاني (نسخ نص المحادثة كاملاً إلى Git غير مطلوب وغير عملي).

---

## سجل commits ذات الصلة (من الأقدم للأحدث تقريباً)

| SHA | الموضوع |
|---|---|
| `be6e5f4` | Align Nasab with unified BHD login guide |
| `0dd14ea` | §0.7 admin-entry + 48h sliding sessions |
| `9990320` | §0.1 / 0.5 brand + footer + disable local Google |
| `daf8455` | Document live publish SHA |

اسحب دائماً `git pull origin main` قبل الاستكمال.
