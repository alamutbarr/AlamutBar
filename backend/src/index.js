const path = require('path');
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

const sequelize = require('./config/database');
const { dbConfig } = sequelize;

const app = express();
app.use(cors());
app.use(express.json());
app.get('/health', (_req, res) => res.json({ ok: true, service: 'alamut-bar' }));

const PORT = Number(process.env.PORT || 5000);

function isConnectionRefused(error) {
  const code = error?.code || error?.parent?.code || error?.original?.code;
  return code === 'ECONNREFUSED' || code === 'ENOTFOUND' || code === 'EAI_AGAIN';
}

async function ensureDatabase() {
  const name = dbConfig.name.replace(/[^a-zA-Z0-9_]/g, '');
  let connection;
  try {
    connection = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.pass,
    });
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
  } catch (error) {
    // A user who can use an existing database may not be allowed to create one.
    const code = error?.code;
    if (code === 'ER_DBACCESS_DENIED_ERROR' || code === 'ER_ACCESS_DENIED_ERROR' || error?.errno === 1044) {
      return;
    }
    throw error;
  } finally {
    if (connection) await connection.end().catch(() => {});
  }
}

async function start() {
  try {
    await ensureDatabase();

    // Models start the single sync. Requiring them before the database exists
    // makes that sync fail and the process exit before listen.
    // Legacy camelCase columns must be renamed first, otherwise sync tries to
    // index driver_id on a table that only has driverId.
    await require('./utils/legacyColumns')();
    const { syncPromise } = require('./models');
    app.use('/api/auth', require('./routes/auth'));
    app.use('/api/driver', require('./routes/driver'));
    app.use('/api/location', require('./routes/location'));
    app.use((req, res) => {
      res.status(404).json({ error: `مسیر پیدا نشد: ${req.method} ${req.path}` });
    });

    await syncPromise;
    await sequelize.authenticate();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`سرور الموت‌بار روی پورت ${PORT} در حال اجراست (دیتابیس ${dbConfig.name}، کاربر ${dbConfig.user})`);
    });
  } catch (error) {
    if (isConnectionRefused(error)) {
      console.error(
        [
          `به MySQL روی ${dbConfig.host}:${dbConfig.port} وصل نشدیم، برای همین سرور بالا نمی‌آید.`,
          'MySQL را روشن کنید و backend/.env را از روی backend/.env.example بسازید.',
        ].join('\n'),
      );
    } else if (error?.original?.code === 'ER_BAD_DB_ERROR' || error?.parent?.code === 'ER_BAD_DB_ERROR') {
      console.error(
        `دیتابیس ${dbConfig.name} وجود ندارد و این کاربر اجازهٔ ساخت آن را ندارد. دیتابیس را با یک کاربر مدیر بسازید یا DB_USER را در backend/.env عوض کنید.`,
      );
    } else if (error?.original?.errno === 1045 || error?.parent?.errno === 1045 || error?.original?.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error(
        [
          `MySQL ورود کاربر «${dbConfig.user || '(خالی)'}» روی ${dbConfig.host}:${dbConfig.port} را رد کرد.`,
          'در backend/.env مقدار DB_USER و DB_PASS را بنویسید.',
          'اگر رمز root خالی است: DB_USER=root و DB_PASS را خالی بگذارید.',
          'از localhost استفاده نکنید؛ DB_HOST=127.0.0.1 باشد.',
        ].join('\n'),
      );
    } else {
      console.error('خطا در راه‌اندازی دیتابیس:', error.message || error);
    }
    process.exit(1);
  }
}

start();
