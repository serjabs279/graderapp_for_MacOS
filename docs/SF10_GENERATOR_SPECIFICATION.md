# DepEd SF10 Generator — Architecture & Development Specification

This document serves as the **Single Source of Truth** and **AI IDE Blueprint** for building the standalone **DepEd School Form 10 (SF10) Permanent Record Generator Application**.

---

## 1. System Overview

### Core Role
The SF10 Generator is a standalone application (Desktop & Mobile/Web) designed for the **School Registrar / Guidance Office / School Administration**. Its primary job is to consume single-year JSON exports produced by **GraderApp** advisers and compile them into official **DepEd School Form 10 (Permanent Academic Records)** spanning all grade levels.

### Key Workflows
1. **Import GraderApp Matrix JSON**: Adviser generates `SF10_GradeMatrix_<Grade>_<Section>_<SY>.json`. Registrar drops it into the SF10 app.
2. **LRN-Based Cumulative Vault**: The app indexes learners by their unique **12-digit Learner Reference Number (LRN)**. When a Grade 7 JSON is imported, Year 1 is populated. When Grade 8 is imported the following year, it automatically attaches to Year 2 without overwriting Year 1.
3. **Official PDF Generation**: Produces print-ready DepEd SF10-JHS and SF10-SHS compliant with **DepEd Order No. 58, s. 2017**.

---

## 2. Ingested JSON Schema (GraderApp Export Contract)

The SF10 Generator expects JSON files matching this exact TypeScript contract:

```typescript
export interface SF10LearnerNameParts {
  lastName: string;       // e.g. "DELA CRUZ"
  firstName: string;      // e.g. "JUAN"
  middleName: string;     // e.g. "A."
  nameExtension: string;  // e.g. "JR.", "III", or ""
}

export interface SF10SubjectRecord {
  subjectName: string;
  classification?: 'Core' | 'Applied' | 'Specialized' | 'General';
  quarters: Record<string, number | null>; // e.g. { "1st Quarter": 88, "2nd Quarter": 90, ... }
  finalRating: number | null;
  actionTaken: 'Passed' | 'Failed' | 'Incomplete';
  isComposite?: boolean;
  components?: Array<{
    name: string;
    quarters: Record<string, number | null>;
  }>;
}

export interface SF10LearnerRecord {
  lrn: string;              // 12-digit DepEd LRN
  fullName: string;         // e.g. "DELA CRUZ, JUAN JR. A."
  nameParts: SF10LearnerNameParts;
  sex: 'Male' | 'Female';
  age?: number;
  birthdate?: string;       // YYYY-MM-DD
  trackStrand?: string;     // SHS Strand (e.g. "Academic - STEM")
  scholasticRecord: {
    subjects: SF10SubjectRecord[];
    generalAverage: number | null;
    actionTaken: 'Promoted' | 'Retained' | 'Conditional' | 'Pending';
    honors?: string | null;
    rank?: number;
  };
  attendanceSummary: {
    totalSchoolDays: number;
    totalDaysPresent: number;
    totalDaysAbsent: number;
  };
}

export interface GradeMatrixSF10ExportJSON {
  exportType: 'DEPED_SF10_GRADE_MATRIX';
  version: '1.0';
  generatedAt: string; // ISO 8601
  schoolInfo: {
    schoolName: string;
    schoolId?: string;   // 6-digit DepEd School ID
    district?: string;
    division?: string;
    region?: string;
  };
  classInfo: {
    schoolYear: string;  // e.g. "2024-2025"
    gradeLevel: string;  // "Grade 7" | "Grade 8" | "Grade 9" | "Grade 10" | "Grade 11" | "Grade 12"
    section: string;     // e.g. "Diamond"
    workspace: 'JHS' | 'SHS';
    trackStrand?: string;
    adviserName: string;
    principalName: string;
    passingGrade: number;
  };
  subjectsSummary: Array<{
    name: string;
    isComposite: boolean;
    components?: string[];
  }>;
  totalStudents: number;
  students: SF10LearnerRecord[];
}
```

---

## 3. Sample Ingestion Payload

