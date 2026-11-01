const User = require('../models/user.model');
const { signToken } = require('../utils/token');

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

// POST /api/auth/register
exports.register = async (req, res) => {
  try {
    // SECURITY: role is never read from the request body.
    // Public registration always creates an attendee.
    const { name, email, password } = req.body || {};

    const errors = [];

    if (typeof name !== 'string' || !name.trim()) {
      errors.push('Full name is required.');
    } else if (name.trim().length > 100) {
      errors.push('Name must be 100 characters or fewer.');
    }

    if (typeof email !== 'string' || !EMAIL_PATTERN.test(email.trim())) {
      errors.push('Enter a valid email address.');
    }

    if (typeof password !== 'string' || password.length < 8) {
      errors.push('Password must contain at least 8 characters.');
    } else if (password.length > 72) {
      // bcrypt only uses the first 72 bytes
      errors.push('Password must be 72 characters or fewer.');
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: errors[0]
      });
    }

    const user = await User.create({
      name: name.trim(),
      email: email.trim(),
      password,
      role: 'attendee'
    });

    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: user
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists'
      });
    }

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    console.error('Failed to register user:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Failed to create account'
    });
  }
};

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body || {};

    // typeof checks also block NoSQL injection such as { "email": { "$ne": null } }
    if (
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase()
    }).select('+password');

    const passwordMatches = user && (await user.comparePassword(password));

    // Same message for "no such user" and "wrong password"
    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        token: signToken(user),
        user
      }
    });
  } catch (error) {
    console.error('Failed to log in:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Failed to log in'
    });
  }
};

// GET /api/auth/me
exports.me = (req, res) => {
  return res.status(200).json({
    success: true,
    data: req.user
  });
};