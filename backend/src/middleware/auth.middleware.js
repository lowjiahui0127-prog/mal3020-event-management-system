const User = require('../models/user.model');
const { verifyToken } = require('../utils/token');

// 401: we do not know who you are
async function authenticate(req, res, next) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  let user;

  try {
    const payload = verifyToken(token);
    // Load from the database so deleted accounts and role changes apply at once
    user = await User.findById(payload.sub);
  } catch {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }

  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Account no longer exists'
    });
  }

  req.user = user;
  next();
}

// 403: we know who you are, but you are not allowed to do this
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action'
      });
    }

    next();
  };
}

module.exports = { authenticate, authorize };