export function scoreAttempt({ questions, answers }) {
  let correct = 0
  let incorrect = 0
  let unanswered = 0

  questions.forEach((q, index) => {
    const selected = Array.isArray(answers)
      ? answers[index]?.selected ?? answers[index]
      : answers?.[String(q._id)]
    const value = selected === undefined || selected === null || selected === '' ? null : Number(selected)
    if (value === null || Number.isNaN(value)) {
      unanswered += 1
      return
    }
    if (value === Number(q.correctAnswer)) correct += Number(q.marks ?? 1)
    else incorrect += 1
  })

  const correctCount = questions.reduce((sum, q, index) => {
    const selected = Array.isArray(answers) ? answers[index]?.selected ?? answers[index] : answers?.[String(q._id)]
    return selected !== undefined && selected !== null && selected !== '' && Number(selected) === Number(q.correctAnswer) ? sum + 1 : sum
  }, 0)
  const total = questions.reduce((sum, q) => sum + Number(q.marks ?? 1), 0)
  const percentage = total ? Math.round((correct / total) * 100) : 0
  return {
    score: correct,
    total,
    percentage,
    correct: correctCount,
    incorrect,
    unattempted: unanswered,
  }
}

export function skillWisePerformance(questions, answers) {
  const buckets = new Map()
  questions.forEach((q, index) => {
    const skillId = q.skillId?._id || q.skillId || null
    const name = q.skill || q.skillId?.name || q.category || q.topic || 'General'
    const key = String(skillId || name)
    const bucket = buckets.get(key) || { skillId, name, correct: 0, total: 0 }
    bucket.total += 1
    const selected = Array.isArray(answers) ? answers[index]?.selected ?? answers[index] : null
    if (selected !== null && selected !== undefined && selected !== '' && Number(selected) === Number(q.correctAnswer)) bucket.correct += 1
    buckets.set(key, bucket)
  })
  return [...buckets.values()].map((b) => ({
    ...(b.skillId ? { skillId: b.skillId } : {}),
    name: b.name,
    value: b.total ? Math.round((b.correct / b.total) * 100) : 0,
    correct: b.correct,
    total: b.total,
  }))
}

export function identifyWeakTopics(questions, answers) {
  const byTopic = new Map()
  questions.forEach((q, index) => {
    const topic = q.topic || q.category || 'General'
    const row = byTopic.get(topic) || { topic, miss: 0, total: 0 }
    row.total += 1
    const selected = Array.isArray(answers) ? answers[index]?.selected ?? answers[index] : null
    if (Number(selected) !== Number(q.correctAnswer)) row.miss += 1
    byTopic.set(topic, row)
  })
  return [...byTopic.values()]
    .filter((t) => t.miss > 0)
    .sort((a, b) => b.miss / b.total - a.miss / a.total)
    .map((t) => t.topic)
}
