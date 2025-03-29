const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: function() { return !this.googleId; } }, // Required only if no Google ID
  googleId: { type: String, default: null }, // Set to null if not provided
  university: { type: String, required: true },
  college: { type: String, required: true },
}, { collection: 'User' });

const Admin = mongoose.model('Admin', adminSchema);
module.exports = Admin;
