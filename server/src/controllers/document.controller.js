import { asyncHandler } from '../utils/asyncHandler.js'
import { success } from '../utils/response.js'
import * as documentService from '../services/document.service.js'

export const upload = asyncHandler(async (req, res) => {
  const data = await documentService.createAndIngest({ file: req.file, userId: req.user._id })
  success(res, data, 'Document uploaded and queued for processing', 201)
})

export const list = asyncHandler(async (req, res) => {
  const data = await documentService.listDocuments(req.user._id)
  success(res, data)
})

export const remove = asyncHandler(async (req, res) => {
  const data = await documentService.deleteDocument(req.user._id, req.user.role, req.params.id)
  success(res, data, 'Document deleted')
})
