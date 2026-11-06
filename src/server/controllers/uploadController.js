const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');
const AppError = require('../utils/AppError');

// آپلود عکس‌های کالا (حداکثر ۴ فایل) - مرحله عکس فرم ثبت بار
const uploadPhotos = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    throw new AppError('هیچ فایلی ارسال نشد.', 400);
  }
  const urls = req.files.map((file) => `/uploads/${file.filename}`);
  success(res, { statusCode: 201, message: 'تصاویر با موفقیت بارگذاری شدند.', data: { urls } });
});

// آپلود حداکثر ۱۰ عکس مدرک برای شکایت / گزارش تخلف
const uploadEvidence = asyncHandler(async (req, res) => {
  const files = Array.isArray(req.files) && req.files.length
    ? req.files
    : (req.file ? [req.file] : []);
  if (!files.length) {
    throw new AppError('فایلی ارسال نشد.', 400);
  }
  const urls = files.slice(0, 10).map((file) => `/uploads/${file.filename}`);
  success(res, {
    statusCode: 201,
    message: urls.length > 1 ? 'مدارک با موفقیت بارگذاری شدند.' : 'مدرک با موفقیت بارگذاری شد.',
    data: { urls, url: urls[0] },
  });
});

module.exports = { uploadPhotos, uploadEvidence };
