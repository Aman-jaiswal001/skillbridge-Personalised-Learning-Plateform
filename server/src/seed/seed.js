import mongoose from "mongoose";
import { connectDb, disconnectDb } from "../config/db.js";
import { User } from "../models/User.js";
import { EmployeeProfile } from "../models/EmployeeProfile.js";
import { Skill } from "../models/Skill.js";
import { Competency } from "../models/Competency.js";
import { EmployeeSkill } from "../models/EmployeeSkill.js";
import { Course } from "../models/Course.js";
import { Assessment } from "../models/Assessment.js";
import { Question } from "../models/Question.js";
import { Progress } from "../models/Progress.js";
import { Notification } from "../models/Notification.js";
import { seedUsers } from "./users.seed.js";
import { seedSkills, arjunSkillPercents } from "./skills.seed.js";
import { seedCourses } from "./courses.seed.js";
import {
  seedAssessmentMeta,
  statisticsQuestions,
  analyticsQuestions,
} from "./assessments.seed.js";
import { percentToLevel } from "../ai/skillGap/skillGap.engine.js";
import { generateRecommendations } from "../services/recommendation.service.js";
import { generateLearningPath } from "../services/learningPath.service.js";

export async function seed() {
  await connectDb();

  const users = [];
  for (const row of seedUsers) {
    let user = await User.findOne({ email: row.email }).select("+password");
    if (user) {
      Object.assign(user, { ...row, password: user.password });
      await user.save();
    } else {
      user = await User.create(row);
    }
    users.push(user);
    if (user.role !== "ADMIN") {
      const isArjun = user.employeeId === "EMP001";
      await EmployeeProfile.findOneAndUpdate(
        { userId: user._id },
        {
          $set: {
            userId: user._id,
            education: isArjun
              ? "M.Stat, ISI Kolkata"
              : "Postgraduate in Statistics / Allied field",
            experience: isArjun ? "4 years" : "3-8 years",
            department: user.department,
            designation: user.designation,
            jobRole: user.designation,
            assignment: isArjun
              ? "NSS socio-economic surveys"
              : "Departmental statistical operations",
            careerGoal: isArjun
              ? "Lead AI-assisted official statistics products"
              : "Advance competency in digital statistics",
            location: "New Delhi",
            priorTraining: isArjun
              ? [
                  "Python Programming Foundations",
                  "Computer Systems and Operating Systems",
                ]
              : [],
            futureRequirements: isArjun
              ? ["Machine Learning", "Network Security", "Cloud Computing"]
              : ["Data Analysis"],
            competencyScore: isArjun ? 72 : 60,
          },
        },
        { upsert: true, new: true },
      );
    }
  }

  const skills = await Promise.all(
    seedSkills.map((row) =>
      Skill.findOneAndUpdate(
        { name: row.name },
        { $set: row },
        { upsert: true, new: true, runValidators: true },
      ),
    ),
  );
  const skillByName = new Map(skills.map((s) => [s.name, s]));
  await Skill.updateMany(
    {
      name: { $nin: seedSkills.map((skill) => skill.name) },
      category: {
        $in: ["Technical", "Statistical", "Behavioural", "Digital Governance"],
      },
    },
    { $set: { isActive: false } },
  );

  const competencyRows = [
    {
      name: "Cybersecurity & Network",
      category: "Cybersecurity & Network",
      skillIds: ["Network Security", "Cybersecurity Fundamentals"].map(
        (n) => skillByName.get(n)._id,
      ),
    },
    {
      name: "Academic & Core Computer Skills",
      category: "Academic & Core Computer Skills",
      skillIds: ["Computer Fundamentals", "Operating Systems"].map(
        (n) => skillByName.get(n)._id,
      ),
    },
    {
      name: "Design & Creativity",
      category: "Design & Creativity",
      skillIds: ["UI/UX Design", "Graphic Design"].map(
        (n) => skillByName.get(n)._id,
      ),
    },
    {
      name: "Communication & Soft skills",
      category: "Communication & Soft skills",
      skillIds: ["Communication", "Teamwork"].map(
        (n) => skillByName.get(n)._id,
      ),
    },
    {
      name: "Database & Cloud",
      category: "Database & Cloud",
      skillIds: ["Database Management", "Cloud Computing"].map(
        (n) => skillByName.get(n)._id,
      ),
    },
    {
      name: "AI & Data Science",
      category: "AI & Data Science",
      skillIds: ["Data Analysis", "Machine Learning"].map(
        (n) => skillByName.get(n)._id,
      ),
    },
    {
      name: "Programming & Development",
      category: "Programming & Development",
      skillIds: ["Python", "JavaScript"].map((n) => skillByName.get(n)._id),
    },
  ];
  for (const row of competencyRows)
    await Competency.findOneAndUpdate(
      { name: row.name },
      { $set: row },
      { upsert: true, new: true },
    );

  const coursesPayload = seedCourses.map((c) => ({
    ...c,
    url: c.url || "https://igotkarmayogi.gov.in/",
    skills: c.skills.map((n) => skillByName.get(n)?._id).filter(Boolean),
  }));
  const courses = await Promise.all(
    coursesPayload.map((row) =>
      Course.findOneAndUpdate(
        { igotCourseId: row.igotCourseId },
        { $set: row },
        { upsert: true, new: true, runValidators: true },
      ),
    ),
  );
  const seededCourseIds = courses.map((course) => course._id);
  await Course.updateMany(
    {
      igotCourseId: { $regex: /^(IGOT-|NSSTA-|MEITY-|SB-)/ },
      _id: { $nin: seededCourseIds },
    },
    { $set: { isActive: false } },
  );
  const courseByTitle = new Map(courses.map((c) => [c.title, c]));

  const employees = users.filter(
    (u) => u.role === "STUDENT" || u.role === "EMPLOYEE",
  );
  for (const emp of employees) {
    for (const skill of skills) {
      const preset =
        emp.employeeId === "EMP001" ? arjunSkillPercents[skill.name] : null;
      const currentPercent = preset
        ? preset[0]
        : 55 +
          ((emp.employeeId.charCodeAt(emp.employeeId.length - 1) +
            skill.name.length * 7) %
            26);
      const targetPercent = preset
        ? preset[1]
        : Math.min(95, currentPercent + 15);
      await EmployeeSkill.findOneAndUpdate(
        { employeeId: emp._id, skillId: skill._id },
        {
          $setOnInsert: {
            employeeId: emp._id,
            skillId: skill._id,
            currentPercent,
            targetPercent,
            currentLevel: percentToLevel(currentPercent),
            targetLevel: percentToLevel(targetPercent),
            confidence: 60,
            source: "system",
          },
        },
        { upsert: true, new: true },
      );
    }
    await EmployeeSkill.deleteMany({
      employeeId: emp._id,
      skillId: { $in: await Skill.find({ isActive: false }).distinct("_id") },
    });
  }

  for (const meta of seedAssessmentMeta) {
    const assessment = await Assessment.findOneAndUpdate(
      { title: meta.title },
      {
        $set: {
          title: meta.title,
          description: meta.description,
          category: meta.category,
          duration: meta.duration,
          durationLabel: meta.durationLabel,
          passingScore: meta.passingScore,
          status: meta.status,
          scheduledAt: meta.scheduledAt,
          skills: meta.skillNames
            .map((n) => skillByName.get(n)?._id)
            .filter(Boolean),
        },
      },
      { upsert: true, new: true },
    );
    const bank = meta.title.includes("Programming")
      ? statisticsQuestions
      : analyticsQuestions;
    for (const [index, question] of bank.entries()) {
      if (
        !Array.isArray(question.options) ||
        !Number.isInteger(question.correctAnswer) ||
        question.correctAnswer < 0 ||
        question.correctAnswer >= question.options.length
      ) {
        throw new Error(
          `Invalid correctAnswer index in ${meta.title} question ${index + 1}`,
        );
      }
    }
    const questionIds = [];
    for (const q of bank) {
      const question = await Question.findOneAndUpdate(
        { assessmentId: assessment._id, question: q.question },
        {
          $set: {
            question: q.question,
            options: q.options,
            correctAnswer: q.correctAnswer,
            explanation: "Refer to NSSTA core notes.",
            category: q.category,
            skillId: skillByName.get(q.skill)?._id,
            difficulty: "Medium",
          },
        },
        { upsert: true, new: true },
      );
      questionIds.push(question._id);
    }
    await Question.deleteMany({
      assessmentId: assessment._id,
      _id: { $nin: questionIds },
    });
    assessment.questions = questionIds;
    await assessment.save();
  }

  const arjun = users.find((u) => u.employeeId === "EMP001");
  const pythonCourse = courseByTitle.get("Python Programming Foundations");
  const mlCourse = courseByTitle.get("Machine Learning Foundations");
  const sqlCourse = courseByTitle.get("Database and SQL Essentials");
  const statsCourse = courseByTitle.get("Data Analysis with Python");

  const progressRows = [
    {
      employeeId: arjun._id,
      courseId: pythonCourse._id,
      progressPercentage: 100,
      completedModules: [
        "Syntax and Data Types",
        "Functions and Collections",
        "Modules and Errors",
      ],
      learningHours: 10,
      completedAt: new Date("2026-08-10"),
      certificateEarned: true,
    },
    {
      employeeId: arjun._id,
      courseId: statsCourse._id,
      progressPercentage: 80,
      completedModules: ["Python Data Workflows", "Exploratory Analysis"],
      learningHours: 9,
    },
    {
      employeeId: arjun._id,
      courseId: mlCourse._id,
      progressPercentage: 35,
      completedModules: ["Supervised Learning"],
      learningHours: 4,
    },
    {
      employeeId: arjun._id,
      courseId: sqlCourse._id,
      progressPercentage: 12,
      completedModules: ["Relational Database Concepts"],
      learningHours: 2,
    },
  ];
  for (const row of progressRows)
    await Progress.findOneAndUpdate(
      { employeeId: row.employeeId, courseId: row.courseId },
      { $set: row },
      { upsert: true, new: true },
    );

  const notificationRows = [
    {
      userId: arjun._id,
      type: "recommendation",
      title: "New course recommended",
      message:
        "Machine Learning Fundamentals has been added based on your skill gap.",
      isRead: false,
    },
    {
      userId: arjun._id,
      type: "assessment",
      title: "Assessment reminder",
      message:
        "Data Analytics Assessment is scheduled for 18 Sep 2026 at 02:30 PM.",
      isRead: false,
    },
    {
      userId: arjun._id,
      type: "certificate",
      title: "You received a certificate",
      message: "Python Basics certificate is now available in your profile.",
      isRead: false,
    },
    {
      userId: arjun._id,
      type: "material",
      title: "New learning material available",
      message:
        "Network Security learning materials are available in your learning path.",
      isRead: true,
    },
    {
      userId: arjun._id,
      type: "system",
      title: "System update",
      message:
        "SkillBridge AI will undergo scheduled maintenance on Sunday 02:00–04:00 IST.",
      isRead: true,
    },
  ];
  for (const row of notificationRows)
    await Notification.findOneAndUpdate(
      { userId: row.userId, title: row.title },
      { $setOnInsert: row },
      { upsert: true, new: true },
    );

  await generateRecommendations(arjun._id);
  await generateLearningPath(arjun._id);
  for (const student of employees.filter(
    (u) => String(u._id) !== String(arjun._id),
  )) {
    await generateLearningPath(student._id);
  }

  console.info("[seed] completed");
  console.info("Demo login (password for all accounts): password");
  console.info("Admin:   admin@skillbridge.gov.in");
  console.info("Trainer: ananya.iyer@nssta.gov.in");
  console.info("Officer: arjun.kumar@nso.gov.in  (EMP001)");
}

if (process.argv[1] && process.argv[1].includes("seed.js")) {
  seed()
    .then(async () => {
      await disconnectDb();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error("[seed] failed", err);
      await mongoose.disconnect().catch(() => {});
      process.exit(1);
    });
}
