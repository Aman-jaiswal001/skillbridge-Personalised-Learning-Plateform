export function buildAssessmentFeedbackPrompt({ score, total, percentage, skillPerformance }) {
  return [
    {
      role: 'system',
      content: 'You are a competency coach for India\'s Official Statistical System. Write 2-3 sentences of constructive feedback. No markdown.',
    },
    {
      role: 'user',
      content: `Score: ${score}/${total} (${percentage}%). Skill performance: ${JSON.stringify(skillPerformance)}`,
    },
  ]
}
