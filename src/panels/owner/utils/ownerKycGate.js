export const KYC_SHIPMENT_MISSING =
  "برای ثبت بار ابتدا باید احراز هویت را در پروفایل انجام دهید. شناسنامه یا کارت ملی کافی است و نیازی به بارگذاری هر دو نیست.";
export const KYC_SHIPMENT_PENDING =
  "مدارک هویت هنوز تأیید نشده است. پس از تأیید احراز هویت می‌توانید بار ثبت کنید.";
export const KYC_SHIPMENT_REJECTED =
  "مدارک هویت رد شده است. ابتدا در پروفایل مدارک را اصلاح کنید تا بتوانید بار ثبت کنید.";
export const POSTAL_CODE_REQUIRED =
  "برای ثبت بار وارد کردن کد پستی در پروفایل الزامی است. این مورد هنگام ورود گرفته نمی‌شود و باید در پروفایل تکمیل شود.";

export function hasValidOwnerPostalCode(user) {
  return /^\d{10}$/.test(String(user?.postal_code || "").trim());
}

export function ownerPostalShipmentIssue(user) {
  return hasValidOwnerPostalCode(user) ? "" : POSTAL_CODE_REQUIRED;
}

export function ownerCanCreateShipment(user) {
  const status = user?.verification_status || user?.kyc?.verificationStatus;
  return status === "VERIFIED" && hasValidOwnerPostalCode(user);
}

export function ownerKycShipmentIssue(user) {
  const status = user?.verification_status || user?.kyc?.verificationStatus || "PENDING";
  if (status === "VERIFIED") return "";
  if (status === "REJECTED") return KYC_SHIPMENT_REJECTED;
  const docs = Array.isArray(user?.kyc?.documents)
    ? user.kyc.documents.filter((doc) => doc.required)
    : [];
  const uploaded =
    docs.length > 0 && docs.every((doc) => doc.url && doc.status !== "MISSING");
  if (uploaded) return KYC_SHIPMENT_PENDING;
  return KYC_SHIPMENT_MISSING;
}

export function ownerShipmentBlockers(user) {
  const blockers = [];
  const kycIssue = ownerKycShipmentIssue(user);
  if (kycIssue) blockers.push({ code: "KYC_REQUIRED", message: kycIssue });
  const postalIssue = ownerPostalShipmentIssue(user);
  if (postalIssue) blockers.push({ code: "POSTAL_CODE_REQUIRED", message: postalIssue });
  return blockers;
}
