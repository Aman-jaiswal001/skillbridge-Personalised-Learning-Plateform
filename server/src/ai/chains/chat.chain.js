import { buildChatPrompt } from '../prompts/chat.prompt.js'
import { invokeLlm } from '../llm/llm.provider.js'

export async function runChatChain({ question, chunks }) {
  const context = chunks
    .map(
      (c, i) =>
        `[#${i + 1} ${c.metadata?.fileName || 'document'} p.${c.pageNumber || 1}]\n${c.content}`,
    )
    .join('\n\n')

  if (!context.trim()) {
    return {
      answer: 'I could not find this information in the provided learning material.',
      sources: [],
    }
  }

  const answer = await invokeLlm(buildChatPrompt({ question, context }))
  const sources = []
  const seen = new Set()
  for (const chunk of chunks) {
    const key = `${chunk.documentId}-${chunk.pageNumber}`
    if (seen.has(key)) continue
    seen.add(key)
    sources.push({
      documentId: chunk.documentId,
      fileName: chunk.metadata?.fileName,
      pageNumber: chunk.pageNumber,
      chunkId: chunk._id,
    })
  }
  return { answer, sources: sources.slice(0, 4) }
}
