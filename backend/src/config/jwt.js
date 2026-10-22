const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Same secret for signing tokens and verifying them.
module.exports = process.env.JWT_SECRET || 'alamut-bar-dev-secret-change-me';
