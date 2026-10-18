import mongoose from "mongoose";

const moduleSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    duration: { type: String, default: "" },
    order: { type: Number, default: 0 },
  },
  { _id: true },
);

const courseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, index: true },
    description: { type: String, default: "" },
    url: { type: String, default: "", trim: true },
    provider: { type: String, default: "iGOT Karmayogi" },
    igotCourseId: { type: String, default: "", index: true },
    category: { type: String, default: "", index: true },
    skills: [{ type: mongoose.Schema.Types.ObjectId, ref: "Skill" }],
    level: {
      type: String,
      enum: ["Beginner", "Intermediate", "Advanced", "Expert"],
      default: "Beginner",
    },
    duration: { type: String, default: "" },
    durationHours: { type: Number, default: 0 },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    learnerCount: { type: Number, default: 0 },
    modules: [moduleSchema],
    outcomes: [{ type: String }],
    certificateAvailable: { type: Boolean, default: true },
    source: {
      type: String,
      enum: ["internal", "igot", "nssta", "meity"],
      default: "internal",
    },
    tab: { type: String, default: "" },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

courseSchema.index({ title: "text", description: "text" });

export const Course = mongoose.model("Course", courseSchema);
