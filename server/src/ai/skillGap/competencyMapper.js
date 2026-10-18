import { percentToLevel } from './skillGap.engine.js'

export function mapCompetencyScore(employeeSkills) {
  if (!employeeSkills.length) return 0
  const avg = employeeSkills.reduce((sum, s) => sum + Number(s.currentPercent || 0), 0) / employeeSkills.length
  return Math.round(avg)
}

export function applyAssessmentToSkills(employeeSkills, skillPerformance) {
  const byId = new Map(skillPerformance.filter((s) => s.skillId).map((s) => [String(s.skillId), s.value]))
  const byName = new Map(skillPerformance.map((s) => [String(s.name).toLowerCase(), s.value]))
  return employeeSkills.map((row) => {
    const name = row.skillId?.name
    const assessed = byId.get(String(row.skillId?._id || row.skillId)) ?? (name ? byName.get(name.toLowerCase()) : undefined)
    if (assessed === undefined) return row
    const nextPercent = Math.round(assessed * 0.7 + row.currentPercent * 0.3)
    row.currentPercent = Math.max(0, Math.min(100, nextPercent))
    row.currentLevel = percentToLevel(row.currentPercent)
    row.source = 'assessment'
    row.lastAssessedAt = new Date()
    return row
  })
}
