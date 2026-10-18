import { invokeLlm } from '../llm/llm.provider.js'
import { buildAssessmentFeedbackPrompt } from '../prompts/assessment.prompt.js'
import { hasLiveLlm } from '../../config/ai.js'

export async function runAssessmentFeedbackChain({ score, total, percentage, skillPerformance }) {
  if (hasLiveLlm()) {
    try {
      return await invokeLlm(buildAssessmentFeedbackPrompt({ score, total, percentage, skillPerformance }))
    } catch (err) {
      console.error('[assessment-chain] feedback fallback', err.message)
    }
  }
  const weakest = [...skillPerformance].sort((a, b) => a.value - b.value)[0]
  if (percentage >= 80) {
    return `Good understanding of core concepts. ${weakest ? `Focus more on ${weakest.name}.` : 'Continue to advanced techniques.'}`
  }
  if (percentage >= 60) {
    return `Solid foundation with room to improve. Prioritise ${weakest?.name || 'weaker topics'} before the next assessment.`
  }
  return `The attempt shows gaps against the target competency. Revisit ${weakest?.name || 'core modules'} and retry after targeted practice.`
}
