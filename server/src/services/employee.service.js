import { User } from '../models/User.js'
import { EmployeeProfile } from '../models/EmployeeProfile.js'
import { EmployeeSkill } from '../models/EmployeeSkill.js'
import { Skill } from '../models/Skill.js'
import { Progress } from '../models/Progress.js'
import { AssessmentResult } from '../models/AssessmentResult.js'
import { YouTubeLearningItem } from '../models/YouTubeLearningItem.js'
import { ApiError } from '../utils/ApiError.js'
import { deleteProfilePhoto, uploadProfilePhoto } from './cloudinaryStorage.service.js'
import { analyseEmployeeSkills, percentToLevel } from '../ai/skillGap/skillGap.engine.js'
import { mapCompetencyScore } from '../ai/skillGap/competencyMapper.js'
import { calculateSkillProficiency, getSkillAssessmentEvidence, MASTERY_LEVELS, masteryLevelRank, normalizeMasteryLevel, skillProgressStatus, startingMasteryLevel, unlockedMasteryLevel, updateMasteryUnlock } from '../utils/skillProgress.js'

export async function getEmployeeBundle(userId) {
  const user = await User.findById(userId)
  if (!user) throw ApiError.notFound('Employee not found')
  const profile = await EmployeeProfile.findOne({ userId })
  const skills = await EmployeeSkill.find({ employeeId: userId }).populate('skillId')
  const gaps = analyseEmployeeSkills(skills)
  const progress = await Progress.find({ employeeId: userId })
  const assessmentsTaken = await AssessmentResult.countDocuments({ employeeId: userId, $or: [{ status: 'COMPLETED' }, { status: { $exists: false } }] })
  const coursesCompleted = progress.filter((p) => p.progressPercentage >= 100).length
  const learningHours = progress.reduce((s, p) => s + (p.learningHours || 0), 0)
  const certificates = progress.filter((p) => p.certificateEarned).length
  const competency = profile?.competencyScore || gaps.overallCompetency

  return {
    user: user.toSafeJSON(),
    profile,
    stats: {
      overallCompetency: competency,
      skillsAnalysed: skills.length,
      coursesCompleted,
      assessmentsTaken,
      certificates,
      learningHours,
      streak: 12,
    },
    gaps,
  }
}

export async function updateMe(userId, payload) {
  const user = await User.findById(userId)
  if (!user) throw ApiError.notFound('Employee not found')
  const allowed = ['name', 'phone', 'department', 'designation']
  for (const key of allowed) {
    if (payload[key] !== undefined) user[key] = payload[key]
  }
  await user.save()

  const profile = await EmployeeProfile.findOneAndUpdate(
    { userId },
    {
      $set: {
        education: payload.education ?? undefined,
        experience: payload.experience ?? undefined,
        department: payload.department ?? user.department,
        designation: payload.designation ?? user.designation,
        jobRole: payload.jobRole ?? payload.designation,
        assignment: payload.assignment,
        careerGoal: payload.careerGoal,
        location: payload.location,
        priorTraining: payload.priorTraining,
        futureRequirements: payload.futureRequirements,
      },
    },
    { new: true, upsert: true },
  )
  return { user: user.toSafeJSON(), profile }
}

export async function updateProfilePhoto(userId, file) {
  if (!file?.buffer?.length) throw ApiError.badRequest('Choose a profile photo to upload')
  if (file.buffer.length > 5 * 1024 * 1024) throw ApiError.payloadTooLarge('Profile photos must be 5 MB or smaller')
  const signature = file.buffer
  const actualType = signature[0] === 0xff && signature[1] === 0xd8 && signature[2] === 0xff
    ? 'image/jpeg'
    : signature[0] === 0x89 && signature.subarray(1, 4).toString() === 'PNG'
      ? 'image/png'
      : signature.subarray(0, 4).toString() === 'RIFF' && signature.subarray(8, 12).toString() === 'WEBP'
        ? 'image/webp'
        : ''
  if (!actualType || actualType !== file.mimetype) throw ApiError.unsupported('The profile photo must be a valid JPG, PNG, or WebP image')

  const user = await User.findById(userId).select('+profilePhotoPublicId')
  if (!user) throw ApiError.notFound('Employee not found')
  const uploaded = await uploadProfilePhoto(file)
  const previousPublicId = user.profilePhotoPublicId
  user.profilePhotoUrl = uploaded.secureUrl
  user.profilePhotoPublicId = uploaded.publicId
  try {
    await user.save()
  } catch (error) {
    await deleteProfilePhoto(uploaded.publicId).catch(() => {})
    throw error
  }
  if (previousPublicId && previousPublicId !== uploaded.publicId) {
    await deleteProfilePhoto(previousPublicId).catch((error) => console.error('[profile] old photo cleanup failed', error.message))
  }
  return user.toSafeJSON()
}

