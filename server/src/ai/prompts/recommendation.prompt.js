export function buildRecommendationRationalePrompt({ employeeName, designation, items }) {
  return [
    {
      role: 'system',
      content: 'Write a short personalized learning rationale for a government officer. One sentence per course. Return JSON { "rationales": [{"title":"","reason":""}] }',
    },
    {
      role: 'user',
      content: `Officer: ${employeeName}, ${designation}. Recommendations: ${JSON.stringify(items)}`,
    },
  ]
}
