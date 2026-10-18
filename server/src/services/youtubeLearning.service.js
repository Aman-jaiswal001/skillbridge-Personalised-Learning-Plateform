import mongoose from "mongoose";
import { YouTubeLearningItem } from "../models/YouTubeLearningItem.js";
import { YouTubeResource } from "../models/YouTubeResource.js";
import { ApiError } from "../utils/ApiError.js";

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
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

export async function listResources(query, { admin = false } = {}) {
  const filter = admin ? {} : { isPublished: true };
  if (query.category) filter.category = query.category;
  if (query.difficulty) filter.difficulty = query.difficulty;
  if (query.skill) filter.skills = query.skill;
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
  return {
    data,
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
