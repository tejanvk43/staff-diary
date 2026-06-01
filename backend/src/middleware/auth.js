const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/config');

/**
 * Middleware: verify JWT Bearer token and attach decoded payload to req.user.
 * Also supports ?token= query param for Excel/file downloads.
 */
function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication token required.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { employee_id, role, full_name, iat, exp }
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
}

module.exports = authenticate;

