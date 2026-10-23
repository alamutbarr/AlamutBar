const path = require('path');
const { Sequelize } = require('sequelize');

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
  host: env('DB_HOST', '127.0.0.1'),
  port: parseInt(env('DB_PORT', '3306'), 10),
};

const sequelize = new Sequelize(dbConfig.name, dbConfig.user, dbConfig.pass, {
  host: dbConfig.host,
  port: dbConfig.port,
  dialect: 'mysql',
  logging: false,
});

module.exports = { sequelize, dbConfig };
