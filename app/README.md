# نَسَب — تطبيق الويب

التشغيل والنشر موثّقان في:

- [`../README.md`](../README.md) — نظرة عامة وهيكل المشروع
- [`DEPLOY.md`](./DEPLOY.md) — Docker / VPS / **Vercel + Neon**

## أوامر سريعة

```bash
npm install
cp .env.example .env
npm run db:push
npm run dev          # http://localhost:5173
```

```bash
npm run build        # واجهة + dist/boot.js + api/index.js
npm start            # خادم Node للإنتاج (بعد ضبط .env.production)
```

## البنية

- `src/` — واجهة React
- `server/` — API (Hono + tRPC)
- `db/` — Drizzle schemas (SQLite / MySQL / PostgreSQL)
- `api/` — مخرجات Vercel فقط (`index.js` مولَّد، لا تضع مصدراً هنا)
