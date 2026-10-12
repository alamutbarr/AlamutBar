// This module is shared by token issuance and token verification.
// backend/src/index.js loads backend/.env before importing routes.
module.exports = process.env.JWT_SECRET || 'xbar_super_secret_jwt_key_2026';
