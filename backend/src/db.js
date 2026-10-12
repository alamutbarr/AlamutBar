const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASS,
    {
        host: process.env.DB_HOST || 'localhost',
        dialect: 'mysql',
        logging: false, // برای اینکه کوئری‌ها ترمینال را شلوغ نکنند
    }
);

// تست اتصال به دیتابیس
sequelize.authenticate()
    .then(() => console.log('اتصال به دیتابیس با موفقیت انجام شد.'))
    .catch(err => console.error('خطا در اتصال به دیتابیس:', err));

module.exports = sequelize;