import fs from "node:fs/promises";
import path from "node:path";
import mongoose from "mongoose";
import { StudyResource } from "../models/StudyResource.js";
import { ApiError } from "../utils/ApiError.js";
import { uploadRoot } from "../middleware/upload.middleware.js";
import {
  deleteStudyPdf,
  getStudyPdfStream,
  uploadStudyPdf,
} from "./cloudinaryStorage.service.js";

const editableFields = [
  "title",
  "description",
  "type",
  "subject",
  "course",
  "year",
  "semester",
  "tags",
  "language",
  "url",
  "source",
  "isPublished",
];
const objectId = (id) => {
  if (!mongoose.isValidObjectId(id))
    throw ApiError.badRequest("Invalid resource identifier");
};

export function canonicalizeExternalUrl(value) {
  if (typeof value !== "string" || value.length > 2048)
    throw ApiError.badRequest("Enter a valid external URL");
  let url;
  try {
    url = new URL(value);
  } catch {
    throw ApiError.badRequest("Enter a valid external URL");
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    !url.hostname ||
    url.username ||
    url.password
  )
    throw ApiError.badRequest("Only safe HTTP or HTTPS links are allowed");
  url.hash = "";
  return {
    url: url.toString(),
    canonicalUrl: url.toString().replace(/\/$/, ""),
  };
}

function normalizeInput(body, { partial = false } = {}) {
  const data = {};
  for (const field of editableFields)
    if (Object.hasOwn(body, field)) data[field] = body[field];
  for (const field of ["title", "subject", "course", "year"]) {
    if (data[field] !== undefined) data[field] = String(data[field]).trim();
    if ((!partial || data[field] !== undefined) && !data[field])
      throw ApiError.badRequest(`${field} is required`);
  }
  if (data.description !== undefined)
    data.description = String(data.description).trim();
  if (data.language !== undefined)
    data.language = String(data.language).trim() || "English";
  if (data.semester !== undefined) data.semester = String(data.semester).trim();
  if (data.source !== undefined) data.source = String(data.source).trim();
  if (data.tags !== undefined) {
    if (typeof data.tags === "string") data.tags = data.tags.split(",");
    if (!Array.isArray(data.tags))
      throw ApiError.badRequest("Tags must be a list");
    data.tags = [
      ...new Set(data.tags.map((tag) => String(tag).trim()).filter(Boolean)),
    ];
  }
  if (
    typeof data.isPublished === "string" &&
    ["true", "false"].includes(data.isPublished.toLowerCase())
  )
    data.isPublished = data.isPublished.toLowerCase() === "true";
  if (data.isPublished !== undefined && typeof data.isPublished !== "boolean")
    throw ApiError.badRequest("isPublished must be true or false");
  if (data.type !== undefined && !["pdf", "link"].includes(data.type))
    throw ApiError.badRequest("Resource type must be PDF or external link");
  if (
    data.type === "link" ||
    (partial && data.url !== undefined && data.type !== "pdf")
  ) {
    const normalized = canonicalizeExternalUrl(data.url);
    data.url = normalized.url;
    data.canonicalUrl = normalized.canonicalUrl;
  }
  return data;
}

function resourceFilePath(storageKey) {
  const root = path.resolve(uploadRoot);
  const target = path.resolve(root, storageKey);
  if (
    !storageKey ||
    path.dirname(target) !== root ||
    path.extname(target).toLowerCase() !== ".pdf"
  )
    throw ApiError.notFound("PDF file is unavailable");
  return target;
}

export async function validatePdf(file) {
  if (!file) throw ApiError.badRequest("Upload a PDF file");
  if (
    path.extname(file.originalname).toLowerCase() !== ".pdf" ||
    file.mimetype !== "application/pdf"
  )
    throw ApiError.unsupported("Only PDF files are allowed");
  const handle = await fs.open(file.path, "r");
  try {
    const signature = Buffer.alloc(5);
    const { bytesRead } = await handle.read(signature, 0, 5, 0);
    if (bytesRead !== 5 || signature.toString("ascii") !== "%PDF-")
      throw ApiError.badRequest("The uploaded file is not a valid PDF");
  } finally {
    await handle.close();
  }
}

