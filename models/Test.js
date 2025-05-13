const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  questionText: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['single', 'multiple', 'short'], 
    required: true,
    default: 'single'
  },
  options: { 
    type: [String],
    required: function() {
      return this.type === 'single' || this.type === 'multiple';
    }
  },
  correctAnswer: {
    type: mongoose.Schema.Types.Mixed,
    required: function() {
      return this.type !== 'short';
    }
  },
  points: {
    type: Number,
    default: 1,
    min: 1
  }
});

const testSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true 
  },
  description: { 
    type: String 
  },
  questions: [questionSchema],
  status: { 
    type: String, 
    enum: ['draft', 'published'], 
    default: 'draft' 
  },
  teacherId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Teacher", 
    required: true 
  },
  
  // Test classification fields
  testType: { 
    type: String, 
    enum: ['class', 'subject'], 
    required: true 
  },
  
  // Class test specific fields
  year: { 
    type: String,
    required: function() {
      return this.testType === 'class';
    }
  },
  division: { 
    type: String,
    required: function() {
      return this.testType === 'class';
    }
  },
  
  // Subject test specific fields
  subjectName: { 
    type: String,
    required: function() {
      return this.testType === 'subject';
    }
  },
  semester: { 
    type: Number,
    required: function() {
      return this.testType === 'subject';
    },
    min: 1,
    max: 8
  }
}, { 
  timestamps: true 
});

module.exports = mongoose.model('Test', testSchema);