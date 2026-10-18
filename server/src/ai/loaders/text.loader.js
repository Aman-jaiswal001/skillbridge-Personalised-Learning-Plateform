import fs from 'node:fs/promises'

export async function loadText(filePath) {
  const content = await fs.readFile(filePath, 'utf8')
  return [{ content: content.trim(), pageNumber: 1 }]
}
