import fs from 'node:fs'
import multer from 'multer'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { env } from '../config/env.js'
import { ApiError } from '../utils/ApiError.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const uploadRoot = process.env.VERCEL
  ? path.join(os.tmpdir(), 'skillbridge-uploads')
  : path.resolve(__dirname, '../../', env.uploadDir)

if (!fs.existsSync(uploadRoot)) {
  fs.mkdirSync(uploadRoot, { recursive: true })
}

const allowedTypes = new Map([
  ['.pdf', 'application/pdf'],
  [
    '.docx',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  [
    '.pptx',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ],
  ['.txt', 'text/plain'],
])

function fileFilter(_req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase()

  if (allowedTypes.get(ext) !== file.mimetype) {
    return cb(
      ApiError.unsupported(
        'Only PDF, DOCX, PPTX and TXT files are allowed',
      ),
    )
  }

  cb(null, true)
}

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, uploadRoot)
  },
  filename(_req, file, cb) {
    const safe = file.originalname.replace(/[^\w.\-]+/g, '_')
    cb(null, `${Date.now()}-${safe}`)
  },
})

export const uploadDocument = multer({
  storage,
  fileFilter,
  limits: { fileSize: env.maxFileSize },
}).single('file')
