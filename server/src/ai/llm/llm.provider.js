import { env } from '../../config/env.js'

function toText(messages) {
  return messages
    .map((m) => {
      const role = m.role || m.type || 'user'
      const content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
      return `${role.toUpperCase()}: ${content}`
    })
    .join('\n')
}

async function openaiChat(messages) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: env.openaiModel,
      temperature: 0.2,
      messages: messages.map((m) => ({
        role: m.role === 'human' ? 'user' : m.role,
        content: m.content,
      })),
    }),
    signal: AbortSignal.timeout(30000),
  })
  if (!res.ok) {
    throw new Error(`OpenAI chat failed with status ${res.status}`)
  }
  const json = await res.json()
  return json.choices?.[0]?.message?.content || ''
}

async function geminiChat(messages) {
  const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n')
  const contents = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${env.geminiModel}:generateContent?key=${env.googleApiKey}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: system ? { parts: [{ text: system }] } : undefined,
      contents,
      generationConfig: { temperature: 0.2 },
    }),
    signal: AbortSignal.timeout(30000),
  })
  if (!res.ok) {
    throw new Error(`Gemini chat failed with status ${res.status}`)
  }
  const json = await res.json()
  return json.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || ''
}

function fallbackChat(messages) {
  const userMessage = [...messages].reverse().find((message) => message.role === 'user')
  const userContent = typeof userMessage?.content === 'string' ? userMessage.content : ''
  const contextMatch = userContent.match(/^CONTEXT:\s*([\s\S]*?)\nQUESTION:/i)
  const questionMatch = userContent.match(/\nQUESTION:\s*([\s\S]+)$/i)
  const context = (contextMatch?.[1] || '').trim()
  const question = (questionMatch?.[1] || '').trim()

  if (!context || context.length < 40) {
    return 'I could not find this information in the provided learning material.'
  }

  const terms = question.toLowerCase().split(/[^\w]+/).filter((w) => w.length > 3)
  const sentences = context
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 40)
  const ranked = sentences
    .map((s) => ({
      s,
      score: terms.reduce((acc, t) => acc + (s.toLowerCase().includes(t) ? 1 : 0), 0),
    }))
    .sort((a, b) => b.score - a.score)

  const best = ranked.filter((r) => r.score > 0).slice(0, 3).map((r) => r.s)
  if (!best.length) {
    return 'I could not find this information in the provided learning material.'
  }
  return `${best.join(' ')}\n\n(Answer generated from retrieved learning material in development fallback mode.)`
}

function parseJsonResponse(raw) {
  const cleaned = raw.replace(/```json|```/g, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('LLM did not return JSON')
  return JSON.parse(cleaned.slice(start, end + 1))
}

function normalizedProvider(provider) {
  return provider === 'google' ? 'gemini' : provider
}

function safeFailureReason(error) {
  if (error?.name === 'TimeoutError' || error?.name === 'AbortError') return 'timeout'
  const status = Number(error?.message?.match(/status (\d{3})/i)?.[1])
  return status ? `HTTP ${status}` : 'request or response error'
}

export function createLlmInvoker(options = {}) {
  const primary = normalizedProvider(options.provider ?? env.llmProvider)
  const credentials = {
    openai: { key: options.openaiApiKey ?? env.openaiApiKey, model: options.openaiModel ?? env.openaiModel },
    gemini: { key: options.geminiApiKey ?? env.googleApiKey, model: options.geminiModel ?? env.geminiModel },
  }
  const calls = {
    openai: options.openaiChat || openaiChat,
    gemini: options.geminiChat || geminiChat,
  }
  const runFallback = options.fallbackChat || fallbackChat
  const reportFailure = options.onProviderError || ((provider, reason) => console.warn(`[llm] ${provider} failed (${reason}); trying next provider`))
  const order = primary === 'openai' ? ['openai', 'gemini'] : primary === 'gemini' ? ['gemini', 'openai'] : []

  async function run(messages, validate = (value) => value) {
    let lastError
    for (const provider of order) {
      const { key, model } = credentials[provider]
      if (!String(key || '').trim() || !String(model || '').trim()) continue
      try {
        const response = await calls[provider](messages)
        if (typeof response !== 'string' || !response.trim()) throw new Error('Empty LLM response')
        return validate(response)
      } catch (error) {
        lastError = error
        reportFailure(provider, safeFailureReason(error))
      }
    }
    try {
      const response = await runFallback(messages)
      if (typeof response !== 'string' || !response.trim()) throw new Error('Empty fallback response')
      return validate(response)
    } catch (error) {
      throw error || lastError || new Error('All LLM providers failed')
    }
  }

  return {
    invokeLlm: (messages) => run(messages),
    invokeJson: (messages) => run([
      ...messages,
      { role: 'system', content: 'Respond with valid JSON only. Do not wrap in markdown.' },
    ], parseJsonResponse),
  }
}

const defaultInvoker = createLlmInvoker()

export async function invokeLlm(messages) {
  return defaultInvoker.invokeLlm(messages)
}

export async function invokeJson(messages) {
  return defaultInvoker.invokeJson(messages)
}
