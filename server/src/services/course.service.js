import { Course } from "../models/Course.js";
import { Progress } from "../models/Progress.js";
import { ApiError } from "../utils/ApiError.js";
import { parsePagination, buildPagination } from "../utils/pagination.js";
import { notify } from "./notification.service.js";

export async function listCourses(query, userId) {
  const { page, limit, skip } = parsePagination(query);
  const filter = { isActive: true };
  if (query.q) filter.$text = { $search: query.q };
  if (query.category) filter.category = query.category;
  if (query.level) filter.level = query.level;
  const [data, total] = await Promise.all([
    Course.find(filter)
      .populate("skills", "name category")
      .sort({ rating: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Course.countDocuments(filter),
  ]);
  const progress = userId
    ? await Progress.find({ employeeId: userId }).lean()
    : [];
  const byCourse = new Map(progress.map((p) => [String(p.courseId), p]));
  return {
    data: data.map((c) => ({
      ...c,
      progress: byCourse.get(String(c._id))?.progressPercentage || 0,
      enrolled: byCourse.has(String(c._id)),
    })),
    pagination: buildPagination({ page, limit, total }),
  };
}

export async function getCourse(id, userId) {
  const course = await Course.findById(id).populate("skills", "name category");
  if (!course || !course.isActive) throw ApiError.notFound("Course not found");
  const progress = userId
    ? await Progress.findOne({ employeeId: userId, courseId: id })
    : null;
  return { ...course.toObject(), progress: progress || null };
}

export async function createCourse(payload) {
  validateCourseUrl(payload.url);
  const course = await Course.create(payload);
  return course;
}

export async function updateCourse(id, payload) {
  validateCourseUrl(payload.url);
  const course = await Course.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
  if (!course) throw ApiError.notFound("Course not found");
  return course;
}

function validateCourseUrl(url) {
  if (url === undefined || url === '') return;
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('scheme');
  } catch {
    throw ApiError.badRequest('Course URL must be a valid HTTP or HTTPS URL');
  }
}

export async function deleteCourse(id) {
  const course = await Course.findByIdAndUpdate(
    id,
    { isActive: false },
    { new: true },
  );
  if (!course) throw ApiError.notFound("Course not found");
  return course;
}

export async function enrollCourse(userId, courseId) {
  const course = await Course.findById(courseId);
  if (!course || !course.isActive) throw ApiError.notFound("Course not found");
  const progress = await Progress.findOneAndUpdate(
    { employeeId: userId, courseId },
    {
      $setOnInsert: {
        progressPercentage: 0,
        completedModules: [],
        learningHours: 0,
        enrolledAt: new Date(),
      },
      lastActivity: new Date(),
    },
    { upsert: true, new: true },
  );
  return progress;
}

export async function updateProgress(
  userId,
  courseId,
  { progressPercentage, completedModules, learningHours },
) {
  const progress = await Progress.findOne({ employeeId: userId, courseId });
  if (!progress) throw ApiError.notFound("Enrolment not found");
  if (progressPercentage !== undefined) {
    progress.progressPercentage = Math.max(
      0,
      Math.min(100, Number(progressPercentage)),
    );
  }
  if (completedModules) progress.completedModules = completedModules;
  if (learningHours !== undefined)
    progress.learningHours = Number(learningHours);
  progress.lastActivity = new Date();
  if (progress.progressPercentage >= 100 && !progress.completedAt) {
    progress.completedAt = new Date();
    progress.certificateEarned = true;
    await notify(userId, {
      type: "certificate",
      title: "You received a certificate",
      message: "A course certificate is now available in your profile.",
      metadata: { courseId },
    });
  }
  await progress.save();
  return progress;
}

export async function myCourses(userId) {
  const rows = await Progress.find({ employeeId: userId }).populate({
    path: "courseId",
    populate: { path: "skills", select: "name" },
  });
  return rows;
}
