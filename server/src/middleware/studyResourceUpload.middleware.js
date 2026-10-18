import path from 'node:path'
import { randomUUID } from 'node:crypto'
import multer from 'multer'
import { env } from '../config/env.js'
import { ApiError } from '../utils/ApiError.js'
import { uploadRoot } from './upload.middleware.js'

const storage = multer.diskStorage({
  destination(_req, _file, callback) { callback(null, uploadRoot) },
  filename(_req, _file, callback) { callback(null, `${randomUUID()}.pdf`) },
})

const uploader = multer({
  storage,
  limits: { fileSize: env.maxFileSize, files: 1 },
  fileFilter(_req, file, callback) {
    const extension = path.extname(file.originalname).toLowerCase()
    if (extension !== '.pdf' || file.mimetype !== 'application/pdf') return callback(ApiError.unsupported('Only PDF files are allowed'))
    callback(null, true)
  },
}).single('file')

export function uploadStudyPdf(req, res, next) {
  uploader(req, res, (error) => {
    if (error) return next(error)
    next()
  })
}

