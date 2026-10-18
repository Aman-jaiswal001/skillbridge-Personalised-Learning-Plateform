import fs from 'node:fs/promises'
import JSZip from 'jszip'

function stripXml(xml) {
  return xml
    .replace(/<a:t[^>]*>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function loadPptx(filePath) {
  const buffer = await fs.readFile(filePath)
  const zip = await JSZip.loadAsync(buffer)
  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
    .sort((a, b) => {
      const na = Number(a.match(/slide(\d+)/i)?.[1] || 0)
      const nb = Number(b.match(/slide(\d+)/i)?.[1] || 0)
      return na - nb
    })

  const pages = []
  for (let i = 0; i < slideFiles.length; i += 1) {
    const xml = await zip.file(slideFiles[i]).async('string')
    const content = stripXml(xml)
    if (content) pages.push({ content, pageNumber: i + 1 })
  }
  return pages.length ? pages : [{ content: '', pageNumber: 1 }]
}
