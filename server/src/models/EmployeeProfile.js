import mongoose from 'mongoose'

const employeeProfileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    education: { type: String, default: '' },
    experience: { type: String, default: '' },
    department: { type: String, default: '' },
    designation: { type: String, default: '' },
    jobRole: { type: String, default: '' },
    assignment: { type: String, default: '' },
    careerGoal: { type: String, default: '' },
    location: { type: String, default: '' },
    priorTraining: [{ type: String }],
    futureRequirements: [{ type: String }],
    competencyScore: { type: Number, default: 0, min: 0, max: 100 },
  },
  { timestamps: true },
)

export const EmployeeProfile = mongoose.model('EmployeeProfile', employeeProfileSchema)
