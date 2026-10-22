# پنل صاحب کالا

فرانت React و بک‌اند Express. دیتابیس این پنل `alamut_owner` است و با `alamut_bar` پنل راننده یکی نیست.

## چرا `joi` و `leaflet` پیدا نمی‌شد

این بسته‌ها در `package.json` هستند. بعد از `git checkout Owners-panel` پوشهٔ `node_modules` هنوز مال پنل راننده است و باید دوباره نصب شود.

```bash
cd backend
npm install
copy .env.example .env
npm run dev
```

```bash
cd frontend
npm install
npm run dev
```

اگر `backend/.env` را از پنل راننده کپی کرده‌اید، `DB_NAME` را به `alamut_owner` عوض کنید. `DB_PASSWORD` و `DB_PASS` هر دو پذیرفته می‌شوند.

- پنل: http://127.0.0.1:5173
- API: http://127.0.0.1:5000/health

کد تأیید در حالت توسعه داخل پاسخ درخواست OTP برمی‌گردد و در ترمینال بک‌اند هم چاپ می‌شود.
