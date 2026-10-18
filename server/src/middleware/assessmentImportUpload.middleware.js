import path from 'node:path'
import multer from 'multer'
import { env } from '../config/env.js'
import { ApiError } from '../utils/ApiError.js'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.assessmentImportMaxFileSize, files: 1, fields: 10, fieldSize: 4096, parts: 11 },
  fileFilter(_req, file, callback) {
    if (path.extname(file.originalname).toLowerCase() !== '.xlsx') {
      return callback(ApiError.unsupported('Only .xlsx assessment spreadsheets are supported'))
    }
    callback(null, true)
  },
}).single('file')

export function uploadAssessmentSpreadsheet(req, res, next) {
  upload(req, res, (error) => {
    if (error) return next(error)
    if (!req.file) return next(ApiError.badRequest('Select an .xlsx spreadsheet to upload'))
    next()
  })
}
