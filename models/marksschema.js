const mongoose = require("mongoose");

const marksSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: true },
  academicYear: { type: String, required: true }, // Example: "2024-25"
  exams: [
    {
      examType: { type: String, required: true }, // Example: "Midterm", "Final", etc.
      subjects: [
        {
          subjectName: { type: String, required: true },
          marksObtained: { type: Number, required: true },
          totalMarks: { type: Number, required: true }
        }
      ]
    }
  ],
  createdAt: { type: Date, default: Date.now }
});

const Marks = mongoose.model("Marks", marksSchema);

module.exports = Marks;
