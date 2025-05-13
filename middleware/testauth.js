const jwt = require('jsonwebtoken');
const Test = require('../models/Test');

// Simple auth middleware to verify teacher and test ownership
const testAuth = async (req, res, next) => {
  try {
    // 1. Check if token exists
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) throw new Error('No token provided');

    // 2. Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const teacherId = decoded.id; // Assuming token stores teacher's ID

    // 3. If route has :id (like /test/:id), check test ownership
    if (req.params.id) {
      const test = await Test.findOne({ 
        _id: req.params.id, 
        teacherId 
      });
      if (!test) throw new Error('Test not found or unauthorized');
      req.test = test; // Attach test to request
    }

    req.teacherId = teacherId; // Attach teacherId for other routes
    next();
  } catch (err) {
    res.status(401).json({ error: 'Unauthorized: ' + err.message });
  }
};

module.exports = testAuth;