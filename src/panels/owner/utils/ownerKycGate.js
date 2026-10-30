export const KYC_SHIPMENT_MISSING =
  "برای ثبت بار ابتدا باید احراز هویت را در پروفایل انجام دهید. شناسنامه یا کارت ملی کافی است و نیازی به بارگذاری هر دو نیست.";
export const KYC_SHIPMENT_PENDING =
  "مدارک هویت هنوز تأیید نشده است. پس از تأیید احراز هویت می‌توانید بار ثبت کنید.";
export const KYC_SHIPMENT_REJECTED =
  "مدارک هویت رد شده است. ابتدا در پروفایل مدارک را اصلاح کنید تا بتوانید بار ثبت کنید.";

export function ownerCanCreateShipment(user) {
  const status = user?.verification_status || user?.kyc?.verificationStatus;
  return status === "VERIFIED";
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
