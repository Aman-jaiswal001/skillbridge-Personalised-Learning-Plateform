import { invokeJson } from '../llm/llm.provider.js'
import { buildRecommendationRationalePrompt } from '../prompts/recommendation.prompt.js'
import { hasLiveLlm } from '../../config/ai.js'

export async function runRecommendationRationaleChain({ employeeName, designation, items }) {
  if (!hasLiveLlm()) return items
  try {
    const json = await invokeJson(
      buildRecommendationRationalePrompt({
        employeeName,
        designation,
        items: items.map((i) => ({ title: i.course.title, reason: i.reason, gap: i.gapAddressed })),
      }),
    )
    const map = new Map((json.rationales || []).map((r) => [r.title, r.reason]))
    return items.map((i) => ({
      ...i,
      reason: map.get(i.course.title) || i.reason,
    }))
  } catch (err) {
    console.error('[recommendation-chain] rationale fallback', err.message)
    return items
  }
}
