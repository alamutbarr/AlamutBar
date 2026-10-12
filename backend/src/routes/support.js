"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
router.get('/operator-phone', (_req, res) => {
    res.json({ phone: '021-12345678', label: 'اپراتور Xbar' });
});
module.exports = router;
module.exports.default = router;
