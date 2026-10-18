export const learningPath = {
  progress: 40,
  eta: '3 months',
  message: 'You are on the right track!',
  stages: [
    {
      id: 1,
      title: 'Foundation',
      items: [
        { id: 1, title: 'Python Basics', status: 'Completed' },
        { id: 2, title: 'Statistics Fundamentals', status: 'Completed' },
      ],
    },
    {
      id: 2,
      title: 'Intermediate',
      items: [
        { id: 3, title: 'Data Analysis', status: 'In Progress' },
        { id: 4, title: 'GIS Basics', status: 'Not Started' },
      ],
    },
    {
      id: 3,
      title: 'Advanced',
      items: [
        { id: 5, title: 'Machine Learning', status: 'Not Started' },
        { id: 6, title: 'Data Visualization', status: 'Not Started' },
      ],
    },
  ],
}
