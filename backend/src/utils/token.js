const jwt = require('jsonwebtoken');

function getSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET is not set');
  }

  return secret;
}

function signToken(user) {
  return jwt.sign({ role: user.role }, getSecret(), {
    subject: String(user._id),
    expiresIn: process.env.JWT_EXPIRES_IN || '1d'
  });
}

function verifyToken(token) {
  return jwt.verify(token, getSecret(), { algorithms: ['HS256'] });
}

module.exports = { signToken, verifyToken };