// پاسخ استاندارد و یکدست برای همه‌ی endpointها
function success(res, { message = 'موفقیت‌آمیز بود.', data = null, statusCode = 200 } = {}) {
  return res.status(statusCode).json({ success: true, message, data });
}

function fail(res, { message = 'خطایی رخ داد.', statusCode = 400, errors = null } = {}) {
  return res.status(statusCode).json({ success: false, message, errors });
}

module.exports = { success, fail };
