// services/aiService.js
const axios = require('axios');
require('dotenv').config();

async function generateQuizFromText(text) {
  // ✅ Validate input
  if (!text || typeof text !== 'string' || text.trim().length < 20) {
    throw new Error('Input text must be a meaningful string (at least 20 characters)');
  }

  // ✅ Prompt for the model
  const prompt = `
Generate 10 quiz questions. For each, pick a difficult English word, and provide:
- "word": the difficult word,
- "question": "Which of the following is the closest easier synonym for 'word'?",
- "options": 4 English options (one correct, three distractors),
- "correct": the correct easier synonym (must be one of the options).

Return only valid JSON in this format:
{
  "quiz": [
    {
      "word": "example",
      "question": "Which of the following is the closest easier synonym for 'example'?",
      "options": ["easy", "hard", "simple", "complex"],
      "correct": "easy"
    }
    // ...9 more
  ]
}
`;

  try {
    // ✅ Ensure API key is set
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error('API key is not configured. Please set OPENROUTER_API_KEY in your .env file.');
    }

    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: "mistralai/mistral-7b-instruct:free", // կամ այլ անվճար մոդել, եթե սա հասանելի չէ
        messages: [
          { role: "system", content: "You are a precise quiz generator that outputs perfect JSON." },
          { role: "user", content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 2000
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    // ✅ Extract and parse content
    const content = response.data.choices?.[0]?.message?.content;
    console.log('Model raw content:\n', content);

    let quizObj;
    try {
      quizObj = JSON.parse(content);
    } catch (e) {
      // fallback: try to extract a valid JSON block manually
      const match = content?.match(/{[\s\S]*}/);
      if (!match) throw new Error("No JSON object found in model response");
      quizObj = JSON.parse(match[0]);
    }

    // ✅ Return quiz array
    if (!quizObj.quiz || !Array.isArray(quizObj.quiz)) {
      throw new Error('Invalid quiz format returned by model');
    }

    return quizObj.quiz;

  } catch (err) {
    // ✅ Log detailed error info
    console.error('Full error details:', err);
    if (err.response) {
      console.error('OpenRouter error response:', err.response.data);
    }

    // ✅ Handle known error types
    if (err.code === 'ECONNABORTED') {
      throw new Error('API request timed out. Please try again later.');
    } else if (err.message.includes('API key')) {
      throw err;
    } else {
      throw new Error(`Failed to generate quiz: ${err.message}`);
    }
  }
}

module.exports = { generateQuizFromText };
