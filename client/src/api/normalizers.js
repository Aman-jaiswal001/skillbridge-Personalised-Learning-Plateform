export function toId(value) {
  return value?._id || value?.id || value;
}

export function normalizeCourse(course = {}) {
  const modules = course.modules || course.moduleList || [];
  const completed = new Set(course.progress?.completedModules || []);
  return {
    ...course,
    id: toId(course),
    learners: course.learnerCount ?? course.learners ?? 0,
    modules: Array.isArray(modules) ? modules.length : (course.modules ?? 0),
    moduleList: Array.isArray(modules)
      ? modules.map((module, index) => ({
          id: toId(module) || index + 1,
          title: module.title,
          duration: module.duration || "",
          status: completed.has(module.title)
            ? "Completed"
            : course.enrolled
              ? "In Progress"
              : "Not Started",
        }))
      : [],
    certificate: course.certificateAvailable ?? course.certificate ?? true,
    rating: course.rating || 0,
    outcomes: course.outcomes || [],
    duration: course.duration || `${course.durationHours || 0} hours`,
    provider: course.provider || "iGOT Karmayogi",
  };
}

export function normalizeSkill(skill = {}) {
  return {
    ...skill,
    id: toId(skill),
    name: skill.skill || skill.name,
    currentLevel: skill.currentPercent ?? skill.currentLevel ?? 0,
    targetLevel: skill.targetPercent ?? skill.targetLevel ?? 0,
    gap: skill.percentGap ?? skill.gap ?? 0,
    status: skill.status || skill.severity || "No Gap",
  };
}

export function normalizeNotification(item = {}) {
  return {
    ...item,
    id: toId(item),
    read: item.read ?? item.isRead ?? false,
    time: item.time || formatDate(item.createdAt),
  };
}

export function normalizeAssessment(assessment = {}) {
  return {
    ...assessment,
    id: toId(assessment),
    date: assessment.scheduledAt
      ? new Date(assessment.scheduledAt).toLocaleDateString()
      : "On demand",
    time: assessment.scheduledAt
      ? new Date(assessment.scheduledAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "",
    duration: assessment.durationLabel || `${assessment.duration || 30} min`,
    status: assessment.myResult ? "Completed" : assessment.status || "Active",
    attempts: assessment.myResult?.attempts || 0,
  };
}

export function normalizeQuestion(question = {}) {
  return {
    ...question,
    id: toId(question),
    text: question.question || question.text,
  };
}

export function formatDate(value) {
  if (!value) return "Just now";
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
