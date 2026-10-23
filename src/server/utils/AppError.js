// کلاس خطای سفارشی برای تفکیک خطاهای شناخته‌شده (قابل نمایش به کاربر) از خطاهای غیرمنتظره
class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

module.exports = AppError;
