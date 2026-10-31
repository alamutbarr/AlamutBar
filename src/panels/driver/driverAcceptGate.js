import { isMissionActive } from './driverFormat.js';

export const DRIVER_ACCEPT_DOCS_REQUIRED =
  'تا وقتی مدارک ارسالی از پنل ادمین تأیید نشده، نمی‌توانید باری را قبول کنید. پس از تأیید مدارک دوباره تلاش کنید.';
export const DRIVER_ACCEPT_ONE_ACTIVE =
  'شما هم‌اکنون یک بار فعال دارید. تا پایان یا لغو آن مأموریت نمی‌توانید بار دیگری را قبول کنید.';

export function driverDocumentsApproved(driver) {
  return driver?.verificationStatus === 'VERIFIED' || driver?.verifiedStatus === 'verified';
}

export function driverAcceptIssue(driver, missions, mission) {
  if (!driverDocumentsApproved(driver)) {
    return { code: 'DOCS_NOT_APPROVED', message: DRIVER_ACCEPT_DOCS_REQUIRED };
  }
  const active = (missions || []).find((item) => (
    isMissionActive(item) && String(item.id) !== String(mission?.id)
  ));
  if (active) {
    return { code: 'ONE_ACTIVE_LOAD', message: DRIVER_ACCEPT_ONE_ACTIVE };
  }
  return null;
}
