export const seedAssessmentMeta = [
  {
    title: "Programming & Development Assessment",
    description:
      "Assess programming fundamentals, code structure and web development concepts.",
    category: "Programming & Development",
    duration: 25,
    durationLabel: "25 min",
    passingScore: 60,
    status: "Active",
    skillNames: ["Python", "JavaScript"],
  },
  {
    title: "AI & Data Science Assessment",
    description:
      "Assess data analysis, machine learning and responsible model evaluation concepts.",
    category: "AI & Data Science",
    duration: 25,
    durationLabel: "25 min",
    passingScore: 60,
    status: "Active",
    skillNames: ["Data Analysis", "Machine Learning"],
  },
];

export const statisticsQuestions = [
  {
    question: "Which Python structure stores key-value pairs?",
    options: ["List", "Tuple", "Dictionary", "Set"],
    correctAnswer: 2,
    category: "Programming & Development",
    skill: "Python",
  },
  {
    question: "What is the purpose of a function?",
    options: [
      "Store only images",
      "Group reusable instructions",
      "Restart the operating system",
      "Create a network connection",
    ],
    correctAnswer: 1,
    category: "Programming & Development",
    skill: "Python",
  },
  {
    question:
      "Which JavaScript keyword declares a block-scoped variable that can be reassigned?",
    options: ["const", "let", "static", "define"],
    correctAnswer: 1,
    category: "Programming & Development",
    skill: "JavaScript",
  },
  {
    question: "In browser JavaScript, what is the DOM?",
    options: [
      "A database backup",
      "A programming language",
      "A structured representation of a web page",
      "A network protocol",
    ],
    correctAnswer: 2,
    category: "Programming & Development",
    skill: "JavaScript",
  },
];

export const analyticsQuestions = [
  {
    question: "What is a useful first step when exploring a new dataset?",
    options: [
      "Delete all rows",
      "Inspect its structure and missing values",
      "Train a deep neural network immediately",
      "Convert every value to text",
    ],
    correctAnswer: 1,
    category: "AI & Data Science",
    skill: "Data Analysis",
  },
  {
    question: "A classification model is commonly used to predict:",
    options: [
      "A category label",
      "A database schema",
      "A file size only",
      "A web page layout",
    ],
    correctAnswer: 0,
    category: "AI & Data Science",
    skill: "Machine Learning",
  },
  {
    question: "Why should a model be evaluated on data not used for training?",
    options: [
      "To increase training time",
      "To estimate how well it generalizes",
      "To remove the target variable",
      "To guarantee perfect accuracy",
    ],
    correctAnswer: 1,
    category: "AI & Data Science",
    skill: "Machine Learning",
  },
  {
    question: "Which practice helps reduce misleading data conclusions?",
    options: [
      "Ignore data quality",
      "Document assumptions and limitations",
      "Report only favorable results",
      "Remove the evaluation set",
    ],
    correctAnswer: 1,
    category: "AI & Data Science",
    skill: "Data Analysis",
  },
];
