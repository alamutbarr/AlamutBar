async function applySchemaPatches(sequelize) {
  const [messageTables] = await sequelize.query("SHOW TABLES LIKE 'messages'");
  if (!messageTables.length) return { messages: false };

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

  return { messages: true };
}

module.exports = { applySchemaPatches };
