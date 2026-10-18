import test from 'node:test'
import assert from 'node:assert/strict'
import { createLlmInvoker } from '../src/ai/llm/llm.provider.js'

const configured = {
  openaiApiKey: 'test-openai-key',
  openaiModel: 'test-openai-model',
  geminiApiKey: 'test-gemini-key',
  geminiModel: 'test-gemini-model',
  onProviderError() {},
}

test('Gemini primary retries with OpenAI after an API failure and preserves messages', async () => {
  const calls = []
  const messages = [{ role: 'system', content: 'Use the provided RAG context.' }, { role: 'user', content: 'CONTEXT: source text\nQUESTION: explain it' }]
  const invoker = createLlmInvoker({
    ...configured,
    provider: 'gemini',
    geminiChat: async (input) => { calls.push(['gemini', input]); throw new Error('API failed') },
    openaiChat: async (input) => { calls.push(['openai', input]); return 'answer from OpenAI' },
    fallbackChat: () => 'fallback',
  })
  assert.equal(await invoker.invokeLlm(messages), 'answer from OpenAI')
  assert.deepEqual(calls.map(([provider]) => provider), ['gemini', 'openai'])
  assert.equal(calls[0][1], messages)
  assert.equal(calls[1][1], messages)
})

test('OpenAI primary tries Gemini next and then uses fallback on empty response', async () => {
  const calls = []
  const failures = []
  const invoker = createLlmInvoker({
    ...configured,
    provider: 'openai',
    onProviderError: (provider, reason) => failures.push([provider, reason]),
    openaiChat: async () => { calls.push('openai'); const error = new Error('request timed out'); error.name = 'TimeoutError'; throw error },
    geminiChat: async () => { calls.push('gemini'); return '   ' },
    fallbackChat: () => { calls.push('fallback'); return 'extractive answer' },
  })
  assert.equal(await invoker.invokeLlm([{ role: 'user', content: 'question' }]), 'extractive answer')
  assert.deepEqual(calls, ['openai', 'gemini', 'fallback'])
  assert.deepEqual(failures, [['openai', 'timeout'], ['gemini', 'request or response error']])
})

test('missing keys or model configuration skip that provider', async () => {
  const calls = []
  const invoker = createLlmInvoker({
    provider: 'gemini',
    geminiApiKey: '',
    geminiModel: 'gemini-model',
    openaiApiKey: 'openai-key',
    openaiModel: '',
    geminiChat: async () => { calls.push('gemini'); return 'gemini' },
    openaiChat: async () => { calls.push('openai'); return 'openai' },
    fallbackChat: () => { calls.push('fallback'); return 'fallback' },
    onProviderError() {},
  })
  assert.equal(await invoker.invokeLlm([{ role: 'user', content: 'question' }]), 'fallback')
  assert.deepEqual(calls, ['fallback'])
})

test('invalid JSON from primary retries with the secondary provider', async () => {
  const calls = []
  const messages = [{ role: 'user', content: 'Generate an assessment from this RAG context.' }]
  const invoker = createLlmInvoker({
    ...configured,
    provider: 'gemini',
    geminiChat: async (input) => { calls.push(['gemini', input]); return '{not valid json}' },
    openaiChat: async (input) => { calls.push(['openai', input]); return '```json\n{"questions":[{"question":"Q"}]}\n```' },
    fallbackChat: () => { throw new Error('fallback should not run') },
  })
  assert.deepEqual(await invoker.invokeJson(messages), { questions: [{ question: 'Q' }] })
  assert.deepEqual(calls.map(([provider]) => provider), ['gemini', 'openai'])
  assert.equal(calls[0][1][0], messages[0])
  assert.match(calls[0][1].at(-1).content, /valid JSON only/)
})

test('invalid JSON from both providers is validated against fallback too', async () => {
  const invoker = createLlmInvoker({
    ...configured,
    provider: 'openai',
    openaiChat: async () => 'not json',
    geminiChat: async () => 'also not json',
    fallbackChat: () => 'no JSON available',
  })
  await assert.rejects(invoker.invokeJson([{ role: 'user', content: 'question' }]), /LLM did not return JSON/)
})
