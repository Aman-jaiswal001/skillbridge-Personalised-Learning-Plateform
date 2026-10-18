export { currentUser, users } from './users'
export { skills, skillCategories, skillRadar } from './skills'
export { competencies, actionPlan } from './competencies'
export { courses } from './courses'
export { assessments, assessmentResult } from './assessments'
export { assessmentQuestions, quizQuestions } from './questions'
export { recommendationTabs } from './recommendations'
export { learningPath } from './learningPath'
export {
  analyticsCards,
  competencyGrowth,
  learningHours,
  courseCompletionStats,
  quizPerformance,
  quizResult,
  departmentCompetency,
  skillGapDistribution,
} from './analytics'
export { notifications } from './notifications'
export { employees } from './employees'
export { reportTypes } from './reports'

export const recentActivity = [
  { id: 1, text: 'Completed Python Basics', time: 'Today, 09:40 AM' },
  { id: 2, text: 'Scored 80% in Mock Test', time: 'Yesterday, 04:15 PM' },
  { id: 3, text: 'Updated Skill Profile', time: '28 Aug, 11:20 AM' },
]

export const adminActivities = [
  { id: 1, text: 'New employee registered — Ananya Iyer', time: '10 min ago' },
  { id: 2, text: 'Assessment completed — Arjun Kumar', time: '1 hour ago' },
  { id: 3, text: 'New course published — GIS Basics for Everyone', time: 'Yesterday' },
  { id: 4, text: 'Report generated — Q1 Skill Gap', time: '2 days ago' },
]

export const assistantMessages = [
  {
    id: 1,
    role: 'assistant',
    text: "Hi! I'm your AI Learning Assistant. Upload a document or ask me anything about your learning material.",
  },
  {
    id: 2,
    role: 'user',
    text: 'Explain stratified sampling with an example relevant to NSS surveys.',
  },
  {
    id: 3,
    role: 'assistant',
    text: 'Stratified sampling divides the population into homogeneous groups (strata) such as rural/urban or state, then draws samples from each stratum. In NSS household surveys, rural and urban sectors are often treated as strata so both are represented. This usually reduces variance compared with simple random sampling when strata differ.',
    source: { file: 'Sampling_Methods.pdf', page: 12 },
  },
]

export const suggestedQuestions = [
  'Explain stratified sampling with an example.',
  'Difference between SQL and NoSQL?',
  'Summarize this PDF.',
  'Suggest resources for Machine Learning.',
]

export const quizTopics = ['Sampling Methods', 'Data Analysis', 'Machine Learning', 'Statistics', 'GIS', 'SQL']
