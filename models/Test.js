const mongoose = require('mongoose');

const testSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  questions: [questionSchema],
  status: { type: String, enum: ['draft', 'published'], default: 'draft' },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: true },
  
  // Class test specific fields
  testType: { type: String, enum: ['class', 'subject'], required: true },
  year: { type: String }, // Only for class tests
  division: { type: String }, // Only for class tests
  
  // Subject test specific fields
  subjectName: { type: String }, // Only for subject tests
  semester: { type: Number }, // Only for subject tests
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Test', testSchema);
