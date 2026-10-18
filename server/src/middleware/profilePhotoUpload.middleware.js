import multer from 'multer'
import { ApiError } from '../utils/ApiError.js'

const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])
const uploader = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter(_req, file, callback) {
    if (!allowedTypes.has(file.mimetype)) return callback(ApiError.unsupported('Choose a JPG, PNG, or WebP profile photo'))
    callback(null, true)
  },
}).single('file')

export function uploadProfilePhotoFile(req, res, next) {
  uploader(req, res, (error) => {
    if (error) return next(error)
    if (!req.file) return next(ApiError.badRequest('Choose a profile photo to upload'))
    next()
  })
}