export async function listMySkills(userId) {
  const [videoItems, attempts] = await Promise.all([
    YouTubeLearningItem.find({ userId }).select('resource status completedAt').lean(),
    AssessmentResult.find({ employeeId: userId, $or: [{ status: 'COMPLETED' }, { status: { $exists: false } }] }).populate('assessmentId', 'level difficulty passingScore').sort({ completedAt: -1, submittedAt: -1 }).limit(500).lean(),
  ])
  const assessedSkillIds = [...new Set(attempts.flatMap((attempt) => (attempt.skillPerformance || []).map((row) => row.skillId).filter(Boolean).map(String)))]
  const existingSkillIds = new Set((await EmployeeSkill.distinct('skillId', { employeeId: userId })).map(String))
  for (const skillId of assessedSkillIds) {
    if (existingSkillIds.has(skillId) || !(await Skill.exists({ _id: skillId }))) continue
    await EmployeeSkill.updateOne(
      { employeeId: userId, skillId },
      { $setOnInsert: { currentPercent: 0, proficiencyBaseline: 0, targetPercent: 80, currentLevel: 1, targetLevel: 3, source: 'assessment' } },
      { upsert: true },
    )
  }
  const skillRows = await EmployeeSkill.find({ employeeId: userId }).populate('skillId').lean()
  const rows = skillRows
  const gaps = analyseEmployeeSkills(rows)
  const skillDetails = []
  for (const skill of gaps.skillWise) {
    const normalized = skill.skill.toLowerCase().trim()
    // One latest result per assessment contributes to proficiency; retries remain visible as history.
    const evidence = getSkillAssessmentEvidence(attempts, skill.skillId, normalized)
    const relatedAttempts = evidence.history
    const assessmentScores = evidence.latestPerAssessment.map((attempt) => attempt.score)
    const latestAssessment = relatedAttempts[0]
    const previousAssessment = relatedAttempts[1]
    const lectures = videoItems.filter((item) => (item.resource?.skills || []).some((name) => String(name).toLowerCase().trim() === normalized))
    const completedLectures = lectures.filter((item) => item.status === 'Completed').length
    const baseline = Number(rows.find((row) => String(row.skillId?._id || row.skillId) === String(skill.skillId))?.proficiencyBaseline ?? skill.currentPercent)
    const currentPercent = assessmentScores.length ? calculateSkillProficiency(baseline, assessmentScores) : skill.currentPercent
    const targetPercent = skill.targetPercent
    const gap = Math.max(0, targetPercent - currentPercent)
    const dbRow = rows.find((row) => String(row.skillId?._id || row.skillId) === String(skill.skillId))
    const startingLevel = startingMasteryLevel(dbRow)
    const currentMastery = { startingLevel, unlockedLevel: unlockedMasteryLevel(dbRow), passedLevels: dbRow?.passedLevels || [] }
    const rebuiltMastery = relatedAttempts.slice().reverse().reduce((state, attempt) => updateMasteryUnlock(state, attempt.level, attempt.passed), currentMastery)
    const passedLevels = rebuiltMastery.passedLevels
    const unlockedLevel = rebuiltMastery.unlockedLevel
    if (dbRow && assessmentScores.length && (dbRow.currentPercent !== currentPercent || dbRow.proficiencyBaseline == null)) {
      await EmployeeSkill.updateOne({ _id: dbRow._id }, { $set: { currentPercent, currentLevel: percentToLevel(currentPercent), proficiencyBaseline: baseline, source: 'assessment', lastAssessedAt: latestAssessment?.completedAt || new Date() } })
    }
    if (dbRow && (JSON.stringify((dbRow.passedLevels || []).slice().sort()) !== JSON.stringify(passedLevels.slice().sort()) || dbRow.unlockedLevel !== unlockedLevel || !dbRow.startingLevel)) {
      await EmployeeSkill.updateOne({ _id: dbRow._id }, { $set: { passedLevels, unlockedLevel, startingLevel } })
    }
    const status = skillProgressStatus(currentPercent, targetPercent)
    const masteryLevels = MASTERY_LEVELS.map((level) => {
      const levelLectures = lectures.filter((item) => normalizeMasteryLevel(item.resource?.difficulty) === level)
      const levelHistory = relatedAttempts.filter((attempt) => attempt.level === level)
      const rank = masteryLevelRank(level)
      const latestAttempt = levelHistory[0] || null
      const masteryStatus = passedLevels.includes(level) ? 'Passed' : rank < masteryLevelRank(startingLevel) ? 'Self-reported' : latestAttempt ? (latestAttempt.passed ? 'Passed' : 'Failed') : rank <= masteryLevelRank(unlockedLevel) ? 'Unlocked' : 'Locked'
      return { level, status: masteryStatus, completedLectures: levelLectures.filter((item) => item.status === 'Completed').length, totalLectures: levelLectures.length, latestAssessment: latestAttempt, attemptCount: levelHistory.length }
    })
    skillDetails.push({ ...skill, currentPercent, percentGap: gap, gap, status, startingLevel, unlockedLevel, passedLevels, allLevelsPassed: passedLevels.includes('Advanced'), masteryLevels, completedLectures, totalLectures: lectures.length, lectureCompletionPercent: lectures.length ? Math.round(completedLectures / lectures.length * 100) : 0, latestAssessmentScore: latestAssessment?.score ?? null, latestAssessmentDate: latestAssessment?.completedAt ?? null, previousAssessmentScore: previousAssessment?.score ?? null, assessmentChange: latestAssessment && previousAssessment ? latestAssessment.score - previousAssessment.score : null, assessmentAttempts: relatedAttempts.length, assessmentHistory: relatedAttempts.slice(0, 5) })
  }
  const averageProficiency = skillDetails.length ? Math.round(skillDetails.reduce((sum, skill) => sum + skill.currentPercent, 0) / skillDetails.length) : 0
  const profile = await EmployeeProfile.findOne({ userId })
  if (profile && profile.competencyScore !== averageProficiency) {
    profile.competencyScore = averageProficiency
    await profile.save()
  }
  return {
    skills: skillDetails,
    summary: {
      totalSkills: rows.length,
      averageProficiency,
      criticalGaps: skillDetails.filter((skill) => skill.percentGap >= 40).length,
      skillsAtTarget: skillDetails.filter((skill) => skill.currentPercent >= skill.targetPercent).length,
      advanced: rows.filter((r) => r.currentLevel >= 3).length,
      intermediate: rows.filter((r) => r.currentLevel === 2).length,
      beginner: rows.filter((r) => r.currentLevel <= 1).length,
    },
    radar: [...new Set(skillDetails.map((skill) => skill.category))].map((category) => {
      const categorySkills = skillDetails.filter((skill) => skill.category === category)
      return { subject: category, A: Math.round(categorySkills.reduce((sum, skill) => sum + skill.currentPercent, 0) / categorySkills.length), fullMark: 100 }
    }),
  }
}

