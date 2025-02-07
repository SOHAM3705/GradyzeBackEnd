const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  university: { type: String, required: true },
  college: { type: String, required: true },
},{collection:'User'});

const Admin = mongoose.model('Admin', adminSchema);
module.exports = Admin;
