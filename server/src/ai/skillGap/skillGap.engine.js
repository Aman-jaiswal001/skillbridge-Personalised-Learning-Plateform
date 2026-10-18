export const LEVEL_LABELS = {
  1: 'Beginner',
  2: 'Intermediate',
  3: 'Advanced',
  4: 'Expert',
}

export function percentToLevel(percent) {
  const p = Number(percent) || 0
  if (p < 50) return 1
  if (p < 65) return 2
  if (p < 80) return 3
  return 4
}

export function levelToPercent(level) {
  const map = { 1: 40, 2: 60, 3: 75, 4: 90 }
  return map[level] ?? 40
}

export function classifyLevelGap(gap) {
  if (gap <= 0) return 'No Gap'
  if (gap === 1) return 'Moderate'
  if (gap === 2) return 'High'
  return 'Critical'
}

export function classifyPercentGap(percentGap) {
  if (percentGap <= 0) return 'No Gap'
  if (percentGap < 10) return 'Low'
  if (percentGap < 25) return 'Moderate'
  if (percentGap < 40) return 'High'
  return 'Critical'
}

export function analyseEmployeeSkills(employeeSkills, skillDocsById = new Map()) {
  const items = employeeSkills.map((row) => {
    const skill = row.skillId?.name
      ? row.skillId
      : skillDocsById.get(String(row.skillId)) || {}
    const currentLevel = Number(row.currentLevel) || percentToLevel(row.currentPercent)
    const targetLevel = Number(row.targetLevel) || percentToLevel(row.targetPercent)
    const currentPercent = Number(row.currentPercent ?? levelToPercent(currentLevel))
    const targetPercent = Number(row.targetPercent ?? levelToPercent(targetLevel))
    const gap = Math.max(0, targetLevel - currentLevel)
    const percentGap = Math.max(0, targetPercent - currentPercent)
    const severity = classifyLevelGap(gap)
    const status = classifyPercentGap(percentGap)
    return {
      id: row._id || row.id,
      skillId: skill._id || row.skillId,
      skill: skill.name || 'Unknown',
      category: skill.category || 'Technical',
      currentLevel,
      targetLevel,
      currentPercent,
      targetPercent,
      gap,
      percentGap,
      severity,
      status,
      reason: skill.importance || 'Required for the employee\'s target role.',
      lastAssessedAt: row.lastAssessedAt || null,
    }
  })

  const critical = items.filter((i) => i.severity === 'Critical' || i.status === 'Critical')
  const high = items.filter((i) => i.severity === 'High' || i.status === 'High')
  const moderate = items.filter((i) => i.severity === 'Moderate' || i.status === 'Moderate')
  const overallPercent =
    items.length === 0
      ? 0
      : Math.round(items.reduce((sum, i) => sum + i.currentPercent, 0) / items.length)
  const overallGap =
    items.length === 0
      ? 0
      : Math.round(items.reduce((sum, i) => sum + i.percentGap, 0) / items.length)

  const categoryMap = new Map()
  for (const item of items) {
    const bucket = categoryMap.get(item.category) || { category: item.category, total: 0, current: 0, gap: 0 }
    bucket.total += 1
    bucket.current += item.currentPercent
    bucket.gap += item.percentGap
    categoryMap.set(item.category, bucket)
  }

  const categoryWise = [...categoryMap.values()].map((c) => ({
    category: c.category,
    current: Math.round(c.current / c.total),
    gap: Math.round(c.gap / c.total),
    count: c.total,
  }))

  return {
    overallCompetency: overallPercent,
    overallGap,
    criticalGaps: critical.length,
    highGaps: high.length,
    moderateGaps: moderate.length,
    skillWise: items.sort((a, b) => b.percentGap - a.percentGap),
    categoryWise,
    actionPlan: items
      .filter((i) => i.percentGap >= 10)
      .slice(0, 3)
      .map((i, idx) => ({
        step: idx + 1,
        title: `Improve ${i.skill}`,
        detail: `Close the ${i.percentGap}% gap (${i.status}). ${i.reason}`,
      })),
  }
}
