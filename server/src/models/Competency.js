import mongoose from 'mongoose'

const competencySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, default: '' },
    category: { type: String, default: '' },
    skillIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Skill' }],
    roleTargets: [
      {
        role: String,
        targetPercent: { type: Number, min: 0, max: 100 },
      },
    ],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
)

export const Competency = mongoose.model('Competency', competencySchema)
