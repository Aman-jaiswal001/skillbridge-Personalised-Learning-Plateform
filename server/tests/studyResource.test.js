import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { ReadableStream } from "node:stream/web";
import { Readable } from "node:stream";
import { StudyResource } from "../src/models/StudyResource.js";
import {
  canonicalizeExternalUrl,
  validatePdf,
} from "../src/services/studyResource.service.js";
import {
  deleteStudyPdf,
  getStudyPdfStream,
  uploadStudyPdf,
} from "../src/services/cloudinaryStorage.service.js";

test("external resources accept safe HTTP URLs and canonicalize duplicates", () => {
  assert.deepEqual(
    canonicalizeExternalUrl("https://docs.python.org/3/#tutorial"),
    {
      url: "https://docs.python.org/3/",
      canonicalUrl: "https://docs.python.org/3",
    },
  );
  assert.equal(
    canonicalizeExternalUrl("https://docs.python.org/3").canonicalUrl,
    "https://docs.python.org/3",
  );
});

test("external resources reject unsafe schemes and credentialed URLs", () => {
  assert.throws(
    () => canonicalizeExternalUrl("javascript:alert(1)"),
    /HTTP or HTTPS/,
  );
  assert.throws(
    () => canonicalizeExternalUrl("https://user:pass@example.org/"),
    /HTTP or HTTPS/,
  );
});

test("PDF validation requires a PDF signature, extension, and MIME type", async (t) => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "skillbridge-study-resource-"),
  );
  const validPath = path.join(directory, "valid.pdf");
  const invalidPath = path.join(directory, "invalid.pdf");
  await fs.writeFile(validPath, "%PDF-1.7\nresource test");
  await fs.writeFile(invalidPath, "not a pdf");
  t.after(() => fs.rm(directory, { recursive: true, force: true }));

  await assert.doesNotReject(
    validatePdf({
      path: validPath,
      originalname: "notes.pdf",
      mimetype: "application/pdf",
    }),
  );
  await assert.rejects(
    validatePdf({
      path: invalidPath,
      originalname: "notes.pdf",
      mimetype: "application/pdf",
    }),
    /not a valid PDF/,
  );
  await assert.rejects(
    validatePdf({
      path: validPath,
      originalname: "notes.txt",
      mimetype: "text/plain",
    }),
    /Only PDF/,
  );
});

test("study-resource text index does not use the resource language as Mongo text override", () => {
  const textIndex = StudyResource.schema
    .indexes()
    .find(([keys]) => Object.values(keys).includes("text"));
  assert.equal(textIndex?.[1]?.language_override, "textSearchLanguage");
});

test("Cloudinary upload uses unique private raw IDs and returns only server metadata", async () => {
  let uploaded;
  const fakeClient = {
    uploader: {
      upload(file, options, callback) {
        uploaded = { file, options };
        callback(null, {
          public_id: options.public_id,
          resource_type: "raw",
          secure_url: "https://private.example/file",
        });
      },
    },
  };
  const first = await uploadStudyPdf({ path: "staged.pdf" }, fakeClient);
  const second = await uploadStudyPdf({ path: "staged.pdf" }, fakeClient);
  assert.equal(uploaded.options.resource_type, "raw");
  assert.equal(uploaded.options.type, "authenticated");
  assert.match(first.publicId, /^skillbridge\/study-resources\/[\w-]+\.pdf$/);
  assert.notEqual(first.publicId, second.publicId);
  assert.equal(first.resourceType, "raw");
});

test("Cloudinary upload failures do not expose provider errors", async () => {
  const fakeClient = {
    uploader: {
      upload(_file, _options, callback) {
        callback(new Error("provider secret response"));
      },
    },
  };
  await assert.rejects(
    uploadStudyPdf({ path: "staged.pdf" }, fakeClient),
    (error) => error.statusCode === 502 && !error.message.includes("secret"),
  );
});

test("Cloudinary delete uses only IDs in the dedicated folder and tolerates missing assets", async () => {
  let deleted;
  const fakeClient = {
    uploader: {
      async destroy(...args) {
        deleted = args;
        return { result: "not found" };
      },
    },
  };
  await deleteStudyPdf(
    "skillbridge/study-resources/known-id",
    "raw",
    fakeClient,
  );
  assert.equal(deleted[0], "skillbridge/study-resources/known-id");
  assert.equal(deleted[1].resource_type, "raw");
  await deleteStudyPdf("attacker/asset", "raw", fakeClient);
  assert.equal(deleted[0], "skillbridge/study-resources/known-id");
});

test("private Cloudinary PDF delivery is short lived, authenticated, and streamed", async (t) => {
  const originalFetch = globalThis.fetch;
  let signedUrl;
  let requestOptions;
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array([1, 2]));
      controller.close();
    },
  });
  globalThis.fetch = async (url, options) => {
    signedUrl = url;
    requestOptions = options;
    return { ok: true, body };
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  const fakeClient = {
    utils: {
      private_download_url(id, format, options) {
        assert.equal(id, "skillbridge/study-resources/a");
        assert.equal(format, "pdf");
        assert.equal(options.type, "authenticated");
        return "https://signed.example/temporary";
      },
    },
  };
  const response = await getStudyPdfStream(
    "skillbridge/study-resources/a",
    "raw",
    fakeClient,
  );
  assert.equal(response.body, body);
  assert.equal(signedUrl, "https://signed.example/temporary");
  assert.equal(requestOptions.redirect, "error");
});

test("Cloudinary web streams can be converted to Node streams for Express piping", () => {
  const webStream = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array([37, 80, 68, 70]));
      controller.close();
    },
  });
  const nodeStream = Readable.fromWeb(webStream);
  assert.equal(typeof nodeStream.on, "function");
  assert.equal(typeof nodeStream.pipe, "function");
});
