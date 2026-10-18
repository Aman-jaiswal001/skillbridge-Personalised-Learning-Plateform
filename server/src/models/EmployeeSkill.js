import mongoose from 'mongoose'

const employeeSkillSchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    skillId: { type: mongoose.Schema.Types.ObjectId, ref: 'Skill', required: true, index: true },
    currentLevel: { type: Number, min: 1, max: 4, default: 1 },
    targetLevel: { type: Number, min: 1, max: 4, default: 3 },
    currentPercent: { type: Number, min: 0, max: 100, default: 0 },
    targetPercent: { type: Number, min: 0, max: 100, default: 80 },
    confidence: { type: Number, min: 0, max: 100, default: 50 },
    source: { type: String, enum: ['self', 'assessment', 'admin', 'system'], default: 'self' },
    lastAssessedAt: { type: Date },
  },
  { timestamps: true },
)

employeeSkillSchema.index({ employeeId: 1, skillId: 1 }, { unique: true })

employeeSkillSchema.virtual('gap').get(function gap() {
  return Math.max(0, this.targetLevel - this.currentLevel)
})

employeeSkillSchema.virtual('percentGap').get(function percentGap() {
  return Math.max(0, this.targetPercent - this.currentPercent)
})

employeeSkillSchema.set('toJSON', { virtuals: true })
employeeSkillSchema.set('toObject', { virtuals: true })

export const EmployeeSkill = mongoose.model('EmployeeSkill', employeeSkillSchema)
