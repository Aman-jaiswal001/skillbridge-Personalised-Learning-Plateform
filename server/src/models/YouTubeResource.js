import mongoose from "mongoose";

const youtubeResourceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: "", trim: true, maxlength: 5000 },
    youtubeUrl: { type: String, required: true, trim: true },
    videoId: { type: String, required: true, unique: true, index: true },
    thumbnailUrl: { type: String, required: true },
    instructor: { type: String, default: "", trim: true, maxlength: 120 },
    category: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
      index: true,
    },
    skills: [{ type: String, trim: true, maxlength: 60 }],
    subtopics: [{ type: String, trim: true, maxlength: 120 }],
    difficulty: {
      type: String,
      enum: ["Beginner", "Intermediate", "Advanced"],
      default: "Beginner",
      index: true,
    },
    duration: { type: String, default: "", trim: true, maxlength: 40 },
    language: { type: String, default: "Hindi", trim: true, maxlength: 60 },
    prerequisites: [{ type: String, trim: true, maxlength: 200 }],
    objectives: [{ type: String, trim: true, maxlength: 300 }],
    isPublished: { type: Boolean, default: false, index: true },
  },
  { timestamps: true, autoIndex: false },
);

youtubeResourceSchema.index({
  title: "text",
  description: "text",
  category: "text",
  skills: "text",
}, { name: "youtube_resource_text_search", language_override: "textSearchLanguage" });

export const YouTubeResource = mongoose.model(
  "YouTubeResource",
  youtubeResourceSchema,
);
