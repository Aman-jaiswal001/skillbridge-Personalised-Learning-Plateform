import { asyncHandler } from '../utils/asyncHandler.js'
import { success } from '../utils/response.js'
import * as assistantService from '../services/assistant.service.js'

export const chat = asyncHandler(async (req, res) => {
  const data = await assistantService.chat({
    userId: req.user._id,
    sessionId: req.body.sessionId,
    question: req.body.question,
    documentIds: req.body.documentIds || [],
  })
  success(res, data)
})

export const sessions = asyncHandler(async (req, res) => {
  const data = await assistantService.listSessions(req.user._id)
  success(res, data)
})

export const messages = asyncHandler(async (req, res) => {
  const data = await assistantService.sessionMessages(req.user._id, req.params.sessionId)
  success(res, data)
})

export const removeSession = asyncHandler(async (req, res) => {
  const data = await assistantService.deleteSession(req.user._id, req.params.sessionId)
  success(res, data, 'Chat history deleted')
})
