const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const mysql = require('mysql2/promise');

require('dotenv').config({ path: path.join(__dirname, '../../.env') });

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'alamut-owner-dev-secret-change-me';
}

const { sequelize, dbConfig } = require('./config/database');
const routes = require('./routes');
const { notFoundHandler, errorHandler } = require('./middlewares/errorMiddleware');
const seedVehicleTypes = require('./utils/seedVehicles');
const seedLocations = require('./utils/seedLocations');
const startReminderScheduler = require('./utils/scheduler');
const { attachChat } = require('./websocket');
const { attachAdminSocket } = require('./admin/realtime');
const { bootstrapAdmin } = require('./admin/bootstrap');

const DRIVER_DATABASES = new Set(['alamut_bar', 'xbar_db']);

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'alamut' });
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
        `DB_NAME الان «${dbConfig.name}» است. پروژهٔ یکپارچه روی دیتابیس تازه‌ای به نام alamut بالا می‌آید.`,
        'دیتابیس‌های قبلی پنل‌ها دست نمی‌خورند.',
        'در .env این مقدار را بگذارید: DB_NAME=alamut',
      ].join('\n'),
    );
    process.exit(1);
  }

  try {
    await ensureDatabase();
    await sequelize.authenticate();
    console.log(`به MySQL وصل شد (${dbConfig.name}، کاربر ${dbConfig.user}).`);

    await sequelize.sync({ alter: true });
    console.log('جدول‌های مشترک همگام شدند.');

    await seedVehicleTypes();
    await seedLocations();
    await bootstrapAdmin();

    const PORT = Number(process.env.PORT || 5088);
    const server = http.createServer(app);
    const chatSockets = attachChat();
    const adminSockets = attachAdminSocket();
    server.on('upgrade', (request, socket, head) => {
      let pathname = '';
      try {
        pathname = new URL(request.url, 'http://127.0.0.1').pathname;
      } catch {
        socket.destroy();
        return;
      }
      const target = pathname === '/ws' ? chatSockets : pathname === '/ws/admin' ? adminSockets : null;
      if (!target) {
        socket.destroy();
        return;
      }
      target.handleUpgrade(request, socket, head, (ws) => {
        target.emit('connection', ws, request);
      });
    });
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`سرور الموت روی پورت ${PORT} در حال اجراست`);
    });

    startReminderScheduler();
  } catch (error) {
    const errno = error?.original?.errno || error?.parent?.errno || error?.errno;
    if (errno === 1045 || error?.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error(
        `MySQL ورود کاربر «${dbConfig.user || '(خالی)'}» روی ${dbConfig.host}:${dbConfig.port} را رد کرد. DB_USER و DB_PASS را در .env بگذارید.`,
      );
    } else {
      console.error('راه‌اندازی دیتابیس ناموفق بود:', error.message || error);
    }
    process.exit(1);
  }
};

startServer();
