export const KYC_MAX_BYTES = 5 * 1024 * 1024;
export const KYC_MAX_LABEL = "۵ مگابایت";
export const KYC_ACCEPT = ["image/jpeg", "image/png", "image/webp"];

export function kycFileIssue(file) {
  if (!file) return "تصویر را انتخاب کنید.";
  if (!KYC_ACCEPT.includes(file.type)) return "فقط تصویر JPG، PNG یا WEBP مجاز است.";
  if (file.size > KYC_MAX_BYTES) {
    return `حجم عکس بیشتر از ${KYC_MAX_LABEL} است. عکس کوچک‌تری انتخاب کنید.`;
  }
  return "";
}
