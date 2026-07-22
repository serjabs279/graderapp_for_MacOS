export type SubjectType = 'English' | 'Filipino' | 'Mathematics' | 'Science' | 'AP' | 'Values Education' | 'MAPEH' | 'TLE';

export interface Assessment {
  id: string;
  name: string;
  category: 'WW' | 'PT' | 'QE';
  perfectScore: number;
  date?: string;
  description?: string;
  order: number;
}

export interface Student {
  id: string;
  lrn: string; // 12-digit Learner Reference Number
  name: string;
  sex: 'Male' | 'Female';
  studentNumber?: string;
  status: 'Active' | 'Dropped' | 'Transferred';
}

export interface SubjectWeight {
  ww: number; // e.g. 0.30
  pt: number; // e.g. 0.50
  qa: number; // e.g. 0.20
}

export interface Project {
  id: string;
  schoolName: string;
  schoolYear: string;
  quarter: string; // "1st Quarter" etc.
  gradeLevel: string;
  section: string;
  subject: string; // Changed from SubjectType to allow custom SHS subjects
  teacherName: string;
  passingGrade: number; // e.g. 75
  depedPolicy: '2015' | '2027'; // '2015' = 0-Based Grading (0=0, 70=70, 100=100), '2027' = MATATAG Adjusted Transmutation (SY 2027-2028 onwards)
  students: Student[];
  assessments: Assessment[];
  scores: Record<string, Record<string, number>>; // studentId -> assessmentId -> score
  isArchived?: boolean;
  isCompleted?: boolean;
  createdAt: string;
  updatedAt: string;
  // Senior High School Specific Workspace fields
  workspace?: 'JHS' | 'SHS';
  semester?: 'Semester 1' | 'Semester 2';
  projectDuration?: 'Whole Year' | 'One Semester';
  assessmentProfileId?: string; // e.g. 'profile-1', 'profile-2', etc.
}

export interface GlobalSettings {
  schoolName: string;
  teacherName: string;
  defaultPassingGrade: number;
  theme: 'light' | 'dark';
  language: 'English' | 'Filipino';
  depedPolicy: '2015' | '2027';
  subjects: Record<SubjectType, SubjectWeight>;
}
