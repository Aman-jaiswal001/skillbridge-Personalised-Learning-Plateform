import { asyncHandler } from '../utils/asyncHandler.js'
import { paginated, success } from '../utils/response.js'
import * as service from '../services/youtubeLearning.service.js'

export const listResources = asyncHandler(async (req, res) => {
  const { data, pagination } = await service.listResources(req.query, { admin: req.user.role === 'ADMIN' && req.query.admin === 'true', userId: req.user._id })
  paginated(res, data, pagination)
})
export const createResource = asyncHandler(async (req, res) => success(res, await service.createResource(req.body), 'YouTube resource created', 201))
export const updateResource = asyncHandler(async (req, res) => success(res, await service.updateResource(req.params.id, req.body), 'YouTube resource updated'))
export const deleteResource = asyncHandler(async (req, res) => success(res, await service.deleteResource(req.params.id), 'YouTube resource deleted'))
export const myItems = asyncHandler(async (req, res) => success(res, await service.listLearningItems(req.user._id)))
export const addItem = asyncHandler(async (req, res) => {
  const { item, existing } = await service.addLearningItem(req.user._id, req.params.resourceId)
  success(res, item, existing ? 'Already in your learning path' : 'Added to your learning path', existing ? 200 : 201, { existing })
})
export const getItem = asyncHandler(async (req, res) => success(res, await service.getLearningItem(req.user._id, req.params.itemId)))
export const completeItem = asyncHandler(async (req, res) => success(res, await service.updateLearningItem(req.user._id, req.params.itemId, req.body), 'Learning item completed'))
export const removeItem = asyncHandler(async (req, res) => success(res, await service.removeLearningItem(req.user._id, req.params.itemId), 'Learning item removed'))