export async function listResources(query, { admin = false } = {}) {
  const filter = admin ? {} : { isPublished: true };
  for (const field of [
    "course",
    "year",
    "semester",
    "subject",
    "type",
    "language",
  ])
    if (query[field]) filter[field] = query[field];
  if (query.skill) filter.tags = query.skill;
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
    StudyResource.find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .select(
        "-storageKey -canonicalUrl -cloudinaryPublicId -cloudinaryResourceType -cloudinarySecureUrl -createdBy",
      )
      .lean(),
    StudyResource.countDocuments(filter),
  ]);
  return {
    data,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
}

export async function createResource({ body, file, userId }) {
  let data;
  try {
    data = normalizeInput(body);
    if (!["pdf", "link"].includes(data.type))
      throw ApiError.badRequest("Resource type must be PDF or external link");
    if (data.type === "pdf") {
      await validatePdf(file);
      const cloud = await uploadStudyPdf(file);
      data.url = "";
      data.canonicalUrl = undefined;
      data.storageKey = "";
      data.storageProvider = "cloudinary";
      data.cloudinaryPublicId = cloud.publicId;
      data.cloudinaryResourceType = cloud.resourceType;
      data.cloudinarySecureUrl = cloud.secureUrl;
      data.fileName = path.basename(file.originalname);
      data.fileSize = file.size;
    } else {
      if (file)
        throw ApiError.badRequest("Do not attach a file to an external link");
      if (!data.url) throw ApiError.badRequest("External URL is required");
      data.storageKey = "";
      data.storageProvider = "local";
      data.cloudinaryPublicId = "";
      data.cloudinaryResourceType = undefined;
      data.cloudinarySecureUrl = "";
      data.fileName = "";
      data.fileSize = 0;
    }
    const resource = await StudyResource.create({ ...data, createdBy: userId });
    return resource;
  } catch (error) {
    // If persistence failed after Cloudinary accepted the upload, remove that orphan.
    if (data?.cloudinaryPublicId)
      await deleteStudyPdf(data.cloudinaryPublicId).catch(() => {});
    if (file?.path) await fs.unlink(file.path).catch(() => {});
    throw error;
  }
}

