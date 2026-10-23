// استخراج یکدست پیام خطا از پاسخ axios، برای استفاده در همه‌جای فرانت
export function getErrorMessage(err, fallback = 'خطایی رخ داد. لطفاً دوباره تلاش کنید.') {
  if (!err) return fallback;

  if (!err.response) {
    // درخواست اصلاً به سرور نرسیده (قطعی اینترنت، سرور خاموش، CORS و ...)
    return 'ارتباط با سرور برقرار نشد. اتصال اینترنت یا در دسترس بودن سرور را بررسی کنید.';
  }

  const data = err.response.data;
  if (Array.isArray(data?.errors) && data.errors.length > 0) {
    return data.errors.join(' / ');
  }
  return data?.message || fallback;
}
