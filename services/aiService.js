const axios = require('axios');
require('dotenv').config();

async function generateQuizFromText(text) {
  // Validate input more thoroughly
  if (!text || typeof text !== 'string' || text.trim().length < 20) {
    throw new Error('Input text must be a meaningful string (at least 20 characters)');
  }

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
    // First verify the API key is present
    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error('OpenRouter API key is missing from environment variables');
    }

    // Test network connectivity first
    try {
      await axios.get('https://google.com', { timeout: 5000 });
    } catch (networkErr) {
      throw new Error('No internet connectivity available');
    }

    // Use OpenRouter's chat completion endpoint and a free model
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: "mistralai/mistral-7b-instruct:free",
        messages: [
          { role: "system", content: "You are a precise quiz generator that outputs perfect JSON." },
          { role: "user", content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 2000
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    // Ավելացրու այս հատվածը
    const content = response.data.choices[0].message.content;
    console.log('Model raw content:', content); // Log the model's raw response

    // Փնտրիր առաջին { ... }-ը
    let quizObj;
    try {
      quizObj = JSON.parse(content);
    } catch (e) {
      // fallback: extract first {...} block if pretty-print fails
      const match = content.match(/{[\s\S]*}/);
      if (!match) {
        throw new Error("No JSON object found in model response");
      }
      quizObj = JSON.parse(match[0]);
    }
    return quizObj.quiz;

  } catch (err) {
    console.error('Full error details:', err);
    if (err.response) {
      console.error('OpenRouter error response:', err.response.data);
    }
    if (err.code === 'ECONNABORTED') {
      throw new Error('API request timed out. Please try again later.');
    } else if (err.message.includes('No internet connectivity')) {
      throw new Error('No internet connection available');
    } else if (!process.env.OPENROUTER_API_KEY) {
      throw new Error('API key is not configured. Please set OPENROUTER_API_KEY in your .env file.');
    } else {
      throw new Error(`Failed to generate quiz: ${err.message}`);
    }
  }
}

module.exports = { generateQuizFromText };