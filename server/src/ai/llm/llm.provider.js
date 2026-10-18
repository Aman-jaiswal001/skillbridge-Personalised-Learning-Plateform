import { env } from '../../config/env.js'
import { hasLiveLlm } from '../../config/ai.js'

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
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`OpenAI chat failed: ${res.status} ${body.slice(0, 200)}`)
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
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Gemini chat failed: ${res.status} ${body.slice(0, 200)}`)
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

export async function invokeLlm(messages) {
  try {
    if (env.llmProvider === 'openai' && hasLiveLlm()) return await openaiChat(messages)
    if ((env.llmProvider === 'gemini' || env.llmProvider === 'google') && hasLiveLlm()) {
      console.log('gemini llm called')
      return await geminiChat(messages)
    }
  } catch (err) {
    console.error('[llm] provider error, using fallback', err.message)
  }
  console.log('fallbackChat called')
  return fallbackChat(messages)
}

export async function invokeJson(messages) {
  const raw = await invokeLlm([
    ...messages,
    { role: 'system', content: 'Respond with valid JSON only. Do not wrap in markdown.' },
  ])
  const cleaned = raw.replace(/```json|```/g, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('LLM did not return JSON')
  return JSON.parse(cleaned.slice(start, end + 1))
}
