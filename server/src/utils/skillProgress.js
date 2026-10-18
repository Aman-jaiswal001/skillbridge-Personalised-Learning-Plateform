export const MASTERY_LEVELS = ['Beginner', 'Intermediate', 'Advanced']

export function normalizeMasteryLevel(level, difficulty = 'Easy') {
  if (MASTERY_LEVELS.includes(level)) return level
  return ({ Easy: 'Beginner', Medium: 'Intermediate', Hard: 'Advanced' })[difficulty] || 'Beginner'
}

export function startingMasteryLevel(skill) {
  if (MASTERY_LEVELS.includes(skill?.startingLevel)) return skill.startingLevel
  const baseline = Number(skill?.proficiencyBaseline ?? skill?.currentPercent ?? 0)
  return baseline >= 70 ? 'Advanced' : baseline >= 45 ? 'Intermediate' : 'Beginner'
}

export function unlockedMasteryLevel(skill) {
  return MASTERY_LEVELS.includes(skill?.unlockedLevel) ? skill.unlockedLevel : startingMasteryLevel(skill)
}

export function masteryLevelRank(level) {
  return MASTERY_LEVELS.indexOf(level)
}

export function matchesSkillLabel(label, skillName) {
  const value = String(label || '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase()
  const name = String(skillName || '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase()
  return Boolean(name && (value === name || value.startsWith(`${name} `) || value.startsWith(`${name} –`) || value.startsWith(`${name} -`) || value.startsWith(`${name} (`)))
}

export function isMasteryLevelUnlocked(level, unlockedLevel) {
  return masteryLevelRank(level) >= 0 && masteryLevelRank(unlockedLevel) >= masteryLevelRank(level)
}

export function updateMasteryUnlock(skill, level, passed) {
  const passedLevels = [...new Set(skill.passedLevels || [])]
  if (!passed) return { ...skill, passedLevels, unlockedLevel: skill.unlockedLevel || skill.startingLevel || 'Beginner' }
  if (!passedLevels.includes(level)) passedLevels.push(level)
  const currentUnlocked = unlockedMasteryLevel(skill)
  const unlockedRank = Math.max(masteryLevelRank(currentUnlocked), masteryLevelRank(level) + 1)
  return { ...skill, passedLevels, unlockedLevel: MASTERY_LEVELS[Math.min(unlockedRank, MASTERY_LEVELS.length - 1)] }
}

export function getSkillAssessmentEvidence(attempts, skillId, skillName) {
  const history = attempts
    .flatMap((attempt) => (attempt.skillPerformance || [])
      .filter((row) => skillId
        ? ((row.skillId && String(row.skillId) === String(skillId)) || matchesSkillLabel(row.name, skillName))
        : matchesSkillLabel(row.name, skillName))
      .map((row) => ({ score: Number(row.value) || 0, completedAt: attempt.completedAt || attempt.submittedAt, assessmentId: String(attempt.assessmentId?._id || attempt.assessmentId), resultId: attempt._id, level: row.level || attempt.assessmentLevel || normalizeMasteryLevel(null, attempt.assessmentId?.difficulty), passed: typeof row.passed === 'boolean' ? row.passed : attempt.passed === true || Number(row.value) >= Number(row.passingScore || attempt.passingScore || attempt.assessmentId?.passingScore || 70) })))
    .sort((a, b) => new Date(b.completedAt || 0) - new Date(a.completedAt || 0))

  const latestByAssessment = new Map()
  for (const result of history) {
    if (!latestByAssessment.has(result.assessmentId)) latestByAssessment.set(result.assessmentId, result)
  }
  return { history, latestPerAssessment: [...latestByAssessment.values()] }
}

export function calculateSkillProficiency(baseline, latestAssessmentScores) {
  const startingPoint = Math.max(0, Math.min(100, Number(baseline) || 0))
  if (!latestAssessmentScores.length) return startingPoint
  const assessmentAverage = latestAssessmentScores.reduce((sum, score) => sum + Number(score || 0), 0) / latestAssessmentScores.length
  return Math.round(startingPoint * 0.3 + assessmentAverage * 0.7)
}

export function skillProgressStatus(current, target) {
  const gap = Math.max(0, Number(target) - Number(current))
  if (gap === 0) return 'Target Achieved'
  if (gap >= 40) return 'Needs Improvement'
  if (gap <= 10) return 'On Target'
  return 'In Progress'
}