export async function upsertMySkills(userId, skillsPayload = []) {
  for (const item of skillsPayload) {
    let skill = null
    if (item.skillId) skill = await Skill.findById(item.skillId)
    else if (item.name) skill = await Skill.findOne({ name: item.name })
    if (!skill) continue
    const currentPercent = Number(item.currentPercent ?? item.currentLevel ?? 50)
    const targetPercent = Number(item.targetPercent ?? item.targetLevel ?? 80)
    await EmployeeSkill.findOneAndUpdate(
      { employeeId: userId, skillId: skill._id },
      {
        currentPercent,
        proficiencyBaseline: currentPercent,
        targetPercent,
        currentLevel: percentToLevel(currentPercent),
        targetLevel: percentToLevel(targetPercent),
        confidence: item.confidence ?? 60,
        source: 'self',
      },
      { upsert: true, new: true },
    )
  }
  const profile = await EmployeeProfile.findOne({ userId })
  const rows = await EmployeeSkill.find({ employeeId: userId })
  if (profile) {
    profile.competencyScore = mapCompetencyScore(rows)
    await profile.save()
  }
  return listMySkills(userId)
}

export async function addSkillToMe(userId, { skillId, name, category, startingLevel = 'Beginner', currentPercent, targetPercent = 80 }) {
  if (!MASTERY_LEVELS.includes(startingLevel)) throw ApiError.badRequest('Starting level must be Beginner, Intermediate, or Advanced')
  let skill = skillId ? await Skill.findById(skillId) : await Skill.findOne({ name })
  if (!skill && name) {
    skill = await Skill.create({ name, category, description: name })
  }
  if (!skill) throw ApiError.badRequest('Skill is required')
  const levelBaseline = { Beginner: 25, Intermediate: 55, Advanced: 75 }[startingLevel]
  const baseline = Math.max(0, Math.min(100, Number(currentPercent ?? levelBaseline)))
  const target = Number(targetPercent)
  if (!Number.isFinite(target) || target < 0 || target > 100) throw ApiError.badRequest('Target proficiency must be between 0 and 100')
  await EmployeeSkill.findOneAndUpdate(
    { employeeId: userId, skillId: skill._id },
    {
      $setOnInsert: {
        currentPercent: baseline,
        proficiencyBaseline: baseline,
        startingLevel,
        unlockedLevel: startingLevel,
        passedLevels: [],
        currentLevel: percentToLevel(baseline),
        targetLevel: percentToLevel(target),
        source: 'self',
      },
      $set: { targetPercent: target },
    },
    { upsert: true, new: true },
  )
  return listMySkills(userId)
}
