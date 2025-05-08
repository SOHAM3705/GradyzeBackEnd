// utils/auth.js
const jwt = require('jsonwebtoken');
const Teacher = require('../models/teacheraccount');
const Admin = require('../models/useradmin');

const auth = async (req, res, next) => {
  try {
    // 1. Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    // 2. Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3. Find user (teacher or admin)
    let user;
    if (decoded.role === 'admin') {
      user = await Admin.findOne({
        _id: decoded.id,
        'tokens.token': token
      });
    } else {
      user = await Teacher.findOne({
        _id: decoded.id,
        'tokens.token': token
      });
    }

    if (!user) {
      throw new Error('User not found');
    }

    // 4. Attach user and token to request
    req.token = token;
    req.user = user;
    req.teacher = user; // For backward compatibility
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ 
      message: 'Not authorized to access this resource',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = auth;