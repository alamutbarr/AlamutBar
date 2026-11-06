const { Op } = require('sequelize');

const DRIVER_ACCEPT_DOCS_REQUIRED =
  'تا وقتی مدارک ارسالی از پنل ادمین تأیید نشده، نمی‌توانید باری را قبول کنید. پس از تأیید مدارک دوباره تلاش کنید.';
const DRIVER_ACCEPT_ONE_ACTIVE =
  'شما هم‌اکنون یک بار فعال دارید. تا پایان یا لغو آن مأموریت نمی‌توانید بار دیگری را قبول کنید.';

const TERMINAL_OWNER_STATUSES = ['cancelled', 'completed', 'delivered'];
const TERMINAL_WORKFLOWS = ['COMPLETED', 'CANCELLED', 'DRIVER_REPLACED'];
const TERMINAL_DRIVER_STATUSES = ['Completed', 'Cancelled', 'Declined'];

function isActiveDriverAssignment(row) {
  if (!row) return false;
  if (TERMINAL_OWNER_STATUSES.includes(row.status)) return false;
  if (TERMINAL_WORKFLOWS.includes(row.workflow_status)) return false;
  if (TERMINAL_DRIVER_STATUSES.includes(row.driver_status)) return false;
  return true;
}

function documentsApproved(driver) {
  return driver?.verificationStatus === 'VERIFIED';
}

function activeAssignmentWhere(driverId, exceptMissionId) {
  const where = {
    driver_id: driverId,
    status: { [Op.notIn]: TERMINAL_OWNER_STATUSES },
    [Op.and]: [
      { [Op.or]: [{ workflow_status: null }, { workflow_status: { [Op.notIn]: TERMINAL_WORKFLOWS } }] },
      { [Op.or]: [{ driver_status: null }, { driver_status: { [Op.notIn]: TERMINAL_DRIVER_STATUSES } }] },
    ],
  };
  if (exceptMissionId != null) where.id = { [Op.ne]: exceptMissionId };
  return where;
}

module.exports = {
  DRIVER_ACCEPT_DOCS_REQUIRED,
  DRIVER_ACCEPT_ONE_ACTIVE,
  TERMINAL_OWNER_STATUSES,
  TERMINAL_WORKFLOWS,
  TERMINAL_DRIVER_STATUSES,
  isActiveDriverAssignment,
  documentsApproved,
  activeAssignmentWhere,
};
