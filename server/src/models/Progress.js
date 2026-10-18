import mongoose from 'mongoose'

const progressSchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    progressPercentage: { type: Number, default: 0, min: 0, max: 100 },
    completedModules: [{ type: String }],
    learningHours: { type: Number, default: 0 },
    lastActivity: { type: Date, default: Date.now },
    completedAt: { type: Date },
    enrolledAt: { type: Date, default: Date.now },
    certificateEarned: { type: Boolean, default: false },
  },
  { timestamps: true },
)

progressSchema.index({ employeeId: 1, courseId: 1 }, { unique: true })

export const Progress = mongoose.model('Progress', progressSchema)
