import { env } from '../../config/env.js'
import { hasLiveEmbeddings } from '../../config/ai.js'

const DIM = 384

function hashEmbed(text) {
  const vec = new Array(DIM).fill(0)
  const tokens = String(text || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
  for (const token of tokens) {
    let h = 2166136261
    for (let i = 0; i < token.length; i += 1) {
      h ^= token.charCodeAt(i)
      h = Math.imul(h, 16777619)
    }
    const idx = Math.abs(h) % DIM
    vec[idx] += 1
    vec[(idx + token.length) % DIM] += 0.3
  }
  const mag = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1
  return vec.map((v) => v / mag)
}

async function openaiEmbed(texts) {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: env.embeddingModel, input: texts }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`OpenAI embeddings failed: ${res.status} ${body.slice(0, 200)}`)
  }
  const json = await res.json()
  return json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding)
}

async function geminiEmbed(texts) {
  console.log('geminiEmbed moded called');
  const out = []
  for (const text of texts) {
    const url =
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent?key=${env.googleApiKey}`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: { parts: [{ text }] } }),
    })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Gemini embeddings failed: ${res.status} ${body.slice(0, 200)}`)
    }
    const json = await res.json()
    out.push(json.embedding.values)
  }
  return out
}

async function huggingFaceEmbed(texts) {
  const model = env.embeddingModel || 'sentence-transformers/all-MiniLM-L6-v2'
  const res = await fetch(`https://api-inference.huggingface.co/pipeline/feature-extraction/${model}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.huggingFaceApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ inputs: texts, options: { wait_for_model: true } }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`HuggingFace embeddings failed: ${res.status} ${body.slice(0, 200)}`)
  }
  const json = await res.json()
  return Array.isArray(json[0]) && typeof json[0][0] === 'number' ? json : json.map((row) => row[0] || row)
}

export async function embedTexts(texts) {
  const inputs = texts.map((t) => String(t || '').slice(0, 8000))
  if (!inputs.length) return []

  try {
    if (env.embeddingProvider === 'openai' && hasLiveEmbeddings()) return openaiEmbed(inputs)
    if ((env.embeddingProvider === 'gemini' || env.embeddingProvider === 'google') && hasLiveEmbeddings()) {
      return geminiEmbed(inputs)
    }
    if (env.embeddingProvider === 'huggingface' && hasLiveEmbeddings()) return huggingFaceEmbed(inputs)
  } catch (err) {
    console.error('[embeddings] provider failed, using local fallback', err.message)
  }

  return inputs.map(hashEmbed)
}

export async function embedQuery(text) {
  const [vec] = await embedTexts([text])
  return vec
}

export { DIM as EMBEDDING_DIM }
