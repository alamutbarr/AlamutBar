export const DRIVER_ID_TYPES = [
  { id: 'shenasnameh', label: 'شناسنامه' },
  { id: 'national_card', label: 'کارت ملی' },
];

export const DRIVER_ID_SLOTS = {
  shenasnameh: [
    { id: 'selfie', key: 'shenasnameh:selfie', label: 'سلفی با شناسنامه' },
    { id: 'front', key: 'shenasnameh:front', label: 'صفحه اول شناسنامه' },
  ],
  national_card: [
    { id: 'selfie', key: 'national_card:selfie', label: 'سلفی با کارت ملی' },
    { id: 'front', key: 'national_card:front', label: 'کارت ملی' },
  ],
};

export function driverDocumentsApproved(driver) {
  return driver?.verificationStatus === 'VERIFIED' || driver?.verifiedStatus === 'verified';
}
