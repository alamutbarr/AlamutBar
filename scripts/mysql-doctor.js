const path = require('path');
const mysql = require('mysql2/promise');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { sequelize, dbConfig } = require('../src/server/config/database');
const { formatMysqlStartupError, printMysqlStartupError } = require('../src/server/db/mysqlErrors');

async function duplicateIndexes(connection, schema) {
  const [rows] = await connection.query(
    `SELECT TABLE_NAME AS tableName,
            COLUMN_NAME AS columnName,
            COUNT(DISTINCT INDEX_NAME) AS indexCount
     FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = ? AND INDEX_NAME != 'PRIMARY'
     GROUP BY TABLE_NAME, COLUMN_NAME
     HAVING indexCount > 1
     ORDER BY TABLE_NAME, COLUMN_NAME`,
    [schema],
  );
  return rows;
}

async function main() {
  console.log(`بررسی MySQL روی ${dbConfig.host}:${dbConfig.port} با کاربر ${dbConfig.user}...`);
  let connection;
  try {
    connection = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.pass,
      connectTimeout: 5000,
    });
  } catch (error) {
    printMysqlStartupError(formatMysqlStartupError({ error, dbConfig }));
    await sequelize.close().catch(() => {});
    process.exitCode = 1;
    return;
  }

  try {
    const [versionRows] = await connection.query('SELECT VERSION() AS version');
    console.log(`متصل شد. نسخه: ${versionRows[0].version}`);
    const [databases] = await connection.query('SHOW DATABASES');
    const names = databases.map((row) => row.Database || row.database);
    console.log(`دیتابیس‌ها: ${names.join(', ')}`);
    if (!names.includes(dbConfig.name)) {
      console.log(`دیتابیس «${dbConfig.name}» هنوز نیست؛ با npm run dev ساخته می‌شود.`);
      return;
    }

    const dupes = await duplicateIndexes(connection, dbConfig.name);
    if (dupes.length) {
      console.warn('ایندکس تکراری پیدا شد. DB_SYNC_ALTER را روشن نکنید؛ همین ALTERها MySQL زمپ را خوابانده‌اند.');
      for (const row of dupes) {
        console.warn(`  ${row.tableName}.${row.columnName} × ${row.indexCount}`);
      }
    } else {
      console.log(`ایندکس تکراری در «${dbConfig.name}» نیست. MySQL آماده اجرای پروژه است.`);
    }
  } finally {
    await connection.end();
    await sequelize.close().catch(() => {});
  }
}

main().catch((error) => {
  printMysqlStartupError(formatMysqlStartupError({ error, dbConfig }));
  process.exitCode = 1;
});
