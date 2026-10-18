const LEVEL_WEIGHT = { Beginner: 1, Intermediate: 2, Advanced: 3, Expert: 4 }

function tokenize(text = '') {
  return String(text).toLowerCase().split(/[^a-z0-9+]+/).filter(Boolean)
}

function overlap(a, b) {
  const setB = new Set(b)
  return a.filter((t) => setB.has(t)).length
}

export function rankCourses({ employee, profile, gaps, courses, progressByCourseId = new Map() }) {
  const completedIds = new Set(
    [...progressByCourseId.entries()]
      .filter(([, p]) => p.progressPercentage >= 100)
      .map(([id]) => String(id)),
  )

  const gapBySkillName = new Map(gaps.skillWise.map((g) => [g.skill.toLowerCase(), g]))
  const roleTokens = tokenize(`${employee.designation} ${employee.department} ${profile?.jobRole || ''}`)
  const careerTokens = tokenize(`${profile?.careerGoal || ''} ${(profile?.futureRequirements || []).join(' ')}`)
  const deptTokens = tokenize(employee.department)

  const ranked = []

  for (const course of courses) {
    if (completedIds.has(String(course._id))) continue
    const skillNames = (course.skills || []).map((s) => (s.name ? s.name : String(s)))
    const matchedGaps = skillNames
      .map((name) => gapBySkillName.get(String(name).toLowerCase()))
      .filter(Boolean)

    const skillGapMatch = matchedGaps.length
      ? Math.min(
          1,
          matchedGaps.reduce((sum, g) => sum + g.percentGap, 0) / (matchedGaps.length * 50),
        )
      : 0

    const courseTokens = tokenize(`${course.title} ${course.category} ${course.description}`)
    const roleMatch = roleTokens.length ? overlap(roleTokens, courseTokens) / roleTokens.length : 0
    const careerMatch = careerTokens.length ? overlap(careerTokens, courseTokens) / careerTokens.length : 0
    const priorityMatch = ['Critical', 'High'].includes(matchedGaps[0]?.status) ? 1 : matchedGaps.length ? 0.4 : 0.1

    const progress = progressByCourseId.get(String(course._id))
    const currentAvgLevel =
      gaps.skillWise.length === 0
        ? 2
        : gaps.skillWise.reduce((s, g) => s + g.currentLevel, 0) / gaps.skillWise.length
    const courseLevel = LEVEL_WEIGHT[course.level] || 2
    const difficultyMatch = 1 - Math.min(1, Math.abs(courseLevel - Math.min(4, currentAvgLevel + 1)) / 3)
    const historyMatch = progress ? 0.3 + (progress.progressPercentage / 100) * 0.7 : 0.6

    const recommendationScore =
      skillGapMatch * 0.4 +
      Math.min(1, roleMatch) * 0.2 +
      Math.min(1, careerMatch) * 0.15 +
      priorityMatch * 0.1 +
      difficultyMatch * 0.1 +
      historyMatch * 0.05

    const topGap = matchedGaps.sort((a, b) => b.percentGap - a.percentGap)[0]
    const priority = topGap?.status === 'Critical'
      ? 'Critical'
      : topGap?.status === 'High'
        ? 'High'
        : recommendationScore >= 0.45
          ? 'Medium'
          : 'Low'

    ranked.push({
      course,
      score: Number(recommendationScore.toFixed(4)),
      priority,
      matchedSkills: skillNames,
      gapAddressed: topGap?.skill || skillNames[0] || '',
      skillGap: topGap ? `${topGap.percentGap}%` : '0%',
      reason: topGap
        ? `Recommended for your ${topGap.skill} skill gap`
        : `Aligned with your role in ${employee.department || 'the organisation'}`,
    })
  }

  return ranked.sort((a, b) => b.score - a.score)
}
