import test from 'node:test'
import assert from 'node:assert/strict'
import { scoreAttempt, skillWisePerformance } from '../src/utils/scoring.js'

const questions = [
  { _id: 'q1', correctAnswer: 1, marks: 2, skill: 'Python' },
  { _id: 'q2', correctAnswer: 0, skill: 'JavaScript' },
  { _id: 'q3', correctAnswer: 2, skill: 'Python' },
]

test('scores correct, incorrect and unanswered answers from stored option indexes', () => {
  const answers = [
    { questionId: 'q1', selected: 1 },
    { questionId: 'q2', selected: 2 },
    { questionId: 'q3', selected: null },
  ]
  assert.deepEqual(scoreAttempt({ questions, answers }), {
    score: 2, total: 4, percentage: 50, correct: 1, incorrect: 1, unattempted: 1,
  })
})

test('groups skill performance by seeded skill and treats unanswered answers as misses', () => {
  const answers = [
    { questionId: 'q1', selected: 1 },
    { questionId: 'q2', selected: 2 },
    { questionId: 'q3', selected: null },
  ]
  assert.deepEqual(skillWisePerformance(questions, answers).map(({ name, value, correct, total }) => ({ name, value, correct, total })), [
    { name: 'Python', value: 50, correct: 1, total: 2 },
    { name: 'JavaScript', value: 0, correct: 0, total: 1 },
  ])
})
