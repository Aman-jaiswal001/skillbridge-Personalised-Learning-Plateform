import { asyncHandler } from '../utils/asyncHandler.js'
import { success, paginated } from '../utils/response.js'
import * as courseService from '../services/course.service.js'

export const list = asyncHandler(async (req, res) => {
  const { data, pagination } = await courseService.listCourses(req.query, req.user?._id)
  paginated(res, data, pagination)
})

export const getOne = asyncHandler(async (req, res) => {
  const data = await courseService.getCourse(req.params.id, req.user?._id)
  success(res, data)
})

export const create = asyncHandler(async (req, res) => {
  const data = await courseService.createCourse(req.body)
  success(res, data, 'Course created', 201)
})

export const update = asyncHandler(async (req, res) => {
  const data = await courseService.updateCourse(req.params.id, req.body)
  success(res, data, 'Course updated')
})

export const remove = asyncHandler(async (req, res) => {
  const data = await courseService.deleteCourse(req.params.id)
  success(res, data, 'Course archived')
})

export const enroll = asyncHandler(async (req, res) => {
  const data = await courseService.enrollCourse(req.user._id, req.params.id)
  success(res, data, 'Enrolled')
})

export const myCourses = asyncHandler(async (req, res) => {
  const data = await courseService.myCourses(req.user._id)
  success(res, data)
})

export const progress = asyncHandler(async (req, res) => {
  const data = await courseService.updateProgress(req.user._id, req.params.id, req.body)
  success(res, data, 'Progress updated')
})
