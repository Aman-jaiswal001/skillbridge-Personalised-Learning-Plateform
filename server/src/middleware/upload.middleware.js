import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import multer from 'multer'
import { env } from '../config/env.js'
import { ApiError } from '../utils/ApiError.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const uploadRoot = path.resolve(__dirname, '../../', env.uploadDir)

if (!fs.existsSync(uploadRoot)) {
  fs.mkdirSync(uploadRoot, { recursive: true })
}

const allowed = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
])

const extensions = new Set(['.pdf', '.docx', '.pptx', '.txt'])

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, uploadRoot)
  },
  filename(_req, file, cb) {
    const safe = file.originalname.replace(/[^\w.\-]+/g, '_')
    cb(null, `${Date.now()}-${safe}`)
  },
})

function fileFilter(_req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase()
  if (!extensions.has(ext) && !allowed.has(file.mimetype)) {
    return cb(ApiError.unsupported('Only PDF, DOCX, PPTX and TXT files are allowed'))
  }
  cb(null, true)
}

export const uploadDocument = multer({
  storage,
  fileFilter,
  limits: { fileSize: env.maxFileSize },
}).single('file')

export { uploadRoot }
