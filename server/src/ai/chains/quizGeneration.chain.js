import { buildQuizPrompt } from '../prompts/quiz.prompt.js'
import { invokeJson } from '../llm/llm.provider.js'
import { hasLiveLlm } from '../../config/ai.js'

function sentencesFrom(context) {
  return context
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 50 && s.length < 280)
}

function fallbackQuestions({ topic, numberOfQuestions, questionType, context, chunks }) {
  const sentences = sentencesFrom(context)
  const count = Math.min(numberOfQuestions, Math.max(4, sentences.length))
  const questions = []
  for (let i = 0; i < count; i += 1) {
    const sentence = sentences[i % Math.max(sentences.length, 1)] || `${topic} is an important competency for official statistics.`
    const pageNumber = chunks[i % Math.max(chunks.length, 1)]?.pageNumber || 1
    if (questionType === 'True/False') {
      questions.push({
        question: `True or False: ${sentence}`,
        options: ['True', 'False'],
        correctAnswer: 0,
        explanation: 'Derived from the uploaded learning material.',
        topic,
        pageNumber,
      })
    } else {
      const words = sentence.split(' ').filter((w) => w.length > 5)
      const keyword = words[0] || topic
      questions.push({
        question: `Based on the material, which statement best reflects ${topic}?`,
        options: [
          sentence,
          `${keyword} is unrelated to official statistics.`,
          'This method is never used in NSS surveys.',
          'Sampling frames are optional in census operations.',
        ],
        correctAnswer: 0,
        explanation: `Taken from the uploaded notes on ${topic}.`,
        topic,
        pageNumber,
      })
    }
  }
  return questions.slice(0, numberOfQuestions)
}

export function validateGeneratedQuestions({ questions, questionType, numberOfQuestions }) {
  if (!Array.isArray(questions) || !questions.length) {
    throw new Error('Quiz generation produced no questions')
  }
  const expectedOptions = questionType === 'True/False' ? 2 : 4
  const clean = []
  for (const q of questions) {
    if (!q || typeof q.question !== 'string' || q.question.trim().length < 8) continue
    const options = Array.isArray(q.options) ? q.options.map((o) => String(o).trim()).filter(Boolean) : []
    if (options.length !== expectedOptions) continue
    const correctAnswer = Number(q.correctAnswer)
    if (!Number.isInteger(correctAnswer) || correctAnswer < 0 || correctAnswer >= options.length) continue
    if (new Set(options.map((o) => o.toLowerCase())).size < 2) continue
    clean.push({
      question: q.question.trim(),
      options,
      correctAnswer,
      explanation: String(q.explanation || 'See the source material.').trim(),
      topic: String(q.topic || '').trim(),
      pageNumber: Number(q.pageNumber) || 1,
    })
  }
  if (clean.length < Math.min(3, numberOfQuestions)) {
    throw new Error('Generated quiz failed validation')
  }
  return clean.slice(0, numberOfQuestions)
}

export async function runQuizGenerationChain({ topic, difficulty, questionType, numberOfQuestions, chunks }) {
  const context = chunks.map((c) => `[p.${c.pageNumber}] ${c.content}`).join('\n')
  if (hasLiveLlm()) {
    try {
      const json = await invokeJson(
        buildQuizPrompt({ topic, difficulty, questionType, numberOfQuestions, context: context.slice(0, 12000) }),
      )
      return validateGeneratedQuestions({
        questions: json.questions,
        questionType,
        numberOfQuestions,
      })
    } catch (err) {
      console.error('[quiz-chain] LLM generation failed, using extractive fallback', err.message)
    }
  }
  return validateGeneratedQuestions({
    questions: fallbackQuestions({ topic, numberOfQuestions, questionType, context, chunks }),
    questionType,
    numberOfQuestions,
  })
}
