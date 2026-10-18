import { Course } from '../../models/Course.js'

export class IgotAdapter {
  async getCourses() {
    throw new Error('Not implemented')
  }

  async getCourseById(_id) {
    throw new Error('Not implemented')
  }

  async searchCourses(_query) {
    throw new Error('Not implemented')
  }

  async getRecommendedCourses(_context) {
    throw new Error('Not implemented')
  }

  async getTrainingPrograms() {
    throw new Error('Not implemented')
  }
}

export class MockIgotAdapter extends IgotAdapter {
  async getCourses() {
    return Course.find({ isActive: true, source: { $in: ['igot', 'internal'] } })
      .select('title provider igotCourseId category level duration rating')
      .lean()
  }

  async getCourseById(id) {
    return Course.findById(id).lean()
  }

  async searchCourses(query) {
    return Course.find({
      isActive: true,
      title: new RegExp(query || '', 'i'),
    }).lean()
  }

  async getRecommendedCourses() {
    return Course.find({ isActive: true }).sort({ rating: -1 }).limit(6).lean()
  }

  async getTrainingPrograms() {
    const courses = await this.getCourses()
    return courses.map((c) => ({
      programme: c.title,
      provider: c.provider,
      igotCourseId: c.igotCourseId,
    }))
  }
}

let singleton

export function getIgotAdapter() {
  if (!singleton) singleton = new MockIgotAdapter()
  return singleton
}
