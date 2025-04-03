const mongoose = require("mongoose");

const marksSchema = new mongoose.Schema({
  studentId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Student", 
    required: true,
    index: true 
  },
  teacherId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Teacher", 
    required: true,
    index: true 
  },
  academicYear: { 
    type: String, 
    required: true, 
    match: /^\d{4}-\d{2}$/ // Enforces format like "2024-25"
  },
  exams: [
    {
      examType: { 
        type: String, 
        required: true, 
        enum: ["Unit Test", "Prelim", "Re-Unit", "Re-Prelim"] // Updated exam types
      },
      subjects: [
        {
          subjectName: { type: String, required: true },
          marksObtained: { 
            type: Number, 
            required: true, 
            min: 0 // Ensures non-negative values
          },
          totalMarks: { 
            type: Number, 
            required: true, 
            min: 1 
          }
        }
      ]
    }
  ],
  createdAt: { type: Date, default: Date.now }
});

const Marks = mongoose.model("Marks", marksSchema);

module.exports = Marks;
