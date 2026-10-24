const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'alamut-dev-secret-change-me';

// Checks the "Authorization: Bearer <token>" header and puts the driver id on req.user.
function authMiddleware(req, res, next) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
        return res.status(401).json({ message: 'لطفاً ابتدا وارد شوید.' });
    }

    try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.user = {
            id: payload.id || payload.driverId,
            role: payload.role,
            kind: payload.kind,
            typ: payload.typ,
            mobile: payload.mobile,
        };
        return next();
    } catch (error) {
        return res.status(401).json({ message: 'نشست شما منقضی شده است. دوباره وارد شوید.' });
    }
}

module.exports = { authMiddleware };
module.exports.authMiddleware = authMiddleware;