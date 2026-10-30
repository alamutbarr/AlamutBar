export const MANUAL_SAVE_AFTER_MS = 4000;

const HTML_MESSAGE = 'به‌جای پرونده، صفحهٔ سایت برگشت. درخواست دانلود به API نرسید.';

export function pdfMagic(bytes) {
  return Boolean(bytes)
    && bytes.length >= 5
    && bytes[0] === 0x25
    && bytes[1] === 0x50
    && bytes[2] === 0x44
    && bytes[3] === 0x46
    && bytes[4] === 0x2d;
}

function looksLikeHtml(contentType, bytes) {
  const type = String(contentType || '').toLowerCase();
  if (type.includes('text/html')) return true;
  return Boolean(bytes) && bytes.length >= 2 && bytes[0] === 0x3c && bytes[1] === 0x21;
}

export function failureMessage({ ok, bodyText, contentType, bytes, wantPdf }) {
  const type = String(contentType || '').toLowerCase();
  if (!ok) {
    const text = String(bodyText || '').trim();
    if (text.startsWith('{')) {
      try {
        const parsed = JSON.parse(text);
        if (parsed && parsed.message) return String(parsed.message);
      } catch {
        /* پاسخ خطا متن نیست */
      }
    }
    if (text.startsWith('<') || looksLikeHtml(type, bytes)) return HTML_MESSAGE;
    return 'دانلود ناموفق بود.';
  }
  if (looksLikeHtml(type, bytes)) return HTML_MESSAGE;
  if (type.includes('application/json')) return 'پاسخ دانلود فایل نیست.';
  if (wantPdf && (!type.includes('application/pdf') || !pdfMagic(bytes))) {
    return 'پروندهٔ دریافتی PDF معتبر نیست.';
  }
  return null;
}

export function savePlan({ hasHandle, elapsedMs, wantPdf }) {
  if (hasHandle) return 'picker';
  if (wantPdf && elapsedMs >= MANUAL_SAVE_AFTER_MS) return 'manual';
  return 'anchor';
}
