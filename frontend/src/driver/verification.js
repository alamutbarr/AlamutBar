// frontend/src/driver/verification.js
//
// بخش‌های مدارک احراز هویت راننده و ابزارهای ذخیره/خواندن عکس‌های هر مدرک.
// ترتیب بخش‌ها: دو موردِ اجباری (گواهینامه، عکس شخصی) ابتدا و بقیه‌ی
// بخش‌های نیمه‌اجباری (کارت ملی، کارت خودرو) پس از آن. عکس‌ها در
// localStorage با کلید مبتنی بر شناسه‌ی راننده ذخیره می‌شوند.

const KEY_PREFIX = 'driver_verification_';
const MAX_FILE_BYTES = 8 * 1024 * 1024; // ۸ مگابایت
const MAX_EDGE = 1000; // بزرگ‌ترین ضلع خروجی (پیکسل)

export const VERIFICATION_SECTIONS = [
  {
    id: 'driverLicense',
    title: 'گواهینامه رانندگی',
    mandatory: true,
    description: 'تصویر پشت و روی گواهینامه را بارگذاری کنید.',
    slots: [
      { id: 'front', label: 'روی گواهینامه' },
      { id: 'back', label: 'پشت گواهینامه' },
    ],
  },
  {
    id: 'selfie',
    title: 'عکس شخصی با کارت',
    mandatory: true,
    description: 'یک عکس از خودتان بگیرید که یکی از کارت‌ها (کارت ملی، گواهینامه یا کارت هوشمند خودرو) را در دست دارید.',
    slots: [{ id: 'selfie', label: 'عکس شما + کارت' }],
  },
  {
    id: 'nationalCard',
    title: 'کارت ملی هوشمند',
    mandatory: false,
    description: 'تصویر پشت و روی کارت ملی هوشمند را بارگذاری کنید.',
    slots: [
      { id: 'front', label: 'روی کارت ملی' },
      { id: 'back', label: 'پشت کارت ملی' },
    ],
  },
  {
    id: 'vehicleCard',
    title: 'کارت هوشمند خودرو',
    mandatory: false,
    description: 'تصویر پشت و روی کارت خودرو را بارگذاری کنید.',
    slots: [
      { id: 'front', label: 'روی کارت خودرو' },
      { id: 'back', label: 'پشت کارت خودرو' },
    ],
  },
];

const MANDATORY_IDS = VERIFICATION_SECTIONS.filter((s) => s.mandatory).map((s) => s.id);

function storageKey(driverId) {
  return driverId ? `${KEY_PREFIX}${driverId}` : null;
}

export function readVerification(driverId) {
  const key = storageKey(driverId);
  if (!key) return {};
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveVerificationPhoto(driverId, sectionId, slotId, dataUrl) {
  const key = storageKey(driverId);
  if (!key) return;
  const docs = readVerification(driverId);
  docs[sectionId] = docs[sectionId] || {};
  docs[sectionId][slotId] = dataUrl;
  try {
    localStorage.setItem(key, JSON.stringify(docs));
  } catch {
    throw new Error('ذخیره‌سازی عکس در مرورگر ممکن نشد. حافظه‌ی مرورگر را آزاد کنید.');
  }
}

export function removeVerificationPhoto(driverId, sectionId, slotId) {
  const key = storageKey(driverId);
  if (!key) return;
  const docs = readVerification(driverId);
  if (docs[sectionId]) {
    delete docs[sectionId][slotId];
    if (Object.keys(docs[sectionId]).length === 0) delete docs[sectionId];
  }
  try {
    localStorage.setItem(key, JSON.stringify(docs));
  } catch {
    /* نادیده گرفتن */
  }
}

// وضعیت تکمیل یک بخش: تعداد عکس‌های بارگذاری‌شده نسبت به تعداد موردنیاز
export function sectionStatus(section, docs) {
  const sectionDocs = docs[section.id] || {};
  const uploaded = section.slots.filter((s) => !!sectionDocs[s.id]).length;
  const complete = uploaded === section.slots.length;
  return { uploaded, required: section.slots.length, complete };
}

// احراز هویت زمانی کامل است که همه‌ی بخش‌های اجباری تکمیل شده باشند
export function isVerificationComplete(driverId) {
  const docs = readVerification(driverId);
  return MANDATORY_IDS.every((id) => {
    const section = VERIFICATION_SECTIONS.find((s) => s.id === id);
    return sectionStatus(section, docs).complete;
  });
}

/**
 * فایل انتخابی را به Data URL فشرده‌شده تبدیل می‌کند (کل تصویر حفظ می‌شود،
 * بدون برش مرکزی، تا کارت به‌صورت کامل دیده شود).
 */
export function fileToDocumentPhoto(file) {
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
      reject(new Error('حجم عکس باید کمتر از ۸ مگابایت باشد.'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('خواندن فایل ناموفق بود.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('فایل انتخابی یک تصویر معتبر نیست.'));
      img.onload = () => {
        try {
          const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
          const w = Math.max(1, Math.round(img.width * scale));
          const h = Math.max(1, Math.round(img.height * scale));
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.82));
        } catch {
          reject(new Error('پردازش تصویر ناموفق بود.'));
        }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
