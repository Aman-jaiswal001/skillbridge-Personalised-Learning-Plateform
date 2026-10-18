import mongoose from "mongoose";

const assessmentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },

    description: { type: String, default: "" },

    category: {
      type: String,
      default: "",
      index: true,
    },

    skills: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Skill",
      },
    ],

    questions: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Question",
    },
  ],

    duration: {
      type: Number,
      default: 30,
    },

    durationLabel: {
      type: String,
      default: "",
    },

    passingScore: {
      type: Number,
      default: 60,
    },

    allowRetakes: { type: Boolean, default: true },

    scheduledAt: {
      type: Date,
    },

    status: {
      type: String,
      enum: ["Upcoming", "Scheduled", "Active", "Completed"],
      default: "Active",
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

export const Assessment = mongoose.model("Assessment", assessmentSchema);
