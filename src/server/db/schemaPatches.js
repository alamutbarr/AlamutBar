async function tableExists(sequelize, name) {
  const [rows] = await sequelize.query(`SHOW TABLES LIKE '${name}'`);
  return rows.length > 0;
}

async function patchMessages(sequelize) {
  if (!(await tableExists(sequelize, 'messages'))) return false;

  const [roleColumn] = await sequelize.query("SHOW COLUMNS FROM messages LIKE 'sender_role'");
  if (roleColumn[0] && String(roleColumn[0].Type).toLowerCase().includes('enum')) {
    await sequelize.query('ALTER TABLE messages MODIFY sender_role VARCHAR(20) NOT NULL');
  }

  const [channelColumn] = await sequelize.query("SHOW COLUMNS FROM messages LIKE 'channel'");
  if (!channelColumn.length) {
    await sequelize.query(
      "ALTER TABLE messages ADD COLUMN channel VARCHAR(32) NOT NULL DEFAULT 'owner_operator'",
    );
  }

  return true;
}

function evidenceColumnIsWide(type) {
  const value = String(type || '').toLowerCase();
  return value.includes('json') || value.includes('text') || value.includes('blob');
}

async function patchComplaints(sequelize) {
  if (!(await tableExists(sequelize, 'complaints'))) return false;
  const [column] = await sequelize.query("SHOW COLUMNS FROM complaints LIKE 'evidence_url'");
  if (!column.length) return false;
  if (!evidenceColumnIsWide(column[0].Type)) {
    await sequelize.query('ALTER TABLE complaints MODIFY evidence_url TEXT NULL');
  }
  return true;
}

async function addColumnIfMissing(sequelize, table, column, definition) {
  const [rows] = await sequelize.query(`SHOW COLUMNS FROM ${table} LIKE '${column}'`);
  if (rows.length) return false;
  await sequelize.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  return true;
}

async function patchShipments(sequelize) {
  if (!(await tableExists(sequelize, 'shipments'))) return false;
  const offered = await addColumnIfMissing(sequelize, 'shipments', 'offered_driver_id', 'INT UNSIGNED NULL');
  const sms = await addColumnIfMissing(sequelize, 'shipments', 'waybill_sms_code', 'VARCHAR(8) NULL');
  const verified = await addColumnIfMissing(sequelize, 'shipments', 'waybill_code_verified', 'TINYINT(1) NOT NULL DEFAULT 0');
  const photo = await addColumnIfMissing(sequelize, 'shipments', 'waybill_photo_url', 'VARCHAR(255) NULL');
  return offered || sms || verified || photo;
}

async function patchDriverNotifications(sequelize) {
  if (!(await tableExists(sequelize, 'driver_notifications'))) return false;
  const [column] = await sequelize.query("SHOW COLUMNS FROM driver_notifications LIKE 'kind'");
  if (!column.length) {
    await sequelize.query("ALTER TABLE driver_notifications ADD COLUMN kind VARCHAR(32) NOT NULL DEFAULT 'info'");
  }
  return true;
}

async function patchDriverProfile(sequelize) {
  if (!(await tableExists(sequelize, 'drivers'))) return false;
  const columns = [
    ['birth_date', 'DATE NULL'],
    ['license_expiry', 'DATE NULL'],
    ['insurance_expiry', 'DATE NULL'],
    ['emergency_name', 'VARCHAR(100) NULL'],
    ['emergency_phone', 'VARCHAR(15) NULL'],
    ['home_address', 'TEXT NULL'],
    ['dossier_status', "VARCHAR(20) NOT NULL DEFAULT 'approved'"],
    ['review_note', 'TEXT NULL'],
    ['account_verified', 'TINYINT(1) NOT NULL DEFAULT 1'],
    ['fleet_documents', 'JSON NULL'],
  ];
  let changed = false;
  for (const [column, definition] of columns) {
    changed = (await addColumnIfMissing(sequelize, 'drivers', column, definition)) || changed;
  }
  return changed;
}

async function patchAdminAccount(sequelize) {
  if (!(await tableExists(sequelize, 'admins'))) return false;
  const columns = [
    ['email', 'VARCHAR(180) NULL'],
    ['company', 'VARCHAR(120) NULL'],
    ['national_id', 'VARCHAR(10) NULL'],
    ['postal_code', 'VARCHAR(10) NULL'],
    ['mfa_secret', 'VARCHAR(64) NULL'],
    ['mfa_enabled', 'TINYINT(1) NOT NULL DEFAULT 0'],
  ];
  let changed = false;
  for (const [column, definition] of columns) {
    changed = (await addColumnIfMissing(sequelize, 'admins', column, definition)) || changed;
  }
  return changed;
}

async function patchInspectionChecklist(sequelize) {
  if (!(await tableExists(sequelize, 'inspection_reports'))) return false;
  const columns = [
    ['stage', "VARCHAR(12) NOT NULL DEFAULT 'loading'"],
    ['packaging_ok', 'TINYINT(1) NULL'],
    ['weight_ok', 'TINYINT(1) NULL'],
    ['vehicle_ok', 'TINYINT(1) NULL'],
    ['seal_number', 'VARCHAR(60) NULL'],
  ];
  let changed = false;
  for (const [column, definition] of columns) {
    changed = (await addColumnIfMissing(sequelize, 'inspection_reports', column, definition)) || changed;
  }
  return changed;
}

async function patchShipmentInsurance(sequelize) {
  if (!(await tableExists(sequelize, 'shipments'))) return false;
  return addColumnIfMissing(sequelize, 'shipments', 'insurance_requested', 'TINYINT(1) NOT NULL DEFAULT 0');
}

async function applySchemaPatches(sequelize) {
  return {
    messages: await patchMessages(sequelize),
    complaints: await patchComplaints(sequelize),
    shipments: await patchShipments(sequelize),
    driverNotifications: await patchDriverNotifications(sequelize),
    drivers: await patchDriverProfile(sequelize),
    admins: await patchAdminAccount(sequelize),
    inspections: await patchInspectionChecklist(sequelize),
    insurance: await patchShipmentInsurance(sequelize),
  };
}

module.exports = { applySchemaPatches, evidenceColumnIsWide };
