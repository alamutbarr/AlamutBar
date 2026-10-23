// پیام‌های عمومی فارسی برای Joi - با استفاده از {{#label}} روی برچسب فارسی هر فیلد (label) اعمال می‌شود
// این‌طوری لازم نیست برای تک‌تک فیلدها پیام جداگانه بنویسیم و هیچ پیام انگلیسی پیش‌فرض نشت نمی‌کند
const commonMessages = {
  'any.required': '{{#label}} الزامی است.',
  'any.only': '{{#label}} مقدار معتبری نیست.',
  'string.empty': '{{#label}} نمی‌تواند خالی باشد.',
  'string.min': '{{#label}} باید حداقل {{#limit}} کاراکتر باشد.',
  'string.max': '{{#label}} نمی‌تواند بیشتر از {{#limit}} کاراکتر باشد.',
  'string.length': '{{#label}} باید دقیقاً {{#limit}} کاراکتر باشد.',
  'string.pattern.base': '{{#label}} معتبر نیست.',
  'number.base': '{{#label}} باید عدد باشد.',
  'number.positive': '{{#label}} باید عددی مثبت باشد.',
  'number.integer': '{{#label}} باید عدد صحیح باشد.',
  'number.min': '{{#label}} نمی‌تواند کمتر از {{#limit}} باشد.',
  'number.max': '{{#label}} نمی‌تواند بیشتر از {{#limit}} باشد.',
  'date.base': '{{#label}} یک تاریخ معتبر نیست.',
  'date.greater': '{{#label}} باید از امروز به بعد باشد.',
  'date.min': '{{#label}} نمی‌تواند در گذشته باشد.',
  'array.max': '{{#label}} حداکثر می‌تواند {{#limit}} مورد داشته باشد.',
  'object.unknown': 'فیلد ناشناخته‌ی {{#label}} مجاز نیست.',
};

module.exports = commonMessages;
