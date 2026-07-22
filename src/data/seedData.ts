import { Project, GlobalSettings } from '../types';

export const DEFAULT_GLOBAL_SETTINGS: GlobalSettings = {
  schoolName: "SAN ROQUE PARISH HIGH SCHOOL, INCORPORATED",
  teacherName: "Prof. Maria Clara G. Santos",
  defaultPassingGrade: 75,
  theme: "light",
  language: "English",
  depedPolicy: "2027",
  subjects: {
    English: { ww: 0.30, pt: 0.50, qa: 0.20 },
    Filipino: { ww: 0.30, pt: 0.50, qa: 0.20 },
    Mathematics: { ww: 0.40, pt: 0.40, qa: 0.20 },
    Science: { ww: 0.40, pt: 0.40, qa: 0.20 },
    AP: { ww: 0.30, pt: 0.50, qa: 0.20 },
    'Values Education': { ww: 0.30, pt: 0.50, qa: 0.20 },
    MAPEH: { ww: 0.20, pt: 0.60, qa: 0.20 },
    TLE: { ww: 0.20, pt: 0.60, qa: 0.20 }
  }
};

export const SEED_PROJECTS: Project[] = [
  {
    id: "proj-english-g10",
    schoolName: "SAN ROQUE PARISH HIGH SCHOOL INCORPORATED",
    schoolYear: "2026-2027",
    quarter: "1st Quarter",
    gradeLevel: "Grade 10",
    section: "St. Peter",
    subject: "English",
    teacherName: "Prof. Maria Clara G. Santos",
    passingGrade: 75,
    depedPolicy: "2027",
    students: [
      { id: "s-101", lrn: "109827364512", name: "ALCANTARA, Miguel L.", sex: "Male", studentNumber: "2026-001", status: "Active" },
      { id: "s-102", lrn: "102938475610", name: "CORTEZ, Gabriella V.", sex: "Female", studentNumber: "2026-002", status: "Active" },
      { id: "s-103", lrn: "107483920154", name: "DELA CRUZ, Juan A.", sex: "Male", studentNumber: "2026-003", status: "Active" },
      { id: "s-104", lrn: "105647382910", name: "GONZALES, Enrico P.", sex: "Male", studentNumber: "2026-004", status: "Active" },
      { id: "s-105", lrn: "104839201526", name: "LLANERA, Mara S.", sex: "Female", studentNumber: "2026-005", status: "Active" },
      { id: "s-106", lrn: "102837465920", name: "REYES, Ana Cristina M.", sex: "Female", studentNumber: "2026-006", status: "Active" },
      { id: "s-107", lrn: "103847562910", name: "SANTOS, Maria Theresa B.", sex: "Female", studentNumber: "2026-007", status: "Active" },
      { id: "s-108", lrn: "108392015473", name: "SILANG, Maria Josefa L.", sex: "Female", studentNumber: "2026-008", status: "Transferred" },
      { id: "s-109", lrn: "109384756210", name: "VALENZUELA, Pio H.", sex: "Male", studentNumber: "2026-009", status: "Active" },
      { id: "s-110", lrn: "105839201546", name: "ZAPATA, Andres K.", sex: "Male", studentNumber: "2026-010", status: "Dropped" }
    ],
    assessments: [
      { id: "as-ww1", name: "WW1: Reading Comprehension Quiz", category: "WW", perfectScore: 20, date: "2026-06-15", description: "Assessment of initial understanding of classic literature texts.", order: 0 },
      { id: "as-ww2", name: "WW2: Vocabulary & Grammar Exercises", category: "WW", perfectScore: 25, date: "2026-07-02", description: "Grammar structures and vocabulary expansion units 1-3.", order: 1 },
      { id: "as-ww3", name: "WW3: Essay Writing", category: "WW", perfectScore: 30, date: "2026-07-20", description: "Argumentative essay on modern communication challenges.", order: 2 },
      { id: "as-pt1", name: "PT1: Speech Delivery Presentation", category: "PT", perfectScore: 50, date: "2026-06-25", description: "Individual speech performance assessing posture, tone, and pacing.", order: 3 },
      { id: "as-pt2", name: "PT2: Group Panel Discussion Mock-Up", category: "PT", perfectScore: 50, date: "2026-07-15", description: "Collaborative critical panel debating contemporary societal issues.", order: 4 },
      { id: "as-qe", name: "QE: 1st Quarter Examination", category: "QE", perfectScore: 50, date: "2026-08-01", description: "Comprehensive examination for all modules.", order: 5 }
    ],
    scores: {
      "s-101": {
        "as-ww1": 18,
        "as-ww2": 23,
        "as-ww3": 28,
        "as-pt1": 46,
        "as-pt2": 45,
        "as-qe": 44
      },
      "s-102": {
        "as-ww1": 19,
        "as-ww2": 24,
        "as-ww3": 29,
        "as-pt1": 48,
        "as-pt2": 49,
        "as-qe": 46
      },
      "s-103": {
        "as-ww1": 15,
        "as-ww2": 19,
        "as-ww3": 22,
        "as-pt1": 40,
        "as-pt2": 42,
        "as-qe": 38
      },
      "s-104": {
        "as-ww1": 12,
        "as-ww2": 15,
        "as-ww3": 18,
        "as-pt1": 38,
        "as-pt2": 35,
        "as-qe": 28
      },
      "s-105": {
        "as-ww1": 17,
        "as-ww2": 22,
        "as-ww3": 26,
        "as-pt1": 44,
        "as-pt2": 45,
        "as-qe": 41
      },
      "s-106": {
        "as-ww1": 14,
        "as-ww2": 18,
        "as-ww3": 20,
        "as-pt1": 39,
        "as-pt2": 38,
        "as-qe": 32
      },
      "s-107": {
        "as-ww1": 20,
        "as-ww2": 25,
        "as-ww3": 30,
        "as-pt1": 50,
        "as-pt2": 50,
        "as-qe": 48
      },
      "s-108": {}, // Transferred
      "s-109": {
        "as-ww1": 9,
        "as-ww2": 11,
        "as-ww3": 14,
        "as-pt1": 25,
        "as-pt2": 24,
        "as-qe": 15
      },
      "s-110": {} // Dropped
    },
    createdAt: "2026-06-01T08:00:00Z",
    updatedAt: "2026-07-20T10:30:00Z"
  },
  {
    id: "proj-science-g10",
    schoolName: "SAN ROQUE PARISH HIGH SCHOOL, INCORPORATED",
    schoolYear: "2027-2028",
    quarter: "2nd Quarter",
    gradeLevel: "Grade 10",
    section: "Newton",
    subject: "Science",
    teacherName: "Mr. Juan Dela Cruz",
    passingGrade: 75,
    depedPolicy: "2027", // Zero-Based Grading (SY 2027 onwards)
    students: [
      { id: "s-201", lrn: "209182736455", name: "AQUINO, Benigno R.", sex: "Male", studentNumber: "2027-101", status: "Active" },
      { id: "s-202", lrn: "201928374650", name: "BAUTISTA, Gregorio S.", sex: "Male", studentNumber: "2027-102", status: "Active" },
      { id: "s-203", lrn: "208374659102", name: "MABINI, Apolinario M.", sex: "Male", studentNumber: "2027-103", status: "Active" },
      { id: "s-204", lrn: "203847562911", name: "SANTIAGO, Miriam D.", sex: "Female", studentNumber: "2027-104", status: "Active" },
      { id: "s-205", lrn: "204839201527", name: "TEODORO, Gilberto C.", sex: "Male", studentNumber: "2027-105", status: "Active" },
      { id: "s-206", lrn: "207182930415", name: "URBANO, Katrina F.", sex: "Female", studentNumber: "2027-106", status: "Active" }
    ],
    assessments: [
      { id: "as-sci-ww1", name: "WW1: Genetics & DNA Quiz", category: "WW", perfectScore: 30, date: "2027-10-12", description: "Cell reproduction, inheritance laws, genetics problems.", order: 0 },
      { id: "as-sci-ww2", name: "WW2: Lab Report Summary", category: "WW", perfectScore: 20, date: "2027-11-05", description: "Genetics microscope observation lab sheet.", order: 1 },
      { id: "as-sci-pt1", name: "PT1: DNA 3D Molecular Model", category: "PT", perfectScore: 50, date: "2027-10-24", description: "Create a physically accurate double-helix model of DNA.", order: 2 },
      { id: "as-sci-pt2", name: "PT2: Biotechnology Research Essay", category: "PT", perfectScore: 50, date: "2027-11-18", description: "Ethical research paper on cloning or GMOs.", order: 3 },
      { id: "as-sci-qe", name: "QE: Periodic Science Assessment", category: "QE", perfectScore: 100, date: "2027-11-28", description: "Quarterly Examination cover and genetics unit test.", order: 4 }
    ],
    scores: {
      "s-201": { "as-sci-ww1": 27, "as-sci-ww2": 19, "as-sci-pt1": 48, "as-sci-pt2": 45, "as-sci-qe": 88 },
      "s-202": { "as-sci-ww1": 24, "as-sci-ww2": 16, "as-sci-pt1": 42, "as-sci-pt2": 40, "as-sci-qe": 76 },
      "s-203": { "as-sci-ww1": 29, "as-sci-ww2": 20, "as-sci-pt1": 50, "as-sci-pt2": 49, "as-sci-qe": 95 },
      "s-204": { "as-sci-ww1": 22, "as-sci-ww2": 15, "as-sci-pt1": 45, "as-sci-pt2": 44, "as-sci-qe": 82 },
      "s-205": { "as-sci-ww1": 15, "as-sci-ww2": 11, "as-sci-pt1": 35, "as-sci-pt2": 30, "as-sci-qe": 55 },
      "s-206": { "as-sci-ww1": 28, "as-sci-ww2": 18, "as-sci-pt1": 49, "as-sci-pt2": 47, "as-sci-qe": 90 }
    },
    createdAt: "2027-10-01T08:00:00Z",
    updatedAt: "2027-11-30T16:45:00Z"
  }
];
