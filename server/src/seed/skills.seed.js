export const seedSkills = [
  {
    name: "Network Security",
    category: "Cybersecurity & Network",
    importance:
      "Protects systems and data through secure network design, monitoring and incident response.",
    requiredForRoles: [
      "Network Administrator",
      "Security Analyst",
      "System Administrator",
    ],
  },
  {
    name: "Cybersecurity Fundamentals",
    category: "Cybersecurity & Network",
    importance:
      "Builds core knowledge of threats, vulnerabilities and security controls.",
    requiredForRoles: ["Security Analyst", "Developer", "System Administrator"],
  },
  {
    name: "Computer Fundamentals",
    category: "Academic & Core Computer Skills",
    importance:
      "Provides a foundation in computer architecture, operating systems and digital systems.",
    requiredForRoles: ["Student", "Developer", "IT Support"],
  },
  {
    name: "Operating Systems",
    category: "Academic & Core Computer Skills",
    importance:
      "Supports effective use and administration of modern operating systems.",
    requiredForRoles: ["System Administrator", "Developer", "IT Support"],
  },
  {
    name: "UI/UX Design",
    category: "Design & Creativity",
    importance:
      "Helps create usable, accessible and well-structured digital experiences.",
    requiredForRoles: ["UI Designer", "Product Designer", "Frontend Developer"],
  },
  {
    name: "Graphic Design",
    category: "Design & Creativity",
    importance: "Develops visual communication and digital design skills.",
    requiredForRoles: ["Graphic Designer", "Content Designer"],
  },
  {
    name: "Communication",
    category: "Communication & Soft skills",
    importance:
      "Improves clear written, verbal and collaborative communication.",
    requiredForRoles: ["All roles"],
  },
  {
    name: "Teamwork",
    category: "Communication & Soft skills",
    importance:
      "Supports productive collaboration across teams and disciplines.",
    requiredForRoles: ["All roles"],
  },
  {
    name: "Database Management",
    category: "Database & Cloud",
    importance:
      "Enables reliable data storage, retrieval, integrity and administration.",
    requiredForRoles: [
      "Database Administrator",
      "Backend Developer",
      "Data Analyst",
    ],
  },
  {
    name: "Cloud Computing",
    category: "Database & Cloud",
    importance:
      "Supports deployment and operation of scalable cloud-based systems.",
    requiredForRoles: ["Cloud Engineer", "Developer", "System Administrator"],
  },
  {
    name: "Data Analysis",
    category: "AI & Data Science",
    importance:
      "Turns structured data into useful findings through exploration and analysis.",
    requiredForRoles: ["Data Analyst", "Data Scientist", "Business Analyst"],
  },
  {
    name: "Machine Learning",
    category: "AI & Data Science",
    importance:
      "Applies statistical learning methods to prediction and pattern discovery.",
    requiredForRoles: ["Machine Learning Engineer", "Data Scientist"],
  },
  {
    name: "Python",
    category: "Programming & Development",
    importance:
      "Supports general-purpose software development, automation and data workflows.",
    requiredForRoles: ["Software Developer", "Data Analyst", "Data Scientist"],
  },
  {
    name: "JavaScript",
    category: "Programming & Development",
    importance:
      "Enables interactive web application development across frontend and backend.",
    requiredForRoles: ["Frontend Developer", "Full Stack Developer"],
  },
];

export const arjunSkillPercents = {
  "Network Security": [45, 80],
  "Cybersecurity Fundamentals": [50, 80],
  "Computer Fundamentals": [75, 85],
  "Operating Systems": [65, 85],
  "UI/UX Design": [40, 70],
  "Graphic Design": [35, 70],
  Communication: [80, 88],
  Teamwork: [75, 85],
  "Database Management": [60, 85],
  "Cloud Computing": [45, 80],
  "Data Analysis": [70, 85],
  "Machine Learning": [40, 85],
  Python: [75, 90],
  JavaScript: [55, 80],
};
