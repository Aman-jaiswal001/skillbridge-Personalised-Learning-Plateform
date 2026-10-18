import { Course } from "../models/Course.js";
import { Progress } from "../models/Progress.js";
import { LearningPath } from "../models/LearningPath.js";
import { EmployeeSkill } from "../models/EmployeeSkill.js";
import { EmployeeProfile } from "../models/EmployeeProfile.js";
import { analyseEmployeeSkills } from "../ai/skillGap/skillGap.engine.js";

const STAGE_LEVELS = ["Foundation", "Intermediate", "Advanced"];
const COURSE_LEVEL_TO_STAGE = {
  Beginner: "Foundation",
  Intermediate: "Intermediate",
  Advanced: "Advanced",
  Expert: "Advanced",
};

function statusFromProgress(p) {
  if (!p) return "Not Started";
  if (p.progressPercentage >= 100) return "Completed";
  if (p.progressPercentage > 0) return "In Progress";
  return "Not Started";
}

export async function generateLearningPath(userId) {
  const skillRows = await EmployeeSkill.find({ employeeId: userId }).populate(
    "skillId",
  );
  const gaps = analyseEmployeeSkills(skillRows);
  const gapSkills = new Set(
    gaps.skillWise
      .filter((g) => g.percentGap > 0)
      .map((g) => g.skill.toLowerCase()),
  );
  const gapSkillIds = gaps.skillWise
    .filter((g) => g.percentGap > 0)
    .map((g) => g.skillId)
    .filter(Boolean);
  const profile = await EmployeeProfile.findOne({ userId }).lean();
  const learningGoal = profile?.careerGoal || 'Build skills for your current and future role';
  const courses = await Course.find({ isActive: true })
    .populate("skills", "name")
    .lean();
  courses.sort((a, b) => {
    const matchesGap = (course) => (course.skills || []).some((skill) => gapSkills.has(skill.name?.toLowerCase()));
    return Number(matchesGap(b)) - Number(matchesGap(a));
  });
  const progressRows = await Progress.find({ employeeId: userId }).lean();
  const byCourse = new Map(progressRows.map((p) => [String(p.courseId), p]));

  const picked = { Foundation: [], Intermediate: [], Advanced: [] };
  const seenCourses = new Set();
  for (const course of courses) {
    if (seenCourses.has(String(course._id))) continue;
    const names = (course.skills || []).map((s) => s.name?.toLowerCase());
    const relevant =
      names.some((n) => gapSkills.has(n)) || byCourse.has(String(course._id));
    if (!relevant && course.level !== "Beginner") continue;
    const stage = COURSE_LEVEL_TO_STAGE[course.level] || "Intermediate";
    if (picked[stage].length >= 2) continue;
    const progress = byCourse.get(String(course._id));
    if (progress?.progressPercentage >= 100 && stage !== "Foundation") continue;
    picked[stage].push({
      courseId: course._id,
      title:
        course.title
          .replace(
            / Fundamentals| Basics for Everyone| for Official Statistics| for Data Analysis| for Data Science/g,
            "",
          )
          .trim() || course.title,
      status: statusFromProgress(progress),
    });
    seenCourses.add(String(course._id));
  }

  const stages = STAGE_LEVELS.map((level, idx) => {
    const coursesInStage = picked[level];
    const completed = coursesInStage.filter(
      (c) => c.status === "Completed",
    ).length;
    const progress = coursesInStage.length
      ? Math.round((completed / coursesInStage.length) * 100)
      : 0;
    const status =
      progress === 100
        ? "Completed"
        : progress > 0
          ? "In Progress"
          : "Not Started";
    return {
      stageNumber: idx + 1,
      level,
      courses: coursesInStage,
      resources: coursesInStage.map((course) => {
        const source = courses.find((item) => String(item._id) === String(course.courseId));
        return source ? { resourceId: source._id, title: source.title, provider: source.provider, url: source.url || '', status: course.status } : null;
      }).filter(Boolean),
      progress,
      status,
    };
  });

  const overallProgress = Math.round(
    stages.reduce((s, st) => s + st.progress, 0) / stages.length,
  );
  const gapNames = gaps.skillWise.filter((g) => g.percentGap > 0).map((g) => g.skill);
  const path = await LearningPath.findOneAndUpdate(
    { employeeId: userId },
    {
      title: "My Learning Path",
      learningGoal,
      skillGaps: gapSkillIds,
      description: gapNames.length ? `Prioritized learning for ${gapNames.slice(0, 4).join(', ')} based on your current skill gaps.` : `A learning roadmap aligned with your goal: ${learningGoal}.`,
      stages,
      overallProgress,
      estimatedCompletion: overallProgress >= 70 ? "1 month" : "3 months",
      status: overallProgress === 100 ? "Completed" : "Active",
      message:
        overallProgress >= 30
          ? "You are on the right track!"
          : "Start with foundation courses to build momentum.",
    },
    { upsert: true, new: true },
  );
  return path;
}

export async function getLearningPath(userId) {
  const existing = await LearningPath.findOne({ employeeId: userId }).populate('skillGaps', 'name category').populate({ path: 'stages.courses.courseId', select: 'title provider url level' });
  if (existing) return existing;
  return generateLearningPath(userId);
}
