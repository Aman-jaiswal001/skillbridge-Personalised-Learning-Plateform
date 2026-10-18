import mongoose from "mongoose";
import { YouTubeLearningItem } from "../models/YouTubeLearningItem.js";
import { YouTubeResource } from "../models/YouTubeResource.js";
import { EmployeeSkill } from "../models/EmployeeSkill.js";
import { Skill } from "../models/Skill.js";
import { ApiError } from "../utils/ApiError.js";
import { isMasteryLevelUnlocked, MASTERY_LEVELS, masteryLevelRank, normalizeMasteryLevel, unlockedMasteryLevel } from "../utils/skillProgress.js";

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const fields = [
  "title",
  "description",
  "youtubeUrl",
  "thumbnailUrl",
  "instructor",
  "category",
  "skills",
  "subtopics",
  "difficulty",
  "duration",
  "language",
  "prerequisites",
  "objectives",
  "isPublished",
];

export function extractYouTubeVideoId(value) {
  if (typeof value !== "string" || value.length > 500)
    throw ApiError.badRequest("Enter a valid YouTube URL");
  let url;
  try {
    url = new URL(value);
  } catch {
    throw ApiError.badRequest("Enter a valid YouTube URL");
  }
  if (!["https:", "http:"].includes(url.protocol))
    throw ApiError.badRequest("Enter a valid YouTube URL");
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  let id = "";
  if (host === "youtu.be")
    id = url.pathname.split("/").filter(Boolean)[0] || "";
  else if (
    [
      "youtube.com",
      "m.youtube.com",
      "music.youtube.com",
      "youtube-nocookie.com",
    ].includes(host)
  ) {
    if (url.pathname === "/watch") id = url.searchParams.get("v") || "";
    else if (/^\/(embed|shorts|live)\//.test(url.pathname))
      id = url.pathname.split("/")[2] || "";
  }
  if (!VIDEO_ID.test(id))
    throw ApiError.badRequest(
      "YouTube URL must contain a valid 11-character video ID",
    );
  return id;
}

async function assertVideoLevelUnlocked(userId, resource) {
  const resourceLevel = normalizeMasteryLevel(resource.difficulty)
  // Beginner lessons are the catalog entry point for new learners. Higher
  // levels still require enrollment and follow the skill's mastery unlock.
  if (resourceLevel === 'Beginner') return
  const names = resource.skills || []
  if (!names.length) return
  const regexes = names.map((name) => new RegExp(`^${escapeRegex(name)}$`, 'i'))
  const skillDocs = await Skill.find({ name: { $in: regexes } }).select('_id name').lean()
  if (!skillDocs.length) return
  const rows = await EmployeeSkill.find({ employeeId: userId, skillId: { $in: skillDocs.map((skill) => skill._id) } }).lean()
  const unlocked = rows.some((row) => isMasteryLevelUnlocked(resourceLevel, unlockedMasteryLevel(row)))
  if (!rows.length) throw ApiError.forbidden('Add this video’s skill to My Skills before opening its learning stage')
  if (!unlocked) throw ApiError.forbidden(`${resourceLevel} lessons are locked until you pass the previous level assessment`)
}

function normalizeInput(body, { partial = false } = {}) {
  const input = {};
  for (const key of fields)
    if (Object.hasOwn(body, key)) input[key] = body[key];
  if (!partial || Object.hasOwn(input, "youtubeUrl")) {
    if (!input.youtubeUrl && partial)
      throw ApiError.badRequest("YouTube URL cannot be empty");
    input.videoId = extractYouTubeVideoId(input.youtubeUrl);
    if (!input.thumbnailUrl)
      input.thumbnailUrl = `https://img.youtube.com/vi/${input.videoId}/hqdefault.jpg`;
  } else if (
    partial &&
    Object.hasOwn(input, "thumbnailUrl") &&
    !input.thumbnailUrl
  ) {
    throw ApiError.badRequest("Thumbnail URL cannot be empty");
  }
  if (input.title !== undefined) input.title = String(input.title).trim();
  if (input.category !== undefined)
    input.category = String(input.category).trim();
  for (const key of ["skills", "subtopics", "prerequisites", "objectives"]) {
    if (input[key] !== undefined) {
      if (!Array.isArray(input[key]))
        throw ApiError.badRequest(`${key} must be a list`);
      input[key] = [
        ...new Set(
          input[key].map((item) => String(item).trim()).filter(Boolean),
        ),
      ];
    }
  }
  if (input.isPublished !== undefined && typeof input.isPublished !== "boolean")
    throw ApiError.badRequest("isPublished must be true or false");
  if (input.title !== undefined && !input.title)
    throw ApiError.badRequest("Title is required");
  if (input.category !== undefined && !input.category)
    throw ApiError.badRequest("Course/category is required");
  return input;
}

function validateId(id) {
  if (!mongoose.isValidObjectId(id))
    throw ApiError.badRequest("Invalid resource identifier");
}

export async function listResources(query, { admin = false, userId } = {}) {
  const filter = admin ? {} : { isPublished: true };
  if (query.category) filter.category = query.category;
  if (query.difficulty) filter.difficulty = query.difficulty;
  if (query.skill) filter.skills = new RegExp(`^${escapeRegex(query.skill)}$`, 'i');
  if (!admin && userId && query.skill) {
    const skill = await Skill.findOne({ name: new RegExp(`^${escapeRegex(query.skill)}$`, 'i') }).select('_id')
    if (skill) {
      const enrollment = await EmployeeSkill.findOne({ employeeId: userId, skillId: skill._id }).lean()
      const unlockedRank = enrollment ? masteryLevelRank(unlockedMasteryLevel(enrollment)) : -1
      const allowedLevels = enrollment ? MASTERY_LEVELS.slice(0, unlockedRank + 1) : ['Beginner']
      filter.difficulty = query.difficulty ? (allowedLevels.includes(query.difficulty) ? query.difficulty : { $in: [] }) : { $in: allowedLevels }
    }
  }
  const search = String(query.search || "").trim();
  if (search) filter.$text = { $search: search.slice(0, 100) };
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(
    50,
    Math.max(1, Number.parseInt(query.limit, 10) || 20),
  );
  const sort =
    query.sort === "oldest"
      ? { createdAt: 1 }
      : query.sort === "title"
        ? { title: 1 }
        : { createdAt: -1 };
  const [data, total] = await Promise.all([
    YouTubeResource.find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    YouTubeResource.countDocuments(filter),
  ]);
  let visibleData = data
  if (!admin && userId && data.length) {
    const studentSkills = await EmployeeSkill.find({ employeeId: userId }).populate('skillId', 'name').lean()
    const tagNames = [...new Set(data.flatMap((resource) => resource.skills || []).map((name) => String(name).trim()).filter(Boolean))]
    const knownSkills = await Skill.find({ name: { $in: tagNames.map((name) => new RegExp(`^${escapeRegex(name)}$`, 'i')) } }).select('name').lean()
    const knownSkillNames = new Set(knownSkills.map((skill) => skill.name.toLowerCase().trim()))
    visibleData = data.map((resource) => {
      const tags = new Set((resource.skills || []).map((name) => String(name).toLowerCase().trim()))
      const related = studentSkills.filter((row) => tags.has(String(row.skillId?.name || '').toLowerCase().trim()))
      const isSkillTagged = [...tags].some((name) => knownSkillNames.has(name))
      const beginnerEntry = normalizeMasteryLevel(resource.difficulty) === 'Beginner'
      const unlocked = beginnerEntry || related.some((row) => isMasteryLevelUnlocked(resource.difficulty, unlockedMasteryLevel(row)))
      const requiresEnrollment = isSkillTagged && !related.length && !beginnerEntry
      return { ...resource, locked: isSkillTagged && !unlocked, requiresEnrollment, unlockedLevel: related.map(unlockedMasteryLevel).sort((a, b) => masteryLevelRank(b) - masteryLevelRank(a))[0] || null }
    })
  }
  return {
    data: visibleData,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
}

export async function createResource(body) {
  return YouTubeResource.create(normalizeInput(body));
}

export async function updateResource(id, body) {
  validateId(id);
  const resource = await YouTubeResource.findByIdAndUpdate(
    id,
    normalizeInput(body, { partial: true }),
    { new: true, runValidators: true },
  );
  if (!resource) throw ApiError.notFound("YouTube resource not found");
  return resource;
}

export async function deleteResource(id) {
  validateId(id);
  const resource = await YouTubeResource.findById(id);
  if (!resource) throw ApiError.notFound("YouTube resource not found");
  await YouTubeLearningItem.updateMany(
    { resourceId: resource._id },
    { $set: { resourceId: null } },
  );
  await resource.deleteOne();
  return { id: resource._id, preservedLearningItems: true };
}

export async function addLearningItem(userId, resourceId) {
  validateId(resourceId);
  const resource = await YouTubeResource.findOne({
    _id: resourceId,
    isPublished: true,
  }).lean();
  if (!resource)
    throw ApiError.notFound("Published YouTube resource not found");
  await assertVideoLevelUnlocked(userId, resource)
  let item = await YouTubeLearningItem.findOne({ userId, resourceId });
  if (item) {
    item.lastAccessedAt = new Date();
    if (item.status === "Not Started") item.status = "In Progress";
    await item.save();
    return { item, existing: true };
  }
  try {
    item = await YouTubeLearningItem.create({
      userId,
      resourceId,
      resource,
      status: "In Progress",
      lastAccessedAt: new Date(),
    });
  } catch (error) {
    if (error.code !== 11000) throw error;
    item = await YouTubeLearningItem.findOneAndUpdate(
      { userId, resourceId },
      { $set: { lastAccessedAt: new Date(), status: "In Progress" } },
      { new: true },
    );
    return { item, existing: true };
  }
  return { item, existing: false };
}

export async function listLearningItems(userId) {
  return YouTubeLearningItem.find({ userId }).sort({ updatedAt: -1 }).lean();
}

export async function getLearningItem(userId, id) {
  validateId(id);
  const item = await YouTubeLearningItem.findOne({ _id: id, userId });
  if (!item) throw ApiError.notFound("Learning item not found");
  await assertVideoLevelUnlocked(userId, item.resource)
  if (item.status !== "Completed") item.status = "In Progress";
  item.lastAccessedAt = new Date();
  await item.save();
  return item;
}

export async function updateLearningItem(userId, id, body) {
  validateId(id);
  if (body.status !== "Completed")
    throw ApiError.badRequest("Only completion can be updated");
  const item = await YouTubeLearningItem.findOne({ _id: id, userId });
  if (!item) throw ApiError.notFound("Learning item not found");
  item.status = "Completed";
  item.completedAt = new Date();
  await item.save();
  return item;
}

export async function removeLearningItem(userId, id) {
  validateId(id);
  const item = await YouTubeLearningItem.findOneAndDelete({ _id: id, userId });
  if (!item) throw ApiError.notFound("Learning item not found");
  return { id: item._id };
}
