// utils/auth.js
const jwt = require('jsonwebtoken');
const Teacher = require('../models/teacheraccount');

const auth = async (req, res, next) => {
  try {
    // 1. Get token from header
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }
    const token = authHeader.replace('Bearer ', '');

    // 2. Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3. Find teacher
    const teacher = await Teacher.findOne({
      _id: decoded.id,
      'tokens.token': token
    }).select('-password -tokens');

    if (!teacher) {
      throw new Error('Teacher not found');
    }

    // 4. Attach to request
    req.token = token;
    req.teacher = teacher;
    console.log('Token:', token);
console.log('Decoded:', decoded);
console.log('Found teacher:', teacher);
    next();
  } catch (error) {
    console.error('Auth error:', error.message);
    res.status(401).json({ message: 'Not authorized to access this resource' });
  }
};

module.exports = auth;