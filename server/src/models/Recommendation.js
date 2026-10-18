import mongoose from "mongoose";

const recommendationSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    skillGap: { type: String, default: "" },
    reason: { type: String, default: "" },
    priority: {
      type: String,
      enum: ["Critical", "High", "Medium", "Low"],
      default: "Medium",
      index: true,
    },
    score: { type: Number, default: 0 },
    matchedSkills: [{ type: String }],
    gapAddressed: { type: String, default: "" },
    source: {
      type: String,
      enum: ["engine", "llm", "igot", "admin"],
      default: "engine",
    },
  },
  { timestamps: true },
);

recommendationSchema.index({ employeeId: 1, courseId: 1 }, { unique: true });

export const Recommendation = mongoose.model(
  "Recommendation",
  recommendationSchema,
);
