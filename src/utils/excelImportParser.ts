import * as XLSX from 'xlsx';
import { Student } from '../types';

export interface ParsedExcelGradebook {
  students: Omit<Student, 'id'>[];
  assessments: {
    category: 'WOW' | 'PPT' | 'QSTE';
    name: string;
    perfectScore: number;
    colIndex: number;
  }[];
  scores: Record<string, Record<string, number>>; // studentLRN -> tempAssessmentIndex -> score
  subject?: string;
  gradeLevel?: string;
  section?: string;
  teacherName?: string;
  schoolName?: string;
  quarter?: string;
  skippedRows?: number; // learner rows that lacked a valid 12-digit LRN or name
}

/**
 * Normalizes text for keyword analysis.
 */
function clean(str: any): string {
  return String(str || '').trim().toUpperCase();
}

/**
 * Parses any generic or DepEd-formatted Excel class record.
 * Automatically identifies:
 * - Student LRN and Names
 * - Written Works (WW, Written, Quiz, Activity)
 * - Performance Tasks (PT, Performance, Task, Project)
 * - Quarterly Exam / Term Exam (QA, QE, Exam, Periodic, Quarterly)
 */
export async function parseTeacherExcelRecords(file: File): Promise<ParsedExcelGradebook> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          return reject(new Error('The uploaded Excel file contains no worksheets.'));
        }

        // Use the first active worksheet
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

        if (rows.length < 2) {
          return reject(new Error('The worksheet does not contain sufficient rows.'));
        }

        // Step 0: Read class metadata printed above the grade table.
        const meta: {
          subject?: string;
          gradeLevel?: string;
          section?: string;
          teacherName?: string;
          schoolName?: string;
          quarter?: string;
        } = {};

        const readCell = (r: number, c: number) =>
          String(rows[r]?.[c] ?? '').replace(/\s+/g, ' ').trim();

        const normalizeQuarter = (text: string): string | undefined => {
          const q = String(text || '').match(/\b(1st|2nd|3rd|4th)\s+quarter\b/i);
          if (q) return `${q[1].charAt(0)}${q[1].slice(1).toLowerCase()} Quarter`;
          const sem = String(text || '').match(/\bsemester\s*([12])\b/i);
          if (sem) return `Semester ${sem[1]}`;
          return undefined;
        };

        // Usually row 0 holds the school name; ignore short labels like "School Year".
        outerSchool: for (let r = 0; r < Math.min(rows.length, 10); r++) {
          const row = rows[r] || [];
          for (let c = 0; c < Math.min(row.length, 4); c++) {
            const text = readCell(r, c);
            if (!text || text.length < 8) continue;
            if (!/(SCHOOL|ACADEMY|COLLEGE|UNIVERSITY)/i.test(text)) continue;
            if (/^(SCHOOL|SCHOOL NAME|SCHOOL YEAR)$/i.test(text)) continue;
            if (/^SCHOOL\s+(YEAR|ID|ADDRESS|DIVISION)/i.test(text)) continue;
            if (text.split(/\s+/).length < 3 && !text.includes(',')) continue;
            meta.schoolName = text;
            break outerSchool;
          }
        }

        // Label/value metadata pairs, either "Label: Value" or adjacent cells.
        for (let r = 0; r < Math.min(rows.length, 25); r++) {
          const row = rows[r] || [];
          for (let c = 0; c < row.length; c++) {
            const text = readCell(r, c);
            if (!text || text.length > 80) continue;

            let label = clean(text).replace(/[:\-]+$/, '').trim();
            let value = '';
            const colonMatch = text.match(/^([^:]{2,40}):\s*(.+)$/);
            if (colonMatch) {
              label = clean(colonMatch[1]).replace(/[:\-]+$/, '').trim();
              value = colonMatch[2].trim();
            } else {
              const isKnownLabel =
                /^(SUBJECT|SUBJECT NAME|TEACHER|TEACHER NAME|ADVISER|CLASS ADVISER|SCHOOL|SCHOOL NAME|GRADE|GRADE LEVEL|SECTION|QUARTER)$/.test(label) ||
                (label.includes('GRADE') && label.includes('SECTION'));
              if (!isKnownLabel) continue;
              for (let cc = c + 1; cc < Math.min(row.length, c + 4); cc++) {
                const candidate = readCell(r, cc);
                if (candidate) {
                  value = candidate;
                  break;
                }
              }
            }
            if (!value) continue;

            if (/^(SUBJECT|SUBJECT NAME)$/.test(label)) {
              meta.subject = value;
            } else if (/^(TEACHER|TEACHER NAME|ADVISER|CLASS ADVISER)$/.test(label)) {
              meta.teacherName = value;
            } else if (/^(SCHOOL|SCHOOL NAME)$/.test(label)) {
              meta.schoolName = value;
            } else if (/^(GRADE|GRADE LEVEL)$/.test(label)) {
              meta.gradeLevel = value;
            } else if (/^SECTION$/.test(label)) {
              meta.section = value;
            } else if (label.includes('GRADE') && label.includes('SECTION')) {
              const parts = value.split(/\s*[-–—|]\s*/);
              if (parts.length >= 2) {
                meta.gradeLevel = parts[0].trim();
                meta.section = parts.slice(1).join(' - ').trim();
              } else {
                meta.gradeLevel = value;
              }
            } else if (/^QUARTER$/.test(label)) {
              meta.quarter = normalizeQuarter(value);
            }
          }
        }

        // The worksheet name (or title row) tells us which quarter the scores belong to.
        if (!meta.quarter) {
          meta.quarter = normalizeQuarter(workbook.SheetNames[0] || '');
        }
        if (!meta.quarter) {
          for (let r = 0; r < Math.min(rows.length, 12) && !meta.quarter; r++) {
            const rowText = (rows[r] || []).map((cell: any) => String(cell || '')).join(' ');
            meta.quarter = normalizeQuarter(rowText);
          }
        }

        // Step 1: Find LRN and Student Name column headers or student rows
        let lrnCol = -1;
        let nameCol = -1;
        let sexCol = -1;
        let headerRowIdx = -1;

        for (let r = 0; r < Math.min(rows.length, 25); r++) {
          const row = rows[r];
          for (let c = 0; c < row.length; c++) {
            const cellVal = clean(row[c]);
            if (cellVal === 'LRN' || cellVal.includes('LEARNER REFERENCE') || cellVal === 'STUDENT LRN') {
              lrnCol = c;
              headerRowIdx = r;
            }
            if (
              cellVal === 'NAME' ||
              cellVal === 'STUDENT NAME' ||
              cellVal === 'LEARNER NAME' ||
              cellVal === "LEARNER'S NAME" ||
              cellVal.includes('NAME OF LEARNER')
            ) {
              nameCol = c;
              headerRowIdx = r;
            }
            if (cellVal === 'SEX' || cellVal === 'GENDER') {
              sexCol = c;
            }
          }
          if (nameCol !== -1) break;
        }

        // Fallbacks if explicit header text wasn't detected
        if (nameCol === -1) {
          // Look for first column containing typical alphabetical name strings
          for (let c = 0; c < 5; c++) {
            let nameHits = 0;
            for (let r = 0; r < rows.length; r++) {
              const val = String(rows[r][c] || '').trim();
              if (val.includes(',') && val.length > 5 && !/\d/.test(val)) {
                nameHits++;
              }
            }
            if (nameHits >= 2) {
              nameCol = c;
              break;
            }
          }
        }

        if (nameCol === -1) {
          nameCol = 1; // standard DepEd 2nd column
        }
        if (lrnCol === -1) {
          lrnCol = 0; // standard DepEd 1st column
        }

        // Step 2: Detect assessment columns across top header rows (0..headerRowIdx + 2)
        const detectedAssessments: {
          category: 'WOW' | 'PPT' | 'QSTE';
          name: string;
          perfectScore: number;
          colIndex: number;
        }[] = [];

        // Scan row headers for category blocks & individual assessment columns
        let currentCategory: 'WOW' | 'PPT' | 'QSTE' | null = null;
        let wwCount = 0;
        let ptCount = 0;
        let qeCount = 0;

        const maxScanRow = Math.max(headerRowIdx + 2, 8);
        const maxCols = Math.max(...rows.slice(0, maxScanRow).map(r => r.length));

        // Scan each column from left to right after nameCol
        for (let c = Math.max(nameCol, lrnCol, sexCol) + 1; c < maxCols; c++) {
          let colTexts: string[] = [];
          for (let r = 0; r < Math.min(rows.length, maxScanRow); r++) {
            if (rows[r][c] !== undefined && rows[r][c] !== '') {
              colTexts.push(clean(rows[r][c]));
            }
          }
          const combined = colTexts.join(' ');

          // Check if column belongs to summary/total or learner-info columns (skip them)
          if (
            combined.includes('TOTAL') ||
            combined.includes('PERCENTAGE') ||
            combined.includes('WEIGHTED') ||
            combined.includes('INITIAL') ||
            combined.includes('QUARTERLY GRADE') ||
            combined.includes('TRANSMUTED') ||
            combined.includes('REMARKS') ||
            combined.includes('STUDENT NO') ||
            combined.includes('STUDENT NUMBER') ||
            combined.includes('BIRTHDATE') ||
            combined.includes('BIRTHDAY') ||
            combined.includes('ADDRESS') ||
            combined.includes('CONTACT') ||
            combined === 'NO.' ||
            combined === 'AGE'
          ) {
            continue;
          }

          // Category detection
          if (combined.includes('WRITTEN') || combined.includes('QUIZ') || combined.startsWith('WW') || combined.includes('WS')) {
            currentCategory = 'WOW';
          } else if (combined.includes('PERFORMANCE') || combined.includes('TASK') || combined.startsWith('PT') || combined.includes('PROJ')) {
            currentCategory = 'PPT';
          } else if (combined.includes('EXAM') || combined.includes('QUARTERLY') || combined.includes('PERIODIC') || combined.startsWith('QE') || combined.startsWith('QA')) {
            currentCategory = 'QSTE';
          }

          // If no specific category hit yet, check column header text or fallback based on assessment count
          if (!currentCategory) {
            currentCategory = 'WOW';
          }

          // Search for Highest Possible Score (HPS) in the column
          let perfectScore = currentCategory === 'QSTE' ? 50 : 20; // DepEd defaults
          for (let r = 0; r < Math.min(rows.length, maxScanRow + 2); r++) {
            const val = rows[r][c];
            const prevLabel = clean(rows[r][0] || rows[r][1] || rows[r][nameCol]);
            const numericVal = typeof val === 'number'
              ? val
              : Number(String(val ?? '').replace(/[^\d.]/g, ''));
            if (
              (prevLabel.includes('HPS') || prevLabel.includes('HIGHEST') || prevLabel.includes('PERFECT') || prevLabel.includes('MAX')) &&
              !isNaN(numericVal) &&
              numericVal > 0
            ) {
              perfectScore = numericVal;
              break;
            }
          }

          // Prefer the printed column header (e.g. "Quiz 1") over a generated name.
          let headerLabel = '';
          for (let r = 0; r <= Math.max(headerRowIdx, 0); r++) {
            const text = clean(rows[r]?.[c]);
            if (text && !/^(HPS|HIGHEST|PERFECT|MAX)/.test(text) && !/^\d+(\.\d+)?$/.test(text)) {
              headerLabel = text;
            }
          }

          let assName = '';
          if (currentCategory === 'WOW') {
            wwCount++;
            assName = headerLabel || `WW${wwCount}: Written Work ${wwCount}`;
          } else if (currentCategory === 'PPT') {
            ptCount++;
            assName = headerLabel || `PT${ptCount}: Performance Task ${ptCount}`;
          } else {
            qeCount++;
            assName = headerLabel || `Quarterly Examination`;
          }

          // Verify that this column contains at least one numeric score in student rows
          let hasNumericScore = false;
          for (let r = Math.max(headerRowIdx + 1, 4); r < rows.length; r++) {
            const rawVal = rows[r][c];
            if (typeof rawVal === 'number' && !isNaN(rawVal)) {
              hasNumericScore = true;
              break;
            }
          }

          if (hasNumericScore) {
            detectedAssessments.push({
              category: currentCategory,
              name: assName,
              perfectScore,
              colIndex: c
            });
          }
        }

        // Step 3: Extract Students and Scores
        const parsedStudents: Omit<Student, 'id'>[] = [];
        const studentScores: Record<string, Record<string, number>> = {};
        const seenLrns = new Set<string>();
        let skippedRows = 0;

        let currentSectionSex: 'Male' | 'Female' = 'Male';

        const startRow = Math.max(headerRowIdx + 1, 3);
        for (let r = startRow; r < rows.length; r++) {
          const row = rows[r];
          if (!row || row.length === 0) continue;

          const rawName = String(row[nameCol] || '').trim();
          const cleanName = clean(rawName);
          const sectionLabel = cleanName.replace(/^[^A-Z]+/, '');

          // Check for Male/Female Section Headers (e.g. "-- MALE LEARNERS --")
          if (/^MALE\b/.test(sectionLabel) || sectionLabel === 'BOYS') {
            currentSectionSex = 'Male';
            continue;
          }
          if (/^FEMALE\b/.test(sectionLabel) || sectionLabel === 'GIRLS') {
            currentSectionSex = 'Female';
            continue;
          }

          // Skip non-student rows
          if (
            !rawName ||
            cleanName.includes('TOTAL') ||
            cleanName.includes('AVERAGE') ||
            cleanName.includes('LEARNER') ||
            cleanName.includes('HIGHEST') ||
            cleanName.includes('HPS') ||
            cleanName.includes('NAME') ||
            cleanName.length < 3
          ) {
            continue;
          }

          // Extract LRN. Never invent one: official reports need the real 12-digit LRN.
          let lrnStr = String(row[lrnCol] ?? '').replace(/\D/g, '').trim();
          // Excel sometimes strips a leading zero when storing the LRN as a number.
          if (lrnStr.length === 11) lrnStr = `0${lrnStr}`;
          if (lrnStr.length !== 12 || seenLrns.has(lrnStr)) {
            skippedRows++;
            continue;
          }
          seenLrns.add(lrnStr);

          // Extract Sex
          let studentSex = currentSectionSex;
          if (sexCol !== -1 && row[sexCol]) {
            const rawSex = clean(row[sexCol]);
            if (rawSex.startsWith('F')) studentSex = 'Female';
            else if (rawSex.startsWith('M')) studentSex = 'Male';
          }

          parsedStudents.push({
            lrn: lrnStr,
            name: rawName.replace(/\s+/g, ' ').toUpperCase(),
            sex: studentSex,
            status: 'Active'
          });

          // Read Scores for each detected assessment
          studentScores[lrnStr] = {};
          detectedAssessments.forEach((ass, aIdx) => {
            const scoreVal = row[ass.colIndex];
            if (typeof scoreVal === 'number' && !isNaN(scoreVal) && scoreVal >= 0) {
              studentScores[lrnStr][`temp-${aIdx}`] = scoreVal;
            } else if (scoreVal !== '' && !isNaN(Number(scoreVal))) {
              studentScores[lrnStr][`temp-${aIdx}`] = Number(scoreVal);
            }
          });
        }

        if (parsedStudents.length === 0) {
          return reject(new Error(
            skippedRows > 0
              ? `No learners could be imported. ${skippedRows} row(s) had a missing or invalid 12-digit LRN.`
              : 'Could not identify any student records in the Excel file. Please ensure student names are present.'
          ));
        }

        resolve({
          students: parsedStudents,
          assessments: detectedAssessments,
          scores: studentScores,
          skippedRows,
          ...meta
        });
      } catch (err: any) {
        console.error('Excel parse error:', err);
        reject(new Error(err.message || 'Failed to parse Excel file.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read Excel file.'));
    reader.readAsArrayBuffer(file);
  });
}
