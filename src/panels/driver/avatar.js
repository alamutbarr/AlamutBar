// frontend/src/driver/avatar.js
//
// ابزارهای عکس پروفایل راننده:
// ۱) ساخت «حروف اول» از نام و نام خانوادگی فارسی و تبدیل به معادل انگلیسی بزرگ
//    (مثلاً «محمد رضایی» → MR) برای نمایش وقتی عکسی انتخاب نشده است.
// ۲) تبدیل فایل انتخابی کاربر به Data URL مربعی و کوچک‌شده (۲۵۶×۲۵۶) تا
//    همیشه یکدست نمایش داده شود و حافظه‌ی مرورگر پر نشود.
// ۳) خواندن/نوشتن/حذف عکس ذخیره‌شده بر اساس شناسه‌ی راننده.

// نگاشت حرف اول فارسی به معادل انگلیسی (رایج‌ترین آوانگاری)
const PERSIAN_TO_LATIN = {
  'آ': 'A', 'ا': 'A', 'أ': 'A', 'إ': 'A', 'ء': 'A',
  'ب': 'B', 'پ': 'P', 'ت': 'T', 'ث': 'S',
  'ج': 'J', 'چ': 'CH', 'ح': 'H', 'خ': 'KH',
  'د': 'D', 'ذ': 'Z', 'ر': 'R', 'ز': 'Z', 'ژ': 'ZH',
  'س': 'S', 'ش': 'SH', 'ص': 'S', 'ض': 'Z', 'ط': 'T', 'ظ': 'Z',
  'ع': 'A', 'غ': 'GH', 'ف': 'F', 'ق': 'GH',
  'ک': 'K', 'ك': 'K', 'گ': 'G', 'ل': 'L', 'م': 'M', 'ن': 'N',
  'و': 'V', 'ه': 'H', 'ة': 'H', 'ی': 'Y', 'ي': 'Y', 'ى': 'Y', 'ئ': 'Y',
  'ؤ': 'O',
};

const AVATAR_KEY_PREFIX = 'driver_avatar_';
const MAX_FILE_BYTES = 5 * 1024 * 1024; // ۵ مگابایت
const AVATAR_SIZE = 256; // خروجی مربعی ۲۵۶×۲۵۶

// اولین حرف قابل‌نمایش یک بخش از نام را به معادل انگلیسی بزرگ تبدیل می‌کند.
function firstLetterToLatin(part) {
  if (!part) return '';
  for (const ch of part) {
    if (PERSIAN_TO_LATIN[ch]) return PERSIAN_TO_LATIN[ch];
    if (/[a-zA-Z]/.test(ch)) return ch.toUpperCase();
  }
  return '';
}

/**
 * حروف اول نام و نام خانوادگی به صورت انگلیسی و با حروف بزرگ.
 * «محمد رضایی» → «MR»  |  «علی» → «A»  |  نام خالی → ''
 */
export function getInitials(name) {
  if (!name || typeof name !== 'string') return '';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return firstLetterToLatin(parts[0]);
  return firstLetterToLatin(parts[0]) + firstLetterToLatin(parts[parts.length - 1]);
}

function storageKey(driverId) {
  return driverId ? `${AVATAR_KEY_PREFIX}${driverId}` : null;
}

export function readAvatar(driverId) {
  const key = storageKey(driverId);
  if (!key) return null;
  try {
    return localStorage.getItem(key) || null;
  } catch {
    return null;
  }
}

export function saveAvatar(driverId, dataUrl) {
  const key = storageKey(driverId);
  if (!key) return;
  localStorage.setItem(key, dataUrl);
}

export function removeAvatar(driverId) {
  const key = storageKey(driverId);
  if (!key) return;
  try {
    localStorage.removeItem(key);
  } catch {
    /* نادیده گرفتن خطای دسترسی به حافظه */
  }
}

/**
 * فایل انتخابی کاربر را به Data URL مربعی (برش مرکزی) و فشرده‌شده تبدیل می‌کند.
 * در صورت نامعتبر بودن فایل، Error با پیام فارسی پرتاب می‌کند.
 */
export function fileToAvatarDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('فایلی انتخاب نشد.'));
      return;
    }
    if (!file.type || !file.type.startsWith('image/')) {
      reject(new Error('فقط فایل تصویری (JPG، PNG و ...) مجاز است.'));
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      reject(new Error('حجم عکس باید کمتر از ۵ مگابایت باشد.'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('خواندن فایل ناموفق بود.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('فایل انتخابی یک تصویر معتبر نیست.'));
      img.onload = () => {
        try {
          const side = Math.min(img.width, img.height);
          const sx = (img.width - side) / 2;
          const sy = (img.height - side) / 2;

          const canvas = document.createElement('canvas');
          canvas.width = AVATAR_SIZE;
          canvas.height = AVATAR_SIZE;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, sx, sy, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);

          resolve(canvas.toDataURL('image/jpeg', 0.85));
        } catch {
          reject(new Error('پردازش تصویر ناموفق بود.'));
        }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
