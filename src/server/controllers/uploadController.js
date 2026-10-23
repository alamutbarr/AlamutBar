const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');
const AppError = require('../utils/AppError');

// آپلود عکس‌های کالا (حداکثر ۵ فایل) - مرحله ۵ فرم ثبت بار
const uploadPhotos = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    throw new AppError('هیچ فایلی ارسال نشد.', 400);
  }
  const urls = req.files.map((file) => `/uploads/${file.filename}`);
  success(res, { statusCode: 201, message: 'تصاویر با موفقیت بارگذاری شدند.', data: { urls } });
});

// آپلود یک فایل مدرک برای شکایت / گزارش تخلف
const uploadEvidence = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError('فایلی ارسال نشد.', 400);
  }
  success(res, {
    statusCode: 201,
    message: 'مدرک با موفقیت بارگذاری شد.',
    data: { url: `/uploads/${req.file.filename}` },
  });
});

module.exports = { uploadPhotos, uploadEvidence };
