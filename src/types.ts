export type SubjectType = 'English' | 'Filipino' | 'Mathematics' | 'Science' | 'AP' | 'Values Education' | 'Music & Arts' | 'PE & Health' | 'TLE';

// ─── Adviser Portal Types ────────────────────────────────────────────────────

export type HonorsLabel = 'With Highest Honors' | 'With High Honors' | 'With Honors' | null;
export type PromotionStatus = 'Promoted' | 'Retained' | 'To be Finalized';
export type ObservedValueRating = 'AO' | 'SO' | 'RO' | 'NO' | '';

export interface HonorsCriteria {
  highestHonors: { minAverage: number; minAnySubject: number };
  highHonors:    { minAverage: number; minAnySubject: number };
  honors:        { minAverage: number; minAnySubject: number };
}

export interface LanguageSubjectGroup {
  label: string;     // e.g. 'Languages'
  subjects: string[]; // e.g. ['English', 'Filipino']
}

export interface LearnerObservedValues {
  studentLRN: string;
  quarters: Record<string, {
    responsible:     ObservedValueRating;
    obedient:        ObservedValueRating;
    compassionate:   ObservedValueRating;
    kind:            ObservedValueRating;
    serviceOriented: ObservedValueRating;
  }>;
}

export interface MonthAttendance {
  schoolDays: number;  // total school days (set globally per month)
  daysAbsent: number;  // adviser-entered per student
}

export interface StudentAttendance {
  studentLRN: string;
  months: Record<string, MonthAttendance>; // key = month label e.g. 'June'
}

export interface AttendanceConfig {
  months: string[];                           // ordered month labels
  schoolDaysPerMonth: Record<string, number>; // global school days per month
}

export interface ImportedSubjectGrades {
  subjectUID: string;
  subjectName: string;
  quarterKey: string;               // e.g. '1st Quarter' or 'Semester 1'
  isLanguageGroup: boolean;
  isMAPEHGroup?: boolean;           // JHS-only composite marker
  grades: Record<string, number>;   // LRN → final grade
  // For language/composite groups only: raw per-component grades before averaging
  languageRawGrades?: Record<string, Record<string, number>>; // subjectName → LRN → grade
  isLocked: boolean;
  lockedAt?: string;
  importedAt: string;
}

export interface SubjectGradeExportJSON {
  version: '1.0';
  exportType: 'SRPHS_SUBJECT_GRADES';
  exportTimestamp: string;
  subjectUID: string;
  subjectName: string;
  schoolYear: string;
  gradeLevel: string;
  section: string;
  teacherName: string;
  workspace: 'JHS' | 'SHS';
  quarters: {
    quarterKey: string;
    grades: {
      lrn: string;
      studentName: string;
      grade: number;
    }[];
  }[];
}

export interface OverrideLogEntry {
  id: string;
  timestamp: string;
  adviserName: string;
  studentLRN: string;
  studentName: string;
  subjectUID?: string;
  subjectName?: string;
  quarterKey?: string;
  action:
    | 'Student Added'
    | 'Student Edited'
    | 'Student Deleted'
    | 'Manual Grade Entry'
    | 'Grade Edited'
    | 'Subject Imported'
    | 'Subject Replaced'
    | 'Subject Locked'
    | 'Subject Unlocked';
  previousValue?: string;
  newValue?: string;
  reason: string;
}

export interface AdviserStudent {
  lrn: string;
  name: string;
  sex: 'Male' | 'Female';
  age?: number;
}

export interface AdviserClass {
  id: string;              // group key: 'SY|GradeLevel|Section'
  schoolYear: string;
  gradeLevel: string;
  section: string;
  workspace: 'JHS' | 'SHS';
  adviserName: string;
  principalName: string;
  students: AdviserStudent[];
  subjectOrder: string[];
  languageGroups: LanguageSubjectGroup[];
  honorsCriteria: HonorsCriteria;
  promotionPassingGrade: number;
  manualPromotionStatus: Record<string, 'Promoted' | 'Retained'>; // LRN → override
  observedValues: LearnerObservedValues[];
  attendance: StudentAttendance[];
  attendanceConfig: AttendanceConfig;
  importedGrades: ImportedSubjectGrades[];
  overrideLog: OverrideLogEntry[];
  schoolLogoBase64?: string;
  depedLogoBase64?: string;
  trackStrand?: string;   // SHS only — e.g. "Academic" (new) or "Academic - HUMSS" (old)
}


