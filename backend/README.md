# بک‌اند پنل راننده

Express و Sequelize روی MySQL. سه جدول:

- `drivers` مشخصات راننده و خودروی او (پلاک، کشنده، گاری، مشخصات فنی)
- `shipments` بارها و مأموریت‌ها. ستون‌ها snake_case هستند (`origin_city_id`, `tracking_code`)
- `owners` صاحب کالا؛ `owner_id` روی بار اختیاری است

نام ستون‌ها در دیتابیس snake_case است و در کد جاوااسکریپت camelCase.

```bash
cp .env.example .env
npm install
npm run dev
```

در `.env` اگر رمز root خالی است `DB_USER=root` و `DB_PASS` خالی بماند. `DB_HOST` را `127.0.0.1` بگذارید.

سلامت سرویس: `GET /health`
