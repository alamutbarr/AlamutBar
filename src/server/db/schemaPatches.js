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

async function patchShipments(sequelize) {
  if (!(await tableExists(sequelize, 'shipments'))) return false;
  const [column] = await sequelize.query("SHOW COLUMNS FROM shipments LIKE 'offered_driver_id'");
  if (!column.length) {
    await sequelize.query('ALTER TABLE shipments ADD COLUMN offered_driver_id INT UNSIGNED NULL');
  }
  return true;
}

async function patchDriverNotifications(sequelize) {
  if (!(await tableExists(sequelize, 'driver_notifications'))) return false;
  const [column] = await sequelize.query("SHOW COLUMNS FROM driver_notifications LIKE 'kind'");
  if (!column.length) {
    await sequelize.query("ALTER TABLE driver_notifications ADD COLUMN kind VARCHAR(32) NOT NULL DEFAULT 'info'");
  }
  return true;
}

async function applySchemaPatches(sequelize) {
  return {
    messages: await patchMessages(sequelize),
    complaints: await patchComplaints(sequelize),
    shipments: await patchShipments(sequelize),
    driverNotifications: await patchDriverNotifications(sequelize),
  };
}

module.exports = { applySchemaPatches, evidenceColumnIsWide };
