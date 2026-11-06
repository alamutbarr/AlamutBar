const notFoundHandler = (req, res) => {
  res.status(404).json({ success: false, message: 'مسیر مورد نظر یافت نشد.' });
};

// خطاهای شناخته‌شده‌ی Sequelize را به پیام‌های قابل‌فهم فارسی تبدیل می‌کند
// تا هیچ‌وقت خطای خام SQL/درایور به کاربر نهایی نشت نکند
function mapSequelizeError(err) {
  switch (err.name) {
    case 'SequelizeUniqueConstraintError': {
      const field = err.errors?.[0]?.path;
      const fieldLabels = { phone_number: 'این شماره موبایل', tracking_code: 'این کد پیگیری' };
      const label = fieldLabels[field] || 'این مقدار';
      return { statusCode: 409, message: `${label} قبلاً در سیستم ثبت شده است.` };
    }
    case 'SequelizeForeignKeyConstraintError':
      return { statusCode: 400, message: 'یکی از مقادیر انتخابی (مثلاً شهر، محدوده یا نوع خودرو) نامعتبر است.' };
    case 'SequelizeValidationError':
      return {
        statusCode: 400,
        message: 'اطلاعات ورودی معتبر نیستند.',
        errors: err.errors?.map((e) => e.message),
      };
    case 'SequelizeDatabaseError':
      return { statusCode: 500, message: 'خطا در ارتباط با پایگاه داده. لطفاً دوباره تلاش کنید.' };
    case 'SequelizeConnectionError':
    case 'SequelizeConnectionRefusedError':
      return { statusCode: 503, message: 'اتصال به پایگاه داده برقرار نشد. لطفاً کمی بعد دوباره تلاش کنید.' };
    default:
      return null;
  }
}

// خطاهای رایج آپلود فایل (multer) را هم پیام‌دار می‌کند
function mapMulterError(err) {
  if (err.name !== 'MulterError') return null;
  const messages = {
    LIMIT_FILE_SIZE: 'حجم فایل بیشتر از حد مجاز است.',
    LIMIT_FILE_COUNT: 'تعداد فایل‌ها بیشتر از حد مجاز است.',
    LIMIT_UNEXPECTED_FILE: 'تعداد یا نوع فایل ارسالی مجاز نیست.',
  };
  return { statusCode: 400, message: messages[err.code] || 'بارگذاری فایل با خطا مواجه شد.' };
}

// هندلر متمرکز خطا - همه‌ی throwها (از سرویس‌ها یا asyncHandler) اینجا جمع می‌شوند
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  const sequelizeMapped = mapSequelizeError(err);
  if (sequelizeMapped) {
    console.error('❌ Database error:', err.name, '-', err.message);
    return res.status(sequelizeMapped.statusCode).json({
      success: false,
      message: sequelizeMapped.message,
      ...(sequelizeMapped.errors ? { errors: sequelizeMapped.errors } : {}),
    });
  }

  const multerMapped = mapMulterError(err);
  if (multerMapped) {
    return res.status(multerMapped.statusCode).json({ success: false, message: multerMapped.message });
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'ساختار درخواست ارسالی نامعتبر است.' });
  }

  const statusCode = err.statusCode || 500;
  const payload = { success: false, message: err.message || 'خطای داخلی سرور.' };
  if (err.code) payload.code = err.code;

  if (!err.isOperational) {
    console.error('❌ Unexpected error:', err);
  }

  res.status(statusCode).json(payload);
};

module.exports = { notFoundHandler, errorHandler };
