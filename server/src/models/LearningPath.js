import mongoose from 'mongoose'

const stageCourseSchema = new mongoose.Schema(
  {
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    title: String,
    status: { type: String, enum: ['Completed', 'In Progress', 'Not Started'], default: 'Not Started' },
  },
  { _id: false },
)

const stageResourceSchema = new mongoose.Schema(
  {
    resourceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    title: String,
    provider: String,
    url: String,
    status: { type: String, enum: ['Completed', 'In Progress', 'Not Started'], default: 'Not Started' },
  },
  { _id: false },
)

const learningPathSchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    title: { type: String, default: 'My Learning Path' },
    description: { type: String, default: 'A personalized roadmap for your growth' },
    learningGoal: { type: String, default: '' },
    skillGaps: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Skill' }],
    stages: [
      {
        stageNumber: Number,
        level: { type: String, enum: ['Foundation', 'Intermediate', 'Advanced'] },
        courses: [stageCourseSchema],
        resources: [stageResourceSchema],
        progress: { type: Number, default: 0 },
        status: { type: String, enum: ['Completed', 'In Progress', 'Not Started'], default: 'Not Started' },
      },
    ],
    overallProgress: { type: Number, default: 0 },
    estimatedCompletion: { type: String, default: '3 months' },
    status: { type: String, enum: ['Active', 'Completed', 'Paused'], default: 'Active' },
    message: { type: String, default: 'You are on the right track!' },
  },
  { timestamps: true },
)

export const LearningPath = mongoose.model('LearningPath', learningPathSchema)
