// دور زدن نیاز به try/catch تکراری در هر کنترلر؛ خطاها به errorMiddleware می‌روند
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
