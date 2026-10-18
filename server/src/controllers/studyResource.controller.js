import { asyncHandler } from '../utils/asyncHandler.js'
import { paginated, success } from '../utils/response.js'
import * as studyResourceService from '../services/studyResource.service.js'
import { Readable } from 'node:stream'

export const list = asyncHandler(async (req, res) => {
  const admin = req.user.role === 'ADMIN' && req.query.admin === 'true'
  const { data, pagination } = await studyResourceService.listResources(req.query, { admin })
  paginated(res, data, pagination)
})

export const create = asyncHandler(async (req, res) => {
  const data = await studyResourceService.createResource({ body: req.body, file: req.file, userId: req.user._id })
  success(res, data, 'Study resource created', 201)
})

export const update = asyncHandler(async (req, res) => {
  const data = await studyResourceService.updateResource(req.params.id, { body: req.body, file: req.file })
  success(res, data, 'Study resource updated')
})

export const remove = asyncHandler(async (req, res) => {
  success(res, await studyResourceService.deleteResource(req.params.id), 'Study resource deleted')
})

export const file = asyncHandler(async (req, res, next) => {
  const pdf = await studyResourceService.getPdf(req.params.id, req.user, req.query.download === 'true')
  const safeName = pdf.fileName.replace(/[\r\n"\\]/g, '_')
  res.set({
    'Content-Type': 'application/pdf',
    ...(pdf.fileSize ? { 'Content-Length': pdf.fileSize } : {}),
    'Content-Disposition': `${pdf.disposition}; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(pdf.fileName)}`,
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
  })
  if (pdf.stream) {
    // Cloudinary's signed download uses fetch(), which returns a Web ReadableStream.
    const stream = typeof pdf.stream.pipe === 'function'
      ? pdf.stream
      : Readable.fromWeb(pdf.stream)
    stream.on('error', (error) => { if (!res.headersSent) next(error); else res.destroy(error) })
    stream.pipe(res)
    return
  }
  res.sendFile(pdf.filePath, (error) => { if (error && !res.headersSent) next(error) })
})
