import { randomUUID } from "node:crypto";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";

const folder = "skillbridge/study-resources";
const profilePhotoFolder = "skillbridge/profile-photos";

function configured() {
  return Boolean(
    env.cloudinaryCloudName && env.cloudinaryApiKey && env.cloudinaryApiSecret,
  );
}

let configuredClient;
async function getCloudinary() {
  if (!configured())
    throw ApiError.internal("Cloudinary storage is not configured");
  if (!configuredClient) {
    const { v2 } = await import("cloudinary");
    v2.config({
      cloud_name: env.cloudinaryCloudName,
      api_key: env.cloudinaryApiKey,
      api_secret: env.cloudinaryApiSecret,
      secure: true,
    });
    configuredClient = v2;
  }
  return configuredClient;
}

export async function uploadStudyPdf(file, client) {
  client ||= await getCloudinary();
  // Raw Cloudinary public IDs must include the extension.
  const publicId = `${folder}/${randomUUID()}.pdf`;
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () =>
        reject(
          ApiError.ai(
            "Cloudinary upload timed out. Check the server network connection and Cloudinary credentials.",
          ),
        ),
      60_000,
    );
    client.uploader.upload(
      file.path,
      {
        resource_type: "raw",
        type: "authenticated",
        public_id: publicId,
        use_filename: false,
        unique_filename: false,
        overwrite: false,
        tags: ["skillbridge-study-resource"],
        timeout: 120000,
      },
      (error, result) => {
        clearTimeout(timeout);
        if (error) {
          const code = String(error.http_code || error.code || "");
          const message = String(error.message || "")
            .replace(/[\r\n]/g, " ")
            .slice(0, 240);
          console.error("[cloudinary] study PDF upload failed", {
            code,
            message: message.replace(
              /\b(secret|api[_ -]?key|token|authorization)\b/gi,
              "[redacted]",
            ),
          });
          const userMessage =
            error.http_code === 401
              ? "Cloudinary rejected the credentials. Check CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET."
              : error.http_code === 400 && /public.?id|extension/i.test(message)
                ? "Cloudinary rejected the PDF asset identifier. Verify the configured raw asset settings."
                : "Cloudinary could not accept the PDF. Check server connectivity, Cloudinary configuration, and account upload limits.";
          return reject(new ApiError(502, userMessage));
        }
        if (!result?.public_id || result.resource_type !== "raw") {
          if (result?.public_id)
            client.uploader.destroy(
              result.public_id,
              { resource_type: "raw", type: "authenticated", invalidate: true },
              () => {},
            );
          return reject(
            ApiError.ai("Cloudinary returned invalid PDF metadata"),
          );
        }
        resolve({
          publicId: result.public_id,
          resourceType: result.resource_type,
          secureUrl: result.secure_url || "",
        });
      },
    );
  });
}

export async function uploadProfilePhoto(file, client) {
  client ||= await getCloudinary();
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(ApiError.ai("Profile photo upload timed out. Try again.")), 60_000);
    const stream = client.uploader.upload_stream(
      {
        resource_type: "image",
        folder: profilePhotoFolder,
        public_id: randomUUID(),
        overwrite: false,
        tags: ["skillbridge-profile-photo"],
        transformation: [{ width: 1200, height: 1200, crop: "limit", quality: "auto", fetch_format: "auto" }],
      },
      (error, result) => {
        clearTimeout(timeout);
        if (error) {
          console.error("[cloudinary] profile photo upload failed", {
            code: String(error.http_code || error.code || ""),
          });
          return reject(ApiError.ai("Cloudinary could not save the profile photo. Check the storage configuration and try again."));
        }
        if (!result?.public_id || result.resource_type !== "image" || !result.secure_url) {
          if (result?.public_id) client.uploader.destroy(result.public_id, { resource_type: "image", invalidate: true }, () => {});
          return reject(ApiError.ai("Cloudinary returned invalid profile photo metadata"));
        }
        resolve({ publicId: result.public_id, secureUrl: result.secure_url });
      },
    );
    stream.end(file.buffer);
  });
}

export async function deleteProfilePhoto(publicId, client) {
  if (!publicId || !publicId.startsWith(`${profilePhotoFolder}/`)) return;
  client ||= await getCloudinary();
  const result = await client.uploader.destroy(publicId, { resource_type: "image", type: "upload", invalidate: true });
  if (!['ok', 'not found'].includes(result?.result)) throw ApiError.internal("Profile photo cleanup failed");
}

export async function deleteStudyPdf(publicId, resourceType = "raw", client) {
  client ||= await getCloudinary();
  if (!publicId || !publicId.startsWith(`${folder}/`) || resourceType !== "raw")
    return;
  const result = await client.uploader.destroy(publicId, {
    resource_type: "raw",
    type: "authenticated",
    invalidate: true,
  });
  if (!["ok", "not found"].includes(result?.result))
    throw ApiError.internal("Cloud storage cleanup failed");
}

export async function getStudyPdfStream(
  publicId,
  resourceType = "raw",
  client,
) {
  client ||= await getCloudinary();
  if (!publicId || !publicId.startsWith(`${folder}/`) || resourceType !== "raw")
    throw ApiError.notFound("PDF file is unavailable");
  const url = client.utils.private_download_url(publicId, "pdf", {
    resource_type: "raw",
    type: "authenticated",
    expires_at: Math.floor(Date.now() / 1000) + 60,
  });
  const response = await fetch(url, {
    signal: AbortSignal.timeout(20_000),
    redirect: "error",
  });
  if (!response.ok || !response.body)
    throw ApiError.notFound("PDF file is unavailable from cloud storage");
  return response;
}

export function isCloudinaryConfigured() {
  return configured();
}