export async function updateResource(id, { body, file }) {
  objectId(id);
  const resource = await StudyResource.findById(id);
  if (!resource) {
    if (file?.path) await fs.unlink(file.path).catch(() => {});
    throw ApiError.notFound("Study resource not found");
  }
  const oldStorageKey = resource.storageKey;
  const oldProvider =
    resource.storageProvider ||
    (resource.cloudinaryPublicId ? "cloudinary" : "local");
  const oldCloudinaryPublicId = resource.cloudinaryPublicId;
  const oldCloudinaryResourceType = resource.cloudinaryResourceType || "raw";
  let uploadedCloudinaryAsset;
  try {
    const data = normalizeInput(body, { partial: true });
    const nextType = data.type || resource.type;
    if (nextType === "pdf") {
      if (file) {
        await validatePdf(file);
        uploadedCloudinaryAsset = await uploadStudyPdf(file);
        data.storageKey = "";
        data.storageProvider = "cloudinary";
        data.cloudinaryPublicId = uploadedCloudinaryAsset.publicId;
        data.cloudinaryResourceType = uploadedCloudinaryAsset.resourceType;
        data.cloudinarySecureUrl = uploadedCloudinaryAsset.secureUrl;
        data.fileName = path.basename(file.originalname);
        data.fileSize = file.size;
      } else if (
        resource.type !== "pdf" ||
        !(resource.storageKey || resource.cloudinaryPublicId)
      )
        throw ApiError.badRequest("Upload a PDF file for this resource");
      data.url = "";
      data.canonicalUrl = undefined;
    } else {
      if (file)
        throw ApiError.badRequest("Do not attach a file to an external link");
      const link = canonicalizeExternalUrl(data.url ?? resource.url);
      data.url = link.url;
      data.canonicalUrl = link.canonicalUrl;
      data.storageKey = "";
      data.storageProvider = "local";
      data.cloudinaryPublicId = "";
      data.cloudinaryResourceType = undefined;
      data.cloudinarySecureUrl = "";
      data.fileName = "";
      data.fileSize = 0;
    }
    if (nextType === "pdf" && !file) {
      data.storageProvider =
        resource.storageProvider ||
        (resource.cloudinaryPublicId ? "cloudinary" : "local");
      data.storageKey = resource.storageKey || "";
      data.cloudinaryPublicId = resource.cloudinaryPublicId || "";
      data.cloudinaryResourceType = resource.cloudinaryResourceType;
      data.cloudinarySecureUrl = resource.cloudinarySecureUrl || "";
    }
    Object.assign(resource, data);
    await resource.save();
    if (
      oldProvider === "cloudinary" &&
      oldCloudinaryPublicId &&
      oldCloudinaryPublicId !== resource.cloudinaryPublicId
    )
      await deleteStudyPdf(
        oldCloudinaryPublicId,
        oldCloudinaryResourceType,
      ).catch(() => {});
    if (
      oldProvider !== "cloudinary" &&
      oldStorageKey &&
      oldStorageKey !== resource.storageKey
    )
      await fs.unlink(resourceFilePath(oldStorageKey)).catch(() => {});
    return resource;
  } catch (error) {
    if (uploadedCloudinaryAsset?.publicId)
      await deleteStudyPdf(
        uploadedCloudinaryAsset.publicId,
        uploadedCloudinaryAsset.resourceType,
      ).catch(() => {});
    if (file?.path) await fs.unlink(file.path).catch(() => {});
    throw error;
  }
}

export async function deleteResource(id) {
  objectId(id);
  const resource = await StudyResource.findById(id);
  if (!resource) throw ApiError.notFound("Study resource not found");
  const provider =
    resource.storageProvider ||
    (resource.cloudinaryPublicId ? "cloudinary" : "local");
  // Remove the DB reference first. A failed DB operation must never leave a live record pointing to a deleted cloud object.
  await resource.deleteOne();
  if (provider === "cloudinary" && resource.cloudinaryPublicId)
    await deleteStudyPdf(
      resource.cloudinaryPublicId,
      resource.cloudinaryResourceType || "raw",
    ).catch(() => {});
  else if (resource.storageKey)
    await fs.unlink(resourceFilePath(resource.storageKey)).catch(() => {});
  return { id: resource._id, deleted: true };
}

export async function getPdf(id, user, download = false) {
  objectId(id);
  const filter =
    user.role === "ADMIN" ? { _id: id } : { _id: id, isPublished: true };
  const resource = await StudyResource.findOne(filter).select(
    "type storageKey storageProvider cloudinaryPublicId cloudinaryResourceType fileName fileSize",
  );
  if (
    !resource ||
    resource.type !== "pdf" ||
    !(resource.storageKey || resource.cloudinaryPublicId)
  )
    throw ApiError.notFound("Published PDF resource not found");
  const provider =
    resource.storageProvider ||
    (resource.cloudinaryPublicId ? "cloudinary" : "local");
  if (provider === "cloudinary") {
    const response = await getStudyPdfStream(
      resource.cloudinaryPublicId,
      resource.cloudinaryResourceType || "raw",
    );
    return {
      stream: response.body,
      fileName: resource.fileName,
      fileSize: resource.fileSize,
      disposition: download ? "attachment" : "inline",
    };
  }
  const filePath = resourceFilePath(resource.storageKey);
  try {
    await fs.access(filePath);
  } catch {
    throw ApiError.notFound("PDF file is missing from storage");
  }
  return {
    filePath,
    fileName: resource.fileName,
    fileSize: resource.fileSize,
    disposition: download ? "attachment" : "inline",
  };
}
