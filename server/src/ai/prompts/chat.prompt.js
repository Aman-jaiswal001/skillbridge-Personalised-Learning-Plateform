export const CHAT_SYSTEM_PROMPT = `You are SkillBridge AI Learning Assistant.
Answer using only the provided learning context.
If the answer cannot be supported by the context, clearly say:
"I could not find this information in the provided learning material."
Do not invent facts.
Mention the relevant source when available.`

export function buildChatPrompt({ question, context }) {
  return [
    { role: 'system', content: CHAT_SYSTEM_PROMPT },
    {
      role: 'user',
      content: `CONTEXT:\n${context}\n\nQUESTION:\n${question}`,
    },
  ]
}
