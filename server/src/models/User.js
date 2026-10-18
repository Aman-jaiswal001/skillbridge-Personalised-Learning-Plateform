import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const ROLES = ['STUDENT', 'ADMIN', 'TRAINER']

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    password: { type: String, required: true, select: false },
    employeeId: { type: String, required: true, unique: true, trim: true, index: true },
    role: { type: String, enum: [...ROLES, 'EMPLOYEE'], default: 'STUDENT', index: true },
    department: { type: String, default: '', index: true },
    designation: { type: String, default: '' },
    phone: { type: String, default: '' },
    isActive: { type: Boolean, default: true, index: true },
    lastLogin: { type: Date },
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },
  },
  { timestamps: true },
)

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return
  this.password = await bcrypt.hash(this.password, 12)
})

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password)
}

userSchema.methods.toSafeJSON = function toSafeJSON() {
  const obj = this.toObject({ virtuals: true })
  delete obj.password
  delete obj.resetPasswordToken
  delete obj.resetPasswordExpires
  delete obj.__v
  return obj
}

userSchema.set('toJSON', {
  transform(_doc, ret) {
    delete ret.password
    delete ret.resetPasswordToken
    delete ret.resetPasswordExpires
    delete ret.__v
    return ret
  },
})

export const USER_ROLES = ROLES
export const User = mongoose.model('User', userSchema)
