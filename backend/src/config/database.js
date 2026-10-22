const path = require('path');
const { Sequelize } = require('sequelize');

require('dotenv').config({ path: path.join(__dirname, '../../.env') });

function env(name, fallback) {
  const value = process.env[name];
  if (value === undefined) return fallback;
  const trimmed = String(value).trim();
  return trimmed === '' ? fallback : trimmed;
}

const dbConfig = {
  name: env('DB_NAME', 'alamut_bar'),
  user: env('DB_USER', 'root'),
  pass: process.env.DB_PASS === undefined ? '' : process.env.DB_PASS,
  host: env('DB_HOST', '127.0.0.1'),
  port: parseInt(env('DB_PORT', '3306'), 10),
};

const sequelize = new Sequelize(dbConfig.name, dbConfig.user, dbConfig.pass, {
  host: dbConfig.host,
  port: dbConfig.port,
  dialect: 'mysql',
  logging: false,
  define: {
    // Every camelCase attribute is stored as snake_case (phoneNumber -> phone_number).
    underscored: true,
  },
});

sequelize.dbConfig = dbConfig;

module.exports = sequelize;
