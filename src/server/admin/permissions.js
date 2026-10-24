const ROLES = [
  'SUPER_ADMIN',
  'DISPATCH_OPERATOR',
  'SECURITY_OPERATOR',
  'INSPECTION_SUPERVISOR',
  'SUPPORT_AGENT',
];

const ROLE_LABELS = {
  SUPER_ADMIN: 'مدیر سامانه',
  DISPATCH_OPERATOR: 'اپراتور دیسپچ',
  SECURITY_OPERATOR: 'اپراتور امنیت',
  INSPECTION_SUPERVISOR: 'سرپرست بازرسی',
  SUPPORT_AGENT: 'پشتیبان مدارک',
};

const PERMISSIONS = {
  SUPER_ADMIN: ['*'],
  DISPATCH_OPERATOR: [
    'dashboard',
    'orders.read',
    'orders.update',
    'orders.price',
    'orders.assign',
    'orders.notes',
    'orders.waybill',
    'orders.penalty',
    'drivers.read',
    'drivers.queue',
    'alerts.read',
    'reports.operations',
  ],
  SECURITY_OPERATOR: [
    'dashboard',
    'map',
    'alerts.read',
    'alerts.resolve',
    'orders.read',
    'drivers.read',
  ],
  INSPECTION_SUPERVISOR: [
    'dashboard',
    'inspections',
    'inspectors.manage',
    'orders.read',
  ],
  SUPPORT_AGENT: [
    'dashboard',
    'drivers.read',
    'drivers.documents',
    'owners.read',
    'owners.documents',
    'complaints',
    'orders.read',
  ],
};

function permissionSet(roles = []) {
  const set = new Set();
  for (const role of roles || []) {
    for (const permission of PERMISSIONS[role] || []) set.add(permission);
  }
  return set;
}

function can(roles, permission) {
  const set = roles instanceof Set ? roles : permissionSet(roles);
  return set.has('*') || set.has(permission);
}

function listPermissions(roles) {
  return [...permissionSet(roles)];
}

module.exports = {
  ROLES,
  ROLE_LABELS,
  PERMISSIONS,
  permissionSet,
  can,
  listPermissions,
};
