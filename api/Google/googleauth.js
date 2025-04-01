const express = require('express');
const router = express.Router();
const passport = require('passport');
  

const { generateToken, verifyToken } = require('../../utils/jwt');

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Google authentication failed' });
    }

    const token = generateToken(req.user);

    let redirectUrl = '';
    if (req.user.role === 'admin') {
      redirectUrl = `https://gradyze.com/adminlogin?token=${token}&role=admin`;
    } else if (req.user.role === 'teacher') {
      redirectUrl = `https://gradyze.com/teacherlogin?token=${token}&role=teacher`;
    } else if (req.user.role === 'student') {
      redirectUrl = `https://gradyze.com/studentlogin?token=${token}&role=student`;
    } else {
      return res.status(400).json({ message: 'Role not found' });
    }

    res.redirect(redirectUrl);
  }
);

router.get('/verify', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(403).json({ message: 'No token provided' });
  }

  try {
    const decoded = await verifyToken(token);
    res.json({
      id: decoded.id,
      name: decoded.name,
      role: decoded.role,
    });
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
});


module.exports = router;