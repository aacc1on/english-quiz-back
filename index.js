const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { generateQuizFromText } = require('./services/aiService');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/quiz', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Text is required' });

    const quiz = await generateQuizFromText(text);
    res.json({ quiz });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(process.env.PORT, () => {
  console.log(`🚀 Server running at http://localhost:${process.env.PORT}`);
});
