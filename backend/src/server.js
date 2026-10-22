const express = require('express');
const cors = require('cors');
const path = require('path');
const mysql = require('mysql2/promise');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'alamut-owner-dev-secret-change-me';
}

const { sequelize, dbConfig } = require('./config/database');
const routes = require('./routes');
const { notFoundHandler, errorHandler } = require('./middlewares/errorMiddleware');
const seedVehicleTypes = require('./utils/seedVehicles');
const seedLocations = require('./utils/seedLocations');
const startReminderScheduler = require('./utils/scheduler');

const DRIVER_DATABASES = new Set(['alamut_bar', 'xbar_db']);

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'alamut-owner' });
});
app.use('/api', routes);
app.use(notFoundHandler);
app.use(errorHandler);

async function ensureDatabase() {
  const name = dbConfig.name.replace(/[^a-zA-Z0-9_]/g, '');
  const connection = await mysql.createConnection({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.pass,
  });
  await connection.query(
    `CREATE DATABASE IF NOT EXISTS \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );
  await connection.end();
}

const startServer = async () => {
  if (DRIVER_DATABASES.has(dbConfig.name)) {
    console.error(
      [
        `DB_NAME الان «${dbConfig.name}» است و آن دیتابیس مال پنل راننده است.`,
        'پنل صاحب کالا را روی همان دیتابیس اجرا نکنید؛ جدول shipments هر دو پنل یکی نیست.',
        'در backend/.env این مقدار را بگذارید: DB_NAME=alamut_owner',
      ].join('\n'),
    );
    process.exit(1);
  }

  try {
    await ensureDatabase();
    await sequelize.authenticate();
    console.log(`به MySQL وصل شد (${dbConfig.name}، کاربر ${dbConfig.user}).`);

    await sequelize.sync({ alter: true });
    console.log('جدول‌های پنل صاحب کالا همگام شدند.');

    await seedVehicleTypes();
    await seedLocations();

    const PORT = Number(process.env.PORT || 5000);
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`سرور صاحب کالا روی پورت ${PORT} در حال اجراست`);
    });

    startReminderScheduler();
  } catch (error) {
    const errno = error?.original?.errno || error?.parent?.errno || error?.errno;
    if (errno === 1045 || error?.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error(
        `MySQL ورود کاربر «${dbConfig.user || '(خالی)'}» روی ${dbConfig.host}:${dbConfig.port} را رد کرد. DB_USER و DB_PASSWORD را در backend/.env بگذارید.`,
      );
    } else {
      console.error('راه‌اندازی دیتابیس ناموفق بود:', error.message || error);
    }
    process.exit(1);
  }
};

startServer();
