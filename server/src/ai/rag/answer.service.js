import { runChatChain } from '../chains/chat.chain.js'

export async function answerFromContext({ question, chunks }) {
  return runChatChain({ question, chunks })
}
