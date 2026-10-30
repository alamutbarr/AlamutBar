const express = require('express');
const cors = require('cors');
const http = require('http');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

require('dotenv').config({ path: path.join(__dirname, '../../.env') });

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'alamut-owner-dev-secret-change-me';
}

const { sequelize, dbConfig } = require('./config/database');
const routes = require('./routes');
const { notFoundHandler, errorHandler } = require('./middleware/errorMiddleware');
const seedVehicleTypes = require('./utils/seedVehicles');
const seedLocations = require('./utils/seedLocations');
const startReminderScheduler = require('./utils/scheduler');
const { attachChat } = require('./websocket');
const { attachAdminSocket } = require('./admin/realtime');
const { bootstrapAdmin } = require('./admin/bootstrap');
const { formatMysqlStartupError, printMysqlStartupError } = require('./db/mysqlErrors');
const { syncSchema } = require('./db/syncSchema');
const { applySchemaPatches } = require('./db/schemaPatches');
require('./models');

const DRIVER_DATABASES = new Set(['alamut_bar', 'xbar_db']);

const app = express();

app.use(cors({ exposedHeaders: ['Content-Disposition', 'Content-Length'] }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'alamut' });
});
app.use('/api', routes);

const distDir = path.join(__dirname, '..', '..', 'dist');
const distIndex = path.join(distDir, 'index.html');
if (fs.existsSync(distIndex)) {
  app.use(express.static(distDir, { index: false }));
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path === '/health') return next();
    res.sendFile(distIndex);
  });
}

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

    await applySchemaPatches(sequelize);
    const { alter } = await syncSchema(sequelize);
    console.log(alter
      ? 'جدول‌های مشترک با ALTER همگام شدند. DB_SYNC_ALTER را بعد از این اجرا خاموش کنید.'
      : 'جدول‌های مشترک همگام شدند (بدون ALTER روی هر راه‌اندازی).');

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
    printMysqlStartupError(formatMysqlStartupError({ error, dbConfig }));
    process.exit(1);
  }
};

startServer();
