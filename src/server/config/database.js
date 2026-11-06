const path = require('path');
const { Sequelize } = require('sequelize');
const { normalizeDbHost } = require('../db/mysqlErrors');

require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

function env(name, fallback) {
  const value = process.env[name];
  if (value === undefined || String(value).trim() === '') return fallback;
  return String(value).trim();
}

const dbConfig = {
  name: env('DB_NAME', 'alamut'),
  user: env('DB_USER', 'root'),
  pass: process.env.DB_PASSWORD !== undefined
    ? process.env.DB_PASSWORD
    : (process.env.DB_PASS !== undefined ? process.env.DB_PASS : ''),
  host: normalizeDbHost(env('DB_HOST', '127.0.0.1')),
  port: parseInt(env('DB_PORT', '3306'), 10),
};

const sequelize = new Sequelize(dbConfig.name, dbConfig.user, dbConfig.pass, {
  host: dbConfig.host,
  port: dbConfig.port,
  dialect: 'mysql',
  logging: false,
  dialectOptions: {
    connectTimeout: 15000,
    charset: 'utf8mb4',
  },
  define: {
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
  },
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

module.exports = { sequelize, dbConfig };
