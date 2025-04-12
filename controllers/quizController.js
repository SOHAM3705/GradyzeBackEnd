const Quiz = require('../../models/quiz');

// Create a new quiz
exports.createQuiz = async (req, res) => {
  try {
    const newQuiz = new Quiz(req.body);
    await newQuiz.save();
    res.status(201).json(newQuiz);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Get all quizzes by a teacher
exports.getQuizzesByTeacher = async (req, res) => {
  try {
    const quizzes = await Quiz.find({ teacherId: req.params.teacherId });
    res.json(quizzes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update a quiz
exports.updateQuiz = async (req, res) => {
  try {
    const updatedQuiz = await Quiz.findByIdAndUpdate(
      req.params.quizId,
      req.body,
      { new: true }
    );
    res.json(updatedQuiz);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Delete a quiz
exports.deleteQuiz = async (req, res) => {
  try {
    await Quiz.findByIdAndDelete(req.params.quizId);
    res.json({ message: 'Quiz deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