export interface Assessment {
  id: string;
  name: string;
  category: 'WOW' | 'PPT' | 'QSTE';
  perfectScore: number;
  date?: string;
  description?: string;
  order: number;
  reassessmentEnabled?: boolean; // mastery-based reassessment trigger
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
  wow: number; // e.g. 0.30
  ppt: number; // e.g. 0.50
  qste: number; // e.g. 0.20
}

export interface ReassessmentSettings {
  enabled: boolean;
  masteryThreshold: number; // e.g. 75 (percentage of perfect score)
  interventionThreshold: number; // e.g. 50 (percentage of class below mastery to trigger reteach recommendation)
  policy: 'Average' | 'Highest' | 'Replacement';
}

export interface QuarterData {
  assessments: Assessment[];
  scores: Record<string, Record<string, number>>; // studentId -> assessmentId -> score
  reassessmentScores?: Record<string, Record<string, number>>; // studentId -> assessmentId -> reassessmentScore
}

export interface Project {
  id: string;
  schoolName: string;
  schoolYear: string;
  gradeLevel: string;
  section: string;
  subject: string; // Changed from SubjectType to allow custom SHS subjects
  teacherName: string;
  passingGrade: number; // e.g. 75
  depedPolicy: '2015' | '2027'; // '2015' = 0-Based Grading, '2027' = MATATAG
  students: Student[];
  quarters: Record<string, QuarterData>;
  lastActiveQuarter?: string;
  isArchived?: boolean;
  isCompleted?: boolean;
  createdAt: string;
  updatedAt: string;
  reassessmentSettings?: ReassessmentSettings; // mastery-based reassessment settings
  // Senior High School Specific Workspace fields
  workspace?: 'JHS' | 'SHS';
  semester?: 'Semester 1' | 'Semester 2';
  projectDuration?: 'Whole Year' | 'One Semester';
  assessmentProfileId?: string; // e.g. 'profile-1', 'old-core', 'custom', etc.
  customWeights?: { wow: number; ppt: number; qste: number }; // used when assessmentProfileId === 'custom'
  subjectUID?: string;           // e.g. 'SUB-2026-000145' — auto-generated, immutable
}

export interface GlobalSettings {
  schoolName: string;
  teacherName: string;
  defaultPassingGrade: number;
  theme: 'light' | 'dark';
  language: 'English' | 'Filipino';
  depedPolicy: '2015' | '2027';
  calendarType?: 'Quarter' | 'Trimester'; // Defines active academic structure
  subjects: Record<SubjectType, SubjectWeight>;
  // Adviser Portal
  adviserClasses?: AdviserClass[];
  activeAdviserClassId?: string;
  subjectUIDCounter?: number;  // increments each time a new project is created
  // System-wide logos (used as defaults for SF9 when adviser class has no logos)
  depedLogoBase64?: string;
  schoolLogoBase64?: string;
  // Academic Year Rollover
  activeSchoolYear?: string;
}

// ─── Archive System ──────────────────────────────────────────────────────────

export const ARCHIVE_VERSION = '1.0';
export const APP_VERSION = '2.0';

export interface ArchiveMetadata {
  archiveVersion: string;   // ARCHIVE_VERSION — used for compatibility checks
  appVersion: string;       // APP_VERSION — for informational display
  schoolYear: string;       // e.g. '2026-2027'
  calendarType: 'Quarter' | 'Trimester';
  createdAt: string;        // ISO timestamp
  createdBy: string;        // teacherName at time of export
  totalProjects: number;
  totalStudents: number;
  totalAdviserClasses: number;
}

export interface ArchiveFile {
  metadata: ArchiveMetadata;
  projects: Project[];
  adviserClasses: AdviserClass[];
  globalSettings: GlobalSettings;
}

/** Validation result returned by validateArchive() */
export interface ArchiveValidationResult {
  valid: boolean;
  archive: ArchiveFile | null;
  error: string | null;
}
