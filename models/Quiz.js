const mongoose = require("mongoose");

const quizSchema = new mongoose.Schema({
  title: { type: String, required: true },
  subject: { type: String, required: true },
  description: String,
  formLink: { type: String, required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }],
  deadline: Date,
  marksVisible: { type: Boolean, default: false },
  totalMarks: { type: Number, min: 0 }, // Ensure totalMarks is non-negative
  responses: [
    {
      studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
      submitted: { type: Boolean, default: false },
      marks: Number,
      responseTime: Date
    }
  ]
}, { timestamps: true });

// Indexes for better performance
quizSchema.index({ teacherId: 1 });
quizSchema.index({ assignedTo: 1 });

module.exports = mongoose.model("Quiz", quizSchema);
