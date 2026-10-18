export const assessments = [
  { id: 1, title: 'Statistics Core Assessment', date: '12 Sep 2026', time: '10:00 AM', duration: '30 min', status: 'Upcoming', category: 'Statistics' },
  { id: 2, title: 'Data Analytics Assessment', date: '18 Sep 2026', time: '02:30 PM', duration: '45 min', status: 'Upcoming', category: 'Data Analysis' },
  { id: 3, title: 'SQL Proficiency Test', date: '24 Sep 2026', time: '11:00 AM', duration: '25 min', status: 'Scheduled', category: 'Technical' },
  { id: 4, title: 'Python Basics Mock', date: '28 Aug 2026', score: 80, status: 'Completed', category: 'Technical' },
]

export const assessmentResult = {
  score: 16,
  total: 20,
  percent: 80,
  correct: 16,
  incorrect: 3,
  unattempted: 1,
  skillWise: [
    { name: 'Statistics', value: 85 },
    { name: 'Sampling Methods', value: 70 },
    { name: 'Data Analysis', value: 80 },
    { name: 'Survey Design', value: 75 },
  ],
  feedback: 'Good understanding of core concepts. Focus more on advanced statistical techniques.',
}
