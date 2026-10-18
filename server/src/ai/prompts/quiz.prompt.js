export function buildQuizPrompt({ topic, difficulty, questionType, numberOfQuestions, context }) {
  return [
    {
      role: 'system',
      content:
        'You generate assessment questions for Indian official statistics officers. Return JSON only.',
    },
    {
      role: 'user',
      content: `Create ${numberOfQuestions} ${questionType} questions on "${topic}" at ${difficulty} difficulty.
Use only this learning context:
${context}

Return JSON:
{
  "questions": [
    {
      "question": "",
      "options": ["", "", "", ""],
      "correctAnswer": 0,
      "explanation": "",
      "topic": "",
      "tags": [""],
      "difficulty": "",
      "pageNumber": 1
    }
  ]
}
Rules:
- MCQ must have exactly 4 options
- True/False must have options ["True","False"] and correctAnswer 0 or 1
- correctAnswer is the zero-based index
- Include topic or skill tags and difficulty on every question
- Do not invent facts not in context`,
    },
  ]
}
