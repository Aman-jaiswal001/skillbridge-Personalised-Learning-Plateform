import fs from 'node:fs/promises'
import pdfParse from 'pdf-parse'

export async function loadPdf(filePath) {
  const buffer = await fs.readFile(filePath)
  const result = await pdfParse(buffer)
  const pages = String(result.text || '')
    .split(/\f/)
    .map((t) => t.trim())
    .filter(Boolean)
  if (pages.length) {
    return pages.map((content, i) => ({ content, pageNumber: i + 1 }))
  }
  return [{ content: String(result.text || '').trim(), pageNumber: 1 }]
}
