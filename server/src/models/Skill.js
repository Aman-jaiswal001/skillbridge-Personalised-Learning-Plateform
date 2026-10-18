import mongoose from 'mongoose'

export const SKILL_CATEGORIES = ['Cybersecurity & Network','Academic & Core Computer Skills','Design & Creativity','Communication & Soft skills','Database & Cloud','AI & Data Science','Programming & Development']
export const SKILL_LEVELS = {
  Beginner: 1,
  Intermediate: 2,
  Advanced: 3,
  Expert: 4,
}

const skillSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true, index: true },
    category: { type: String, enum: SKILL_CATEGORIES, required: true, index: true },
    description: { type: String, default: '' },
    levels: {
      type: [String],
      default: ['Beginner', 'Intermediate', 'Advanced', 'Expert'],
    },
    requiredForRoles: [{ type: String }],
    importance: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
)

export const Skill = mongoose.model('Skill', skillSchema)
