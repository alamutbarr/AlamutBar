const path = require('path');
const express = require('express');
const cors = require('cors');

// Load the backend-local environment file regardless of which folder the command is run from.
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const sequelize = require('./db');
require('./models/Driver');
const authRoutes = require('./routes/auth');
const driverRoutes = require('./routes/driver');

const app = express();
app.use(cors());
app.use(express.json());
app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/driver', driverRoutes);

app.use((req, res) => {
  res.status(404).json({ error: `مسیر پیدا نشد: ${req.method} ${req.path}` });
});

const PORT = process.env.PORT || 5000;

// تغییر مهم: alter را به false تغییر دادیم تا از ساخت ایندکس‌های تکراری جلوگیری شود
sequelize.sync({ alter: false })
  .then(() => {
    console.log('جداول دیتابیس همگام‌سازی شدند.');
    app.listen(PORT, () => console.log(`سرور روی پورت ${PORT} در حال اجراست`));
  })
  .catch((error) => {
    console.error('خطا در همگام‌سازی دیتابیس:', error);
    process.exitCode = 1;
  });