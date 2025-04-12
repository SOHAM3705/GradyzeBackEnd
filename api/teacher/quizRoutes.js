const express = require('express');
const router = express.Router();
const {
  createQuiz,
  getQuizzesByTeacher,
  updateQuiz,
  deleteQuiz
} = require('../../controllers/quizController');

// Create a new quiz
router.post('/', createQuiz);

// Get all quizzes created by a teacher
router.get('/teacher/:teacherId', getQuizzesByTeacher);

// Update a quiz
router.put('/:quizId', updateQuiz);

// Delete a quiz
router.delete('/:quizId', deleteQuiz);

module.exports = router;