```json
{
  "exportType": "DEPED_SF10_GRADE_MATRIX",
  "version": "1.0",
  "generatedAt": "2026-10-20T04:38:00.000Z",
  "schoolInfo": {
    "schoolName": "SAN ROQUE PARISH HIGH SCHOOL, INCORPORATED",
    "schoolId": "404512",
    "district": "Talibon II",
    "division": "Division of Bohol",
    "region": "Region VII - Central Visayas"
  },
  "classInfo": {
    "schoolYear": "2024-2025",
    "gradeLevel": "Grade 7",
    "section": "Diamond",
    "workspace": "JHS",
    "trackStrand": "",
    "adviserName": "MARIA CLARA SANTOS",
    "principalName": "JUAN DELA CRUZ, PhD",
    "passingGrade": 75
  },
  "subjectsSummary": [
    { "name": "English", "isComposite": false },
    { "name": "Mathematics", "isComposite": false },
    { "name": "MAPEH", "isComposite": true, "components": ["Music & Arts", "PE & Health"] }
  ],
  "totalStudents": 1,
  "students": [
    {
      "lrn": "109827364512",
      "fullName": "ALCANTARA, MIGUEL JR. L.",
      "nameParts": {
        "lastName": "ALCANTARA",
        "firstName": "MIGUEL",
        "middleName": "L.",
        "nameExtension": "JR."
      },
      "sex": "Male",
      "age": 13,
      "birthdate": "2013-05-15",
      "trackStrand": "",
      "scholasticRecord": {
        "subjects": [
          {
            "subjectName": "English",
            "quarters": { "1st Quarter": 89, "2nd Quarter": 91, "3rd Quarter": 90, "4th Quarter": 92 },
            "finalRating": 91,
            "actionTaken": "Passed"
          },
          {
            "subjectName": "Mathematics",
            "quarters": { "1st Quarter": 85, "2nd Quarter": 87, "3rd Quarter": 88, "4th Quarter": 90 },
            "finalRating": 88,
            "actionTaken": "Passed"
          },
          {
            "subjectName": "MAPEH",
            "quarters": { "1st Quarter": 90, "2nd Quarter": 92, "3rd Quarter": 91, "4th Quarter": 93 },
            "finalRating": 92,
            "actionTaken": "Passed",
            "isComposite": true,
            "components": [
              { "name": "Music & Arts", "quarters": { "1st Quarter": 90, "2nd Quarter": 92, "3rd Quarter": 91, "4th Quarter": 93 } },
              { "name": "PE & Health", "quarters": { "1st Quarter": 90, "2nd Quarter": 92, "3rd Quarter": 91, "4th Quarter": 93 } }
            ]
          }
        ],
        "generalAverage": 90.33,
        "actionTaken": "Promoted",
        "honors": "With Honors",
        "rank": 1
      },
      "attendanceSummary": {
        "totalSchoolDays": 204,
        "totalDaysPresent": 201,
        "totalDaysAbsent": 3
      }
    }
  ]
}
```

---

## 4. Multi-Year Cumulative Data Model in SF10 App

In the SF10 Generator app, maintain a persistent local SQLite / IndexedDB database with:

```typescript
export interface CumulativeLearnerRecord {
  lrn: string; // Primary key
  nameParts: SF10LearnerNameParts;
  birthdate: string;
  sex: 'Male' | 'Female';
  
  // Eligibility
  elementaryEligibility?: {
    schoolName: string;
    schoolId: string;
    generalAverage: number;
    completionDate: string;
  };
  jhsEligibility?: {
    schoolName: string;
    schoolId: string;
    generalAverage: number;
    completionDate: string;
  };

  // 4 Academic Slots for JHS
  jhsRecord?: {
    grade7?: YearScholasticBlock;
    grade8?: YearScholasticBlock;
    grade9?: YearScholasticBlock;
    grade10?: YearScholasticBlock;
  };

  // Semestral Slots for SHS
  shsRecord?: {
    grade11Sem1?: SemScholasticBlock;
    grade11Sem2?: SemScholasticBlock;
    grade12Sem1?: SemScholasticBlock;
    grade12Sem2?: SemScholasticBlock;
  };
}
```

---

## 5. Master Prompt to Give to Your AI IDE

Copy and paste the exact prompt below into your AI IDE (Antigravity, Cursor, Windsurf, etc.) when initializing the new SF10 app repository:

```markdown
You are building a dedicated DepEd School Form 10 (SF10) Permanent Record Generator Application for Philippine High Schools (Junior High School SF10-JHS & Senior High School SF10-SHS) per DepEd Order No. 58, s. 2017.

### Technology Stack
- Framework: Tauri 2.0 + React + TypeScript + Tailwind CSS (Vite)
- PDF Generation: jsPDF + jspdf-autotable
- Local Storage: IndexedDB (Dexie.js) or SQLite for permanent local archiving

### Key Purpose & Workflow
1. The app serves as the School Registrar's Cumulative Vault.
2. It ingests yearly JSON files exported by section advisers from GraderApp ("DEPED_SF10_GRADE_MATRIX").
3. Each imported JSON contains class metadata (School ID, Division, Region, Section, School Year, Grade Level) and a list of students with quarterly grades, final ratings, general average, promotion status, and attendance.
4. The app matches students by their 12-digit LRN:
   - When a "Grade 7" JSON is uploaded, populate Year 1 (Grade 7).
   - When "Grade 8", "Grade 9", or "Grade 10" JSONs are uploaded later, append them to the student's cumulative record without wiping existing years.
5. Provide a Clean UI with:
   - Master Learner Directory (Search by LRN or Name, filter by Batch/SY).
   - Learner Detail Page showing their 4-year cumulative timeline (Grade 7 to 10 or Grade 11 to 12).
   - "Import GraderApp JSON" drag-and-drop modal.
   - "Generate SF-10 PDF" button with single and bulk printing.

### Required DepEd SF10 PDF Features
1. Official DepEd Headers: Republic of the Philippines, Department of Education, School ID, Division, Region.
2. Learner Information: PSA Birth Certificate Last/First/Middle/Ext Name, LRN, Birthdate (MM/DD/YYYY), Sex.
3. Eligibility Box: Elementary / JHS completer credentials.
4. Scholastic Record Blocks: 4 distinct tables for Grades 7, 8, 9, 10 (or Semesters for SHS) with Quarters 1-4, Final Rating, Action Taken, and General Average.
5. Remedial Classes & Certification footer with Principal signature.

Please refer to the specification document `docs/SF10_GENERATOR_SPECIFICATION.md` for the exact JSON types and structure.
```
