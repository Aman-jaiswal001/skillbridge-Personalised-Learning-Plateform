import mammoth from 'mammoth'

export async function loadDocx(filePath) {
  const result = await mammoth.extractRawText({ path: filePath })
  const paragraphs = String(result.value || '')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
  return paragraphs.length
    ? paragraphs.map((content, i) => ({ content, pageNumber: i + 1 }))
    : [{ content: String(result.value || '').trim(), pageNumber: 1 }]
}
