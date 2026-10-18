import { asyncHandler } from '../utils/asyncHandler.js'
import { success } from '../utils/response.js'
import * as notificationService from '../services/notification.service.js'
import { ApiError } from '../utils/ApiError.js'

export const list = asyncHandler(async (req, res) => {
  const data = await notificationService.listNotifications(req.user._id)
  success(res, data)
})

export const readOne = asyncHandler(async (req, res) => {
  const data = await notificationService.markRead(req.user._id, req.params.id)
  if (!data) throw ApiError.notFound('Notification not found')
  success(res, data, 'Marked as read')
})

export const readAll = asyncHandler(async (req, res) => {
  const data = await notificationService.markAllRead(req.user._id)
  success(res, data, 'All notifications marked as read')
})
