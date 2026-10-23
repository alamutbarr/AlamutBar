const jwt = require('jsonwebtoken');

const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <TOKEN>

  if (!token) {
    return res.status(401).json({ success: false, message: 'دسترسی غیرمجاز؛ لطفا ابتدا وارد شوید.' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'توکن نامعتبر یا منقضی شده است.' });
    }
    req.user = decoded; // { id, role }
    next();
  });
};

module.exports = authenticate;
