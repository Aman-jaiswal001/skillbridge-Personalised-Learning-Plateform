import path from 'node:path'
import { loadPdf } from './pdf.loader.js'
import { loadDocx } from './docx.loader.js'
import { loadPptx } from './pptx.loader.js'
import { loadText } from './text.loader.js'
import { ApiError } from '../../utils/ApiError.js'

export async function loadDocumentPages(filePath, originalName = '') {
  const ext = path.extname(originalName || filePath).toLowerCase()
  if (ext === '.pdf') return loadPdf(filePath)
  if (ext === '.docx') return loadDocx(filePath)
  if (ext === '.pptx') return loadPptx(filePath)
  if (ext === '.txt') return loadText(filePath)
  throw ApiError.unsupported('Unsupported file type')
}
