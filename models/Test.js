const mongoose = require('mongoose');

const TestSchema = new mongoose.Schema({
  title: String,
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: true },
  questions: [
    {
      questionText: String,
      options: [String],
      correctAnswer: String
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('Test', TestSchema);
