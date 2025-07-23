const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const session = require('express-session');
const { generateQuizFromText } = require('./services/aiService');

dotenv.config();

const app = express();
app.use(cors({
  origin: 'https://english-quiz-front.vercel.app', // ✅ string, ոչ regex
  credentials: true
}));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    sameSite: 'none', // ✅ for cross-site cookies
    secure: true      // ✅ cookie only over HTTPS
  }
}));

let currentQuiz = null;
let quizResults = [];

// Admin login
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (
    username === process.env.ADMIN_USERNAME &&
    password === process.env.ADMIN_PASSWORD
  ) {
    req.session.isAdmin = true;
    return res.json({ success: true });
  }
  res.status(401).json({ error: 'Invalid credentials' });
});

// Middleware for admin routes
function requireAdmin(req, res, next) {
  if (req.session.isAdmin) return next();
  res.status(403).json({ error: 'Forbidden' });
}

// Admin creates quiz
app.post('/api/admin/quiz', requireAdmin, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Text is required' });
    const quiz = await generateQuizFromText(text);
    currentQuiz = quiz;
    quizResults = [];
    // Return quiz link for users
    res.json({ quizUrl: '/quiz' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// User gets latest quiz
app.get('/api/quiz', (req, res) => {
  res.json({ quiz: currentQuiz || [] });
});

// User submits quiz
app.post('/api/quiz/submit', (req, res) => {
  const { name, surname, answers } = req.body;
  if (!name || !surname || !answers) {
    return res.status(400).json({ error: 'Name, surname, and answers required' });
  }
  let score = 0;
  if (currentQuiz) {
    currentQuiz.forEach((q, i) => {
      if (answers[i] === q.correct) score++;
    });
  }
  const result = { name, surname, score, date: new Date() };
  quizResults.push(result);
  res.json({ score, total: currentQuiz ? currentQuiz.length : 0 });
});

// Admin gets results
app.get('/api/admin/results', requireAdmin, (req, res) => {
  res.json({ results: quizResults });
});

app.listen(process.env.PORT, () => {
  console.log(`🚀 Server running at http://localhost:${process.env.PORT}`);
});
