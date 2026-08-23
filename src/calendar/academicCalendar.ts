import { Project } from '../types';

export interface AcademicPeriod {
  id: string;           // e.g. '1st Quarter' — must match existing localStorage keys
  label: string;        // display label
  semesterGroup?: 1 | 2; // which semester it belongs to (SHS only)
}

export interface AcademicCalendarConfig {
  type: 'Quarter' | 'Trimester';
  periods: AcademicPeriod[];
  semester1Periods: string[];  // period IDs belonging to Semester 1
  semester2Periods: string[];  // period IDs belonging to Semester 2
}

// The active Quarter calendar (currently the only supported calendar)
export const QUARTER_CALENDAR: AcademicCalendarConfig = {
  type: 'Quarter',
  periods: [
    { id: '1st Quarter', label: '1st Quarter', semesterGroup: 1 },
    { id: '2nd Quarter', label: '2nd Quarter', semesterGroup: 1 },
    { id: '3rd Quarter', label: '3rd Quarter', semesterGroup: 2 },
    { id: '4th Quarter', label: '4th Quarter', semesterGroup: 2 }
  ],
  semester1Periods: ['1st Quarter', '2nd Quarter'],
  semester2Periods: ['3rd Quarter', '4th Quarter']
};

// The new Trimester calendar (Proposed for SY 2027-2028)
export const TRIMESTER_CALENDAR: AcademicCalendarConfig = {
  type: 'Trimester',
  periods: [
    { id: 'Term 1', label: 'Term 1', semesterGroup: 1 },
    { id: 'Term 2', label: 'Term 2', semesterGroup: 1 },
    { id: 'Term 3', label: 'Term 3', semesterGroup: 2 }
  ],
  semester1Periods: ['Term 1', 'Term 2'],
  semester2Periods: ['Term 3']
};

// Returns the calendar config for the given type
export function getCalendar(type: 'Quarter' | 'Trimester' = 'Quarter'): AcademicCalendarConfig {
  if (type === 'Trimester') {
    return TRIMESTER_CALENDAR;
  }
  return QUARTER_CALENDAR;
}

// Determines the correct calendar for a project
// SHS currently MUST use Quarter regardless of global settings
export function getProjectCalendar(
  project: Pick<Project, 'workspace'>,
  globalCalendarType: 'Quarter' | 'Trimester' = 'Quarter'
): AcademicCalendarConfig {
  if (project.workspace === 'SHS') {
    return QUARTER_CALENDAR;
  }
  return getCalendar(globalCalendarType);
}

// Returns period IDs for a project, respecting SHS One Semester rules
export function getProjectPeriods(
  project: Pick<Project, 'workspace' | 'projectDuration' | 'semester'>,
  globalCalendarType: 'Quarter' | 'Trimester' = 'Quarter'
): string[] {
  const cal = getProjectCalendar(project, globalCalendarType);
  if (project.workspace === 'SHS' && project.projectDuration === 'One Semester') {
    return project.semester === 'Semester 2' ? cal.semester2Periods : cal.semester1Periods;
  }
  return cal.periods.map(p => p.id);
}

// Returns the first period ID for a given calendar type
export function getFirstPeriod(type: 'Quarter' | 'Trimester' = 'Quarter'): string {
  return getCalendar(type).periods[0].id;
}
