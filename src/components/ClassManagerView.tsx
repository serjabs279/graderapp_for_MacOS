import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Student, Assessment, Project, SubjectType, GradeAdjustmentEntry } from '../types';
import { computeProjectStudentGrade, computeGradeAdjustmentDistribution, getSubjectWeights, getSubjectWeightsLabel, getEffectiveScore, getLearnerReassessmentStatus, SHS_PROFILES, SHS_OLD_PROFILES } from '../utils';
import { getProjectPeriods } from '../calendar/academicCalendar';
import { exportClassRecordPDF } from '../utils/pdfExport';
import { globalToast } from '../context/ToastContext';
import TeacherExcelExportModal from './TeacherExcelExportModal';
import GradebookRestoreModal from './GradebookRestoreModal';
import DangerConfirmModal, { TypeToConfirmField } from './DangerConfirmModal';
import { parseTeacherExcelRecords } from '../utils/excelImportParser';
import { exportFile } from '../utils/fileExportAdapter';
import { isAndroid } from '../utils/platform';
import {
  Plus,
  Trash2,
  Edit3,
  Copy,
  ChevronUp,
  ChevronDown,
  Search,
  ArrowUpDown,
  UserPlus,
  Upload,
  FileSpreadsheet,
  Printer,
  FileDown,
  FileText,
  BarChart4,
  Database,
  Archive,
  FolderSync,
  AlertCircle,
  FolderOpen,
  CornerDownRight,
  Sparkles,
  HelpCircle,
  Award,
  Sliders,
  CheckCircle2,
  FileUp,
  ArrowRightLeft,
  RefreshCw,
  ShieldCheck,
  X,
  ChevronLeft,
  RotateCcw,
  RotateCw,
  Settings
} from 'lucide-react';

type TabType = 'gradebook' | 'assessments' | 'roster' | 'reports' | 'project-settings';

export default function ClassManagerView() {
  const {
    projects,
    activeProjectId,
    globalSettings,
    openProject,
    duplicateProject,
    archiveProject,
    deleteProject,
    saveProject,
    setActiveRoute,

    addStudentToActive,
    updateStudentInActive,
    deleteStudentFromActive,
    importRosterToActive,
    syncRosterToSectionGroup,

    addAssessmentToActive,
    updateAssessmentInActive,
    deleteAssessmentFromActive,
    reorderAssessmentsInActive,

    updateScoreInActive,
    clearScoreInActive,
    updateReassessmentScoreInActive,
    clearReassessmentScoreInActive,
    toggleReassessmentForAssessment,
    updateReassessmentSettingsInActive,
    enableReassessmentModeForQuarter,
    updateActiveProjectQuarter,

    toggleGradeAdjustmentMode,
    setGradeAdjustmentForStudent,
    removeGradeAdjustmentForStudent,
    updateProjectTeacherInfo,
    migrateQuarterData
  } = useApp();

  const activeProject = projects.find(p => p.id === activeProjectId);

  // Teacher Info Editing Modal state
  const [showTeacherInfoModal, setShowTeacherInfoModal] = useState(false);
  const [editTeacherName, setEditTeacherName] = useState('');
  const [editSchoolName, setEditSchoolName] = useState('');
  const [editSubjectName, setEditSubjectName] = useState('');
  const [editSectionName, setEditSectionName] = useState('');
  const [editGradeLevel, setEditGradeLevel] = useState('');
  const [editPassingGrade, setEditPassingGrade] = useState(75);
  const [editDepedPolicy, setEditDepedPolicy] = useState<'2015' | '2027'>('2015');
  const [editWeightWW, setEditWeightWW] = useState<number>(30);
  const [editWeightPT, setEditWeightPT] = useState<number>(50);
  const [editWeightQE, setEditWeightQE] = useState<number>(20);

  // Quarter Migration States inside Teacher Info Modal
  const [migrateSourceQuarter, setMigrateSourceQuarter] = useState<string>('4th Quarter');
  const [migrateTargetQuarter, setMigrateTargetQuarter] = useState<string>('1st Quarter');
  const [migrateClearSource, setMigrateClearSource] = useState<boolean>(true);
  const [showMigrateConfirm, setShowMigrateConfirm] = useState<boolean>(false);
  const [migrateConfirmText, setMigrateConfirmText] = useState('');
  const [showClearReassessmentConfirm, setShowClearReassessmentConfirm] = useState(false);

  // Teacher-Only Grade Adjustment states
  const [showAdjustmentLogModal, setShowAdjustmentLogModal] = useState(false);
  const [editingAdjustmentStudent, setEditingAdjustmentStudent] = useState<{
    id: string;
    name: string;
    computedGrade: number;
    currentAdjusted: number;
    currentReason: string;
  } | null>(null);
  const [targetAdjustedGrade, setTargetAdjustedGrade] = useState<number>(75);
  const [adjustmentReason, setAdjustmentReason] = useState<string>('Performance merit and remediation');

  // Smart Excel Class Record Import Modal State
  const [showExcelImportModal, setShowExcelImportModal] = useState(false);
  const [parsedExcelData, setParsedExcelData] = useState<import('../utils/excelImportParser').ParsedExcelGradebook | null>(null);
  const [excelImportFile, setExcelImportFile] = useState<File | null>(null);
  const [isParsingExcel, setIsParsingExcel] = useState(false);
  const [excelImportError, setExcelImportError] = useState<string | null>(null);

  // Mastery-Based Component Reassessment framework states
  const [reassessmentMode, setReassessmentMode] = useState(false);
  const [showReassessmentSettingsModal, setShowReassessmentSettingsModal] = useState(false);

  // Derive active quarter state from project (calendar-driven)
  const activeQuarterId = activeProject?.lastActiveQuarter || '1st Quarter';
  const activeQuarterData = activeProject?.quarters?.[activeQuarterId];
  const isAdjustmentModeOn = Boolean(activeQuarterData?.adjustmentModeEnabled);

  // Compute the list of periods this project supports (1 or 4 quarters, 3 terms, etc.)
  const projectPeriods: string[] = activeProject
    ? getProjectPeriods(activeProject, (globalSettings.calendarType || 'Quarter') as 'Quarter' | 'Trimester')
    : [];

  // Workspace sub-tabs
  const [activeTab, setActiveTab] = useState<TabType>('gradebook');
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  // Gradebook cell-selection reference for keyboard navigation
  const [selectedCell, setSelectedCell] = useState<{ studentId: string; assessmentId: string } | null>(null);
  const [editingScore, setEditingScore] = useState<{ studentId: string; assessmentId: string; tempValue: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const gradebookTableRef = useRef<HTMLTableElement>(null);

  // Undo/Redo history stack
  const [undoStack, setUndoStack] = useState<{ studentId: string; assessmentId: string; prevVal: number | undefined }[]>([]);
  const [redoStack, setRedoStack] = useState<{ studentId: string; assessmentId: string; nextVal: number | undefined }[]>([]);

  // Search/Sort roster states
  const [studentSearch, setStudentSearch] = useState('');
  const [studentSort, setStudentSort] = useState<'name-asc' | 'name-desc' | 'lrn' | 'sex'>('name-asc');

  // SHS Custom Weights Modal State
  const [shsCustomModalOpen, setShsCustomModalOpen] = useState(false);
  const [shsCustomWW, setShsCustomWW] = useState(
    Math.round((activeProject?.customWeights?.wow ?? 0.30) * 100)
  );
  const [shsCustomPT, setShsCustomPT] = useState(
    Math.round((activeProject?.customWeights?.ppt ?? 0.50) * 100)
  );
  const [shsCustomQA, setShsCustomQA] = useState(
    Math.round((activeProject?.customWeights?.qste ?? 0.20) * 100)
  );

  useEffect(() => {
    if (activeProject?.customWeights) {
      setShsCustomWW(Math.round(activeProject.customWeights.wow * 100));
      setShsCustomPT(Math.round(activeProject.customWeights.ppt * 100));
      setShsCustomQA(Math.round(activeProject.customWeights.qste * 100));
    }
  }, [activeProject?.id, activeProject?.customWeights]);

  // Excel-style Focus Cell: hovering a score cell (or an assessment header) washes
  // the learner row and assessment column. Classes are toggled straight on the table
  // so sweeping the pointer across a large grid never triggers a React re-render.
  useEffect(() => {
    const table = gradebookTableRef.current;
    if (!table) return;

    let hoveredKey: string | null = null;

    const clearHover = () => {
      table
        .querySelectorAll('.focus-row, .focus-col, .focus-cell')
        .forEach((el) => el.classList.remove('focus-row', 'focus-col', 'focus-cell'));
      hoveredKey = null;
    };

    const handlePointerOver = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const row = target.closest<HTMLElement>('tr[data-focus-row]');
      const cell = target.closest<HTMLElement>('[data-focus-col]');

      if (!row && !cell) {
        if (hoveredKey !== null) clearHover();
        return;
      }

      const key = `${row?.dataset.focusRow ?? ''}|${cell?.dataset.focusCol ?? ''}`;
      if (key === hoveredKey) return;
      clearHover();
      hoveredKey = key;

      if (row?.dataset.focusRow) {
        const rowId = row.dataset.focusRow;
        table.querySelectorAll<HTMLElement>('tr[data-focus-row]').forEach((rowEl) => {
          if (rowEl.dataset.focusRow === rowId) rowEl.classList.add('focus-row');
        });
      }
      if (cell?.dataset.focusCol) {
        const colId = cell.dataset.focusCol;
        table.querySelectorAll<HTMLElement>('[data-focus-col]').forEach((colEl) => {
          if (colEl.dataset.focusCol === colId) colEl.classList.add('focus-col');
        });
        cell.classList.add('focus-cell');
      }
    };

    table.addEventListener('pointerover', handlePointerOver);
    table.addEventListener('pointerleave', clearHover);
    return () => {
      table.removeEventListener('pointerover', handlePointerOver);
      table.removeEventListener('pointerleave', clearHover);
      clearHover();
    };
  }, [activeTab, activeProject?.id, activeQuarterId, reassessmentMode, isAdjustmentModeOn, activeQuarterData?.assessments.length, activeProject?.students.length]);

  // CSV batch import states
  const [csvPasteMode, setCsvPasteMode] = useState(false);
  const [csvInput, setCsvInput] = useState('');

  // Manual student add states
  const [newStudentLrn, setNewStudentLrn] = useState('');
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentSex, setNewStudentSex] = useState<'Male' | 'Female'>('Male');
  const [newStudentNumber, setNewStudentNumber] = useState('');

  // Edit student modal states
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Assessment form states
  const [assName, setAssName] = useState('');
  const [assCategory, setAssCategory] = useState<'WOW' | 'PPT' | 'QSTE'>('WOW');
  const [assPerfectScore, setAssPerfectScore] = useState(20);
  const [assDate, setAssDate] = useState(new Date().toISOString().split('T')[0]);
  const [assDescription, setAssDescription] = useState('');

  // Quick Add Assessment Modal states
  const [isAddAssessmentModalOpen, setIsAddAssessmentModalOpen] = useState(false);
  const [isExcelExportOpen, setIsExcelExportOpen] = useState(false);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [modalAssCategory, setModalAssCategory] = useState<'WOW' | 'PPT' | 'QSTE'>('WOW');
  const [modalAssName, setModalAssName] = useState('');
  const [modalAssPerfectScore, setModalAssPerfectScore] = useState<number>(20);
  const [modalAssDate, setModalAssDate] = useState('');
  const [modalAssDescription, setModalAssDescription] = useState('');

  const openAddAssessmentModal = (cat: 'WOW' | 'PPT' | 'QSTE' = 'WOW') => {
    if (!activeProject) return;
    setModalAssCategory(cat);

    const existingInCat = (activeQuarterData?.assessments || []).filter(a => a.category === cat);
    const nextNum = existingInCat.length + 1;

    if (cat === 'WOW') {
      setModalAssName(`WW${nextNum}: Written Work ${nextNum}`);
      setModalAssPerfectScore(20);
    } else if (cat === 'PPT') {
      setModalAssName(`PT${nextNum}: Performance Task ${nextNum}`);
      setModalAssPerfectScore(50);
    } else {
      setModalAssName(`Quarterly Examination`);
      setModalAssPerfectScore(100);
    }

    setModalAssDate(new Date().toISOString().split('T')[0]);
    setModalAssDescription('');
    setIsAddAssessmentModalOpen(true);
  };

  const handleModalCategoryChange = (cat: 'WOW' | 'PPT' | 'QSTE') => {
    setModalAssCategory(cat);
    if (!activeProject) return;
    const existingInCat = (activeQuarterData?.assessments || []).filter(a => a.category === cat);
    const nextNum = existingInCat.length + 1;

    if (cat === 'WOW') {
      setModalAssName(`WW${nextNum}: Written Work ${nextNum}`);
      setModalAssPerfectScore(20);
    } else if (cat === 'PPT') {
      setModalAssName(`PT${nextNum}: Performance Task ${nextNum}`);
      setModalAssPerfectScore(50);
    } else {
      setModalAssName(`Quarterly Examination`);
      setModalAssPerfectScore(100);
    }
  };

  const handleModalSubmitAssessment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalAssName.trim()) {
      showCustomAlert("Please enter an assessment name.", "Validation Error", "error");
      return;
    }
    if (!modalAssPerfectScore || modalAssPerfectScore <= 0) {
      showCustomAlert("Highest Possible Score (HPS) must be greater than 0.", "Validation Error", "error");
      return;
    }

    addAssessmentToActive(activeQuarterId, {
      name: modalAssName.trim(),
      category: modalAssCategory,
      perfectScore: modalAssPerfectScore,
      date: modalAssDate || undefined,
      description: modalAssDescription || undefined
    });

    setIsAddAssessmentModalOpen(false);
    showCustomAlert(`Successfully added column "${modalAssName.trim()}" (${modalAssCategory}, HPS: ${modalAssPerfectScore}) to gradebook spreadsheet!`, "Assessment Column Created", "success");
  };

  // Edit Assessment / HPS Modal states
  const [editingAssessmentModal, setEditingAssessmentModal] = useState<Assessment | null>(null);
  const [editAssName, setEditAssName] = useState('');
  const [editAssCategory, setEditAssCategory] = useState<'WOW' | 'PPT' | 'QSTE'>('WOW');
  const [editAssPerfectScore, setEditAssPerfectScore] = useState<number>(20);
  const [editAssDate, setEditAssDate] = useState('');
  const [editAssDescription, setEditAssDescription] = useState('');

  const handleOpenEditAssessment = (ass: Assessment) => {
    setEditingAssessmentModal(ass);
    setEditAssName(ass.name);
    setEditAssCategory(ass.category);
    setEditAssPerfectScore(ass.perfectScore);
    setEditAssDate(ass.date || '');
    setEditAssDescription(ass.description || '');
  };

  const handleSaveEditAssessment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAssessmentModal) return;
    if (!editAssName.trim()) {
      showCustomAlert("Please enter an assessment name.", "Validation Error", "error");
      return;
    }
    if (!editAssPerfectScore || editAssPerfectScore <= 0) {
      showCustomAlert("Highest Possible Score (HPS) must be greater than 0.", "Validation Error", "error");
      return;
    }

    const updatedAssessment: Assessment = {
      ...editingAssessmentModal,
      name: editAssName.trim(),
      category: editAssCategory,
      perfectScore: editAssPerfectScore,
      date: editAssDate || undefined,
      description: editAssDescription || undefined
    };

    updateAssessmentInActive(activeQuarterId, updatedAssessment);
    setEditingAssessmentModal(null);
    globalToast.success(`Updated "${updatedAssessment.name}" HPS to ${updatedAssessment.perfectScore} pts.`);
  };


  // Selected student for Individual Summary Report Tab
  const [reportStudentId, setReportStudentId] = useState<string>('');

  // Custom inline modals to bypass browser dialog blocking inside sandboxed iframe
  const [customAlert, setCustomAlert] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type?: 'success' | 'error' | 'info';
  } | null>(null);

  const [customConfirm, setCustomConfirm] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const showCustomAlert = (message: string, title = "System Notification", type: 'success' | 'error' | 'info' = 'info') => {
    globalToast.show(type, message, title);
    setCustomAlert({
      isOpen: true,
      title,
      message,
      type
    });
  };

  const showCustomConfirm = (message: string, onConfirm: () => void, title = "Action Confirmation") => {
    setCustomConfirm({
      isOpen: true,
      title,
      message,
      onConfirm
    });
  };

  // Focus input when editing starts
  const editKey = editingScore ? `${editingScore.studentId}-${editingScore.assessmentId}` : null;
  useEffect(() => {
    if (editingScore && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editKey]);

  // Handle outside click to save editing cell
  const handleCellBlur = () => {
    if (editingScore) {
      saveEditingCell();
    }
  };

  const saveEditingCell = () => {
    if (!editingScore || !activeProject) return;
    const { studentId, assessmentId, tempValue } = editingScore;
    const assessment = (activeQuarterData?.assessments || []).find(a => a.id === assessmentId);
    if (!assessment) return;

    if (tempValue.trim() === '') {
      if (reassessmentMode) {
        clearReassessmentScoreInActive(activeQuarterId, studentId, assessmentId);
      } else {
        const currentScore = (activeQuarterData?.scores || {})[studentId]?.[assessmentId];
        setUndoStack(prev => [...prev, { studentId, assessmentId, prevVal: currentScore }]);
        setRedoStack([]);
        clearScoreInActive(activeQuarterId, studentId, assessmentId);
      }
    } else {
      const parsed = parseInt(tempValue);
      if (isNaN(parsed) || parsed < 0 || parsed > assessment.perfectScore) {
        showCustomAlert(`Must be a whole number between 0 and the perfect score of ${assessment.perfectScore}.`, "Invalid Score Entry", "error");
      } else {
        if (reassessmentMode) {
          // In reassessment mode, always save the reassessment score regardless of mastery.
          // The effective score engine will apply policy (Average/Highest/Replacement).
          updateReassessmentScoreInActive(activeQuarterId, studentId, assessmentId, parsed);
        } else {
          const currentScore = (activeQuarterData?.scores || {})[studentId]?.[assessmentId];
          setUndoStack(prev => [...prev, { studentId, assessmentId, prevVal: currentScore }]);
          setRedoStack([]);
          updateScoreInActive(activeQuarterId, studentId, assessmentId, parsed);
        }
      }
    }
    setEditingScore(null);
  };

  // Keyboard navigation handler (Arrow keys, tab, enter, escape)
  const handleTableKeyDown = (e: React.KeyboardEvent, studentId: string, assessmentId: string, studentIndex: number, assessmentIndex: number) => {
    if (!activeProject) return;
    const activeStudents = activeProject.students.filter(s => s.status !== 'Dropped' && s.status !== 'Transferred');
    const assessments = [...(activeQuarterData?.assessments || [])].sort((a, b) => a.order - b.order);

    // Move the selection and hand DOM focus to the target cell so the focus-cell
    // crosshair follows the keyboard and repeated arrow presses keep advancing.
    const moveToCell = (nextStudentId: string, nextAssessmentId: string) => {
      setSelectedCell({ studentId: nextStudentId, assessmentId: nextAssessmentId });
      requestAnimationFrame(() => {
        const table = gradebookTableRef.current;
        if (!table) return;
        const rowEl = table.querySelector<HTMLElement>(`tr[data-focus-row="${CSS.escape(nextStudentId)}"]`);
        rowEl?.querySelector<HTMLElement>(`td[data-focus-col="${CSS.escape(nextAssessmentId)}"]`)?.focus();
      });
    };

    if (editingScore) {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveEditingCell();
        // Move select down to next student
        const nextIndex = studentIndex + 1;
        if (nextIndex < activeStudents.length) {
          const nextStudentId = activeStudents[nextIndex].id;
          moveToCell(nextStudentId, assessmentId);
        }
      } else if (e.key === 'Escape') {
        setEditingScore(null);
      }
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      const currentScore = reassessmentMode
        ? (activeQuarterData?.reassessmentScores || {})[studentId]?.[assessmentId]
        : (activeQuarterData?.scores || {})[studentId]?.[assessmentId];
      setEditingScore({
        studentId,
        assessmentId,
        tempValue: currentScore !== undefined ? currentScore.toString() : ''
      });
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = studentIndex + 1;
      if (nextIndex < activeStudents.length) {
        moveToCell(activeStudents[nextIndex].id, assessmentId);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = studentIndex - 1;
      if (prevIndex >= 0) {
        moveToCell(activeStudents[prevIndex].id, assessmentId);
      }
    } else if (e.key === 'ArrowRight' || e.key === 'Tab') {
      e.preventDefault();
      const nextAssIndex = assessmentIndex + 1;
      if (nextAssIndex < assessments.length) {
        moveToCell(studentId, assessments[nextAssIndex].id);
      } else {
        // Move to first assessment of next student
        const nextStudentIndex = studentIndex + 1;
        if (nextStudentIndex < activeStudents.length) {
          moveToCell(activeStudents[nextStudentIndex].id, assessments[0].id);
        }
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevAssIndex = assessmentIndex - 1;
      if (prevAssIndex >= 0) {
        moveToCell(studentId, assessments[prevAssIndex].id);
      } else {
        // Move to last assessment of previous student
        const prevStudentIndex = studentIndex - 1;
        if (prevStudentIndex >= 0) {
          moveToCell(activeStudents[prevStudentIndex].id, assessments[assessments.length - 1].id);
        }
      }
    }
  };

  // Undo score edits
  const handleUndo = () => {
    if (undoStack.length === 0 || !activeProject) return;
    const lastEdit = undoStack[undoStack.length - 1];
    const currentVal = (activeQuarterData?.scores || {})[lastEdit.studentId]?.[lastEdit.assessmentId];

    setRedoStack(prev => [...prev, { studentId: lastEdit.studentId, assessmentId: lastEdit.assessmentId, nextVal: currentVal }]);
    setUndoStack(prev => prev.slice(0, -1));

    if (lastEdit.prevVal === undefined) {
      clearScoreInActive(activeQuarterId, lastEdit.studentId, lastEdit.assessmentId);
    } else {
      updateScoreInActive(activeQuarterId, lastEdit.studentId, lastEdit.assessmentId, lastEdit.prevVal);
    }
  };

  // Redo score edits
  const handleRedo = () => {
    if (redoStack.length === 0 || !activeProject) return;
    const lastRedo = redoStack[redoStack.length - 1];
    const currentVal = (activeQuarterData?.scores || {})[lastRedo.studentId]?.[lastRedo.assessmentId];

    setUndoStack(prev => [...prev, { studentId: lastRedo.studentId, assessmentId: lastRedo.assessmentId, prevVal: currentVal }]);
    setRedoStack(prev => prev.slice(0, -1));

    if (lastRedo.nextVal === undefined) {
      clearScoreInActive(activeQuarterId, lastRedo.studentId, lastRedo.assessmentId);
    } else {
      updateScoreInActive(activeQuarterId, lastRedo.studentId, lastRedo.assessmentId, lastRedo.nextVal);
    }
  };

  // Student manual add
  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (newStudentLrn.length !== 12 || isNaN(Number(newStudentLrn))) {
      showCustomAlert("LRN must be a unique 12-digit number.", "Validation Error", "error");
      return;
    }
    if (!newStudentName.trim()) {
      showCustomAlert("Name cannot be empty.", "Validation Error", "error");
      return;
    }
    addStudentToActive({
      lrn: newStudentLrn,
      name: newStudentName.trim().toUpperCase(),
      sex: newStudentSex,
      studentNumber: newStudentNumber || undefined,
      status: 'Active'
    });
    setNewStudentLrn('');
    setNewStudentName('');
    setNewStudentNumber('');
  };

  // CSV paste batch import helper (quote and tab aware)
  const parseCsvOrTsvLine = (line: string): string[] => {
    const trimmed = line.trim();
    if (!trimmed) return [];

    // If tab-separated (e.g. copied directly from Excel or Google Sheets)
    if (trimmed.includes('\t')) {
      return trimmed.split('\t').map(cell => cell.trim().replace(/^["']|["']$/g, ''));
    }

    // CSV line parser with quote handling
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim().replace(/^["']|["']$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim().replace(/^["']|["']$/g, ''));

    return result;
  };

  const handleCsvImport = () => {
    if (!csvInput.trim()) return;
    const lines = csvInput.trim().split(/\r?\n/);
    const parsedStudents: Omit<Student, 'id'>[] = [];
    const seenLrns = new Set<string>();
    let rejectedRows = 0;

    const normalizeLrn = (raw: string) => {
      const digits = raw.replace(/\D/g, '');
      if (digits.length === 12) return digits;
      // Excel often strips a leading zero from a 12-digit LRN stored as a number.
      if (digits.length === 11) return `0${digits}`;
      return '';
    };

    lines.forEach((rawLine) => {
      const line = rawLine.trim();
      if (!line) return;

      const upperLine = line.toUpperCase();
      // Skip headers and summary lines
      if (
        upperLine.includes('LEARNER NAME') ||
        upperLine.includes('STUDENT NAME') ||
        (upperLine.includes('LRN') && upperLine.includes('SEX')) ||
        upperLine.startsWith('MALE') ||
        upperLine.startsWith('FEMALE') ||
        upperLine.startsWith('TOTAL') ||
        upperLine.startsWith('LIST OF LEARNERS')
      ) {
        return;
      }

      // Try splitting by tab, comma, or pipe
      let parts = parseCsvOrTsvLine(line);
      if (parts.length === 0) return;

      // If single column but has double spaces, tabs or separators
      if (parts.length === 1 && line.includes(' ')) {
        const tokens = line.split(/\t+|\s{2,}|,/);
        if (tokens.length > 1) {
          parts = tokens.map(t => t.trim()).filter(Boolean);
        }
      }

      const lrnIdx = parts.findIndex(p => /^\d{11,13}$/.test(p.replace(/[\s-]/g, '')));
      const lrn = lrnIdx !== -1 ? normalizeLrn(parts[lrnIdx]) : '';

      // Check for Sex token ('M', 'F', 'Male', 'Female', 'MALE', 'FEMALE')
      const sexIdx = parts.findIndex((p, idx) =>
        idx !== lrnIdx && /^(m|f|male|female|m\.?|f\.?)$/i.test(p.trim())
      );
      const sex: 'Male' | 'Female' = sexIdx !== -1 && parts[sexIdx].trim().toLowerCase().startsWith('f')
        ? 'Female'
        : 'Male';

      // Remaining tokens are candidates for Name and Student Number
      const remaining = parts.filter((_, idx) => idx !== lrnIdx && idx !== sexIdx);
      // Drop a leading sequence number like "1", "2", "01" or "#1"
      if (remaining.length > 1 && /^#?\d{1,3}$/.test(remaining[0].trim())) {
        remaining.shift();
      }

      // A standalone long number is a student number, not part of the name.
      let studNum: string | undefined = undefined;
      const studentNoIdx = remaining.findIndex(t =>
        /^\d[\d\-\/]*$/.test(t.trim()) && t.replace(/\D/g, '').length >= 4
      );
      if (studentNoIdx !== -1 && remaining.length > 1) {
        studNum = remaining[studentNoIdx].trim();
        remaining.splice(studentNoIdx, 1);
      }

      // Rejoin split name cells (e.g. Last Name | First Name) while keeping quoted commas intact.
      const name = remaining
        .map(t => t.trim())
        .filter(Boolean)
        .join(', ')
        .replace(/\s*,\s*/g, ', ')
        .replace(/^["']|["']$/g, '')
        .replace(/^,\s*/, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toUpperCase();

      const hasRealName = /[A-Za-z]{2}/.test(name) && !/^(MALE|FEMALE|SEX|LRN|NAME|TOTAL|REMARKS|M|F)$/i.test(name);

      // An official learner record needs a valid LRN and a real name.
      if (!lrn || !hasRealName || seenLrns.has(lrn)) {
        rejectedRows++;
        return;
      }

      seenLrns.add(lrn);
      parsedStudents.push({
        lrn,
        name,
        sex,
        studentNumber: studNum,
        status: 'Active'
      });
    });

    if (parsedStudents.length === 0) {
      showCustomAlert(
        "No valid learners were found. Each row needs a 12-digit LRN and a learner name (e.g. 117563820451,\"Dela Cruz, John Reyes\",M).",
        "Import Error",
        "error"
      );
      return;
    }

    const { added, skipped } = importRosterToActive(parsedStudents, false);
    const skippedRows = rejectedRows + skipped;

    setCsvInput('');
    setCsvPasteMode(false);

    if (added === 0) {
      showCustomAlert(
        `No new learners were added. ${skippedRows} row(s) were skipped because they were duplicates or lacked a valid 12-digit LRN. The existing roster was kept.`,
        "Nothing Imported",
        "info"
      );
      return;
    }

    showCustomAlert(
      `Added ${added} learner(s) to the roster.${skippedRows > 0 ? ` Skipped ${skippedRows} duplicate or invalid row(s).` : ''} Existing learners and grades were kept.`,
      "Import Successful",
      "success"
    );
  };

  // Create new assessment
  const handleAddAssessment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assName.trim()) return;
    addAssessmentToActive(activeQuarterId, {
      name: assName.trim(),
      category: assCategory,
      perfectScore: assPerfectScore,
      date: assDate || undefined,
      description: assDescription || undefined
    });
    setAssName('');
    setAssDescription('');
  };

  // CSV report generation download with all raw assessment scores
  const handleExportCSVReport = async () => {
    if (!activeProject) return;
    const activeStudents = activeProject.students.filter(s => s.status === 'Active' || !s.status);
    const qData = activeProject.quarters?.[activeQuarterId];

    const wwList = qData?.assessments.filter(a => a.category === 'WOW') || [];
    const ptList = qData?.assessments.filter(a => a.category === 'PPT') || [];
    const qeList = qData?.assessments.filter(a => a.category === 'QSTE') || [];

    // Header Row 1: Column Names
    const headerCols: string[] = ['Student Name', 'LRN', 'Sex'];
    wwList.forEach((a, i) => headerCols.push(`"WW ${i + 1} (${a.perfectScore})"`));
    if (wwList.length > 0) {
      headerCols.push('WW Total', 'WW Pct', 'WW Weighted');
    }

    ptList.forEach((a, i) => headerCols.push(`"PT ${i + 1} (${a.perfectScore})"`));
    if (ptList.length > 0) {
      headerCols.push('PT Total', 'PT Pct', 'PT Weighted');
    }

    qeList.forEach((a, i) => headerCols.push(`"Exam ${i + 1} (${a.perfectScore})"`));
    if (qeList.length > 0) {
      headerCols.push('Exam Total', 'Exam Pct', 'Exam Weighted');
    }

    headerCols.push('Initial Grade', 'Quarterly Grade', 'Remarks');

    // UTF-8 BOM so Excel opens accented names correctly (no data: URI prefix).
    let csvContent = '\uFEFF';
    csvContent += headerCols.join(',') + '\n';

    activeStudents.forEach(s => {
      const g = computeProjectStudentGrade(activeProject, s.id, globalSettings.subjects, activeQuarterId);
      const scores = qData?.scores?.[s.id] || {};
      const reassess = qData?.reassessmentScores?.[s.id] || {};
      const rowCols: (string | number)[] = [`"${s.name}"`, s.lrn, s.sex || ''];

      // WW raw scores
      wwList.forEach(a => {
        const sc = scores[a.id];
        const rsc = reassess[a.id];
        const val = rsc !== undefined ? rsc : sc;
        rowCols.push(val !== undefined ? val : '');
      });
      if (wwList.length > 0) {
        rowCols.push(g.wowRawSum, `"${g.wowPercentage}%"`, g.weightedWOW);
      }

      // PT raw scores
      ptList.forEach(a => {
        const sc = scores[a.id];
        const rsc = reassess[a.id];
        const val = rsc !== undefined ? rsc : sc;
        rowCols.push(val !== undefined ? val : '');
      });
      if (ptList.length > 0) {
        rowCols.push(g.pptRawSum, `"${g.pptPercentage}%"`, g.weightedPPT);
      }

      // Exam raw scores
      qeList.forEach(a => {
        const sc = scores[a.id];
        const rsc = reassess[a.id];
        const val = rsc !== undefined ? rsc : sc;
        rowCols.push(val !== undefined ? val : '');
      });
      if (qeList.length > 0) {
        rowCols.push(g.qsteRawSum, `"${g.qstePercentage}%"`, g.weightedQSTE);
      }

      rowCols.push(g.initialGrade, g.finalGrade, g.remarks);
      csvContent += rowCols.join(',') + '\n';
    });

    const filename = `ClassRecord_${activeProject.subject}_${activeProject.gradeLevel}_${activeProject.section}_${activeQuarterId.replace(/\s+/g, '')}.csv`
      .replace(/[\\/:*?"<>|]+/g, '_')
      .replace(/\s+/g, '_');
    await exportFile({
      filename,
      content: csvContent,
      mimeType: 'text/csv;charset=utf-8;',
      title: 'Save Class Record CSV',
    });
  };

  // Print trigger: Android WebView has no window.print(), so export the same PDF instead.
  const handlePrint = () => {
    if (isAndroid() && activeProject) {
      const filename = `Academic_Report_${activeProject.gradeLevel}_${activeProject.section}_${activeProject.subject}.pdf`
        .replace(/\s+/g, '_');
      exportClassRecordPDF(activeProject, filename)
        .catch(err => console.error('PDF export error:', err));
      return;
    }
    window.print();
  };

  // Empty state view when no project loaded
  if (!activeProject) {
    return (
      <div className="ui-panel min-w-0 p-8 max-w-2xl mx-auto text-center space-y-6 my-12">
        <div className="p-4 bg-slate-50 dark:bg-slate-950/20 text-slate-600 dark:text-slate-400 rounded-full w-16 h-16 flex items-center justify-center mx-auto">
          <FolderSync className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h2 className="ui-heading text-balance">Gradebook Workspace Locked</h2>
          <p className="text-pretty text-sm text-slate-500 dark:text-slate-400 font-semibold max-w-md mx-auto leading-relaxed">
            There is currently no active grading project loaded. Navigate to the Project Hub to spin up a new class portal, or choose an existing project to initialize the spreadsheet canvas.
          </p>
        </div>

        {/* List existing projects right here for fast launch */}
        {projects.length > 0 && (
          <div className="border-t border-slate-100 dark:border-slate-900 pt-6 space-y-3.5 max-w-md mx-auto text-left">
            <span className="text-sm tabular-nums font-semibold text-slate-600 dark:text-slate-500 block text-center">
              Quick Select Workspace Project
            </span>
            <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
              {projects.map(p => (
                <button
                  key={p.id}
                  onClick={() => openProject(p.id)}
                  className="ui-button w-full"
                >
                  <span className="truncate text-slate-800 dark:text-slate-300">
                    {p.subject} • {p.gradeLevel} ({p.section})
                  </span>
                  <span className="text-sm tabular-nums text-slate-600 dark:text-slate-400 flex items-center gap-1">
                    Open <CornerDownRight className="h-3 w-3" />
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Active roster and assessments sorting
  const activeStudents = activeProject.students
    .filter(s => s.status !== 'Dropped' && s.status !== 'Transferred')
    .filter(s => {
      if (!studentSearch.trim()) return true;
      const q = studentSearch.toLowerCase();
      return s.name.toLowerCase().includes(q) || s.lrn.includes(q);
    });

  if (studentSort === 'name-asc') {
    activeStudents.sort((a, b) => a.name.localeCompare(b.name));
  } else if (studentSort === 'name-desc') {
    activeStudents.sort((a, b) => b.name.localeCompare(a.name));
  } else if (studentSort === 'lrn') {
    activeStudents.sort((a, b) => a.lrn.localeCompare(b.lrn));
  } else if (studentSort === 'sex') {
    activeStudents.sort((a, b) => a.sex.localeCompare(b.sex));
  }

  const sortedAssessments = [...(activeQuarterData?.assessments || [])].sort((a, b) => a.order - b.order);
  const wwAssessments = sortedAssessments.filter(a => a.category === 'WOW');
  const ptAssessments = sortedAssessments.filter(a => a.category === 'PPT');
  const qeAssessments = sortedAssessments.filter(a => a.category === 'QSTE');

  return (
    <div className="ui-page pb-12">

      {/* Mini Workspace Header bar */}
      <div className="ui-panel min-w-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm tabular-nums font-semibold text-slate-600 dark:text-slate-400">
              {activeProject.gradeLevel} • {activeQuarterId} • S.Y. {activeProject.schoolYear}
            </span>

            {/* Teacher Info / School Info Quick Edit */}
            <button
              onClick={() => {
                setEditTeacherName(activeProject.teacherName || '');
                setEditSchoolName(activeProject.schoolName || '');
                setEditSubjectName(activeProject.subject || '');
                setEditSectionName(activeProject.section || '');
                setEditGradeLevel(activeProject.gradeLevel || '');
                setEditPassingGrade(activeProject.passingGrade || 75);
                setEditDepedPolicy(activeProject.depedPolicy || '2015');

                const curWeights = getSubjectWeights(
                  activeProject.subject,
                  globalSettings.subjects,
                  activeProject.workspace,
                  activeProject.assessmentProfileId,
                  activeProject.customWeights
                );
                setEditWeightWW(Math.round(curWeights.wow * 100));
                setEditWeightPT(Math.round(curWeights.ppt * 100));
                setEditWeightQE(Math.round(curWeights.qste * 100));

                const quartersList = Object.keys(activeProject.quarters || {});
                if (quartersList.length > 0) {
                  setMigrateSourceQuarter(quartersList.includes('4th Quarter') ? '4th Quarter' : quartersList[quartersList.length - 1]);
                  setMigrateTargetQuarter(quartersList[0]);
                }
                setShowMigrateConfirm(false);

                setShowTeacherInfoModal(true);
              }}
              className="ui-button"
              title="Click to edit Teacher, Subject, Section, and School details"
            >
              <Edit3 className="h-3 w-3" />
              <span>Teacher: {activeProject.teacherName || 'Not Set'}</span>
            </button>

            {/* Completed/In-Progress Badge Trigger */}
            <button
              onClick={() => {
                const nextCompleted = !activeProject.isCompleted;
                saveProject({
                  ...activeProject,
                  isCompleted: nextCompleted
                });
              }}
              className={`text-sm px-2.5 py-0.5 rounded-full font-semibold cursor-pointer border flex items-center gap-1.5 ${activeProject.isCompleted
                ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-500 hover:bg-emerald-100/50"
                : "bg-slate-50 dark:bg-slate-950/20 border-slate-200 dark:border-slate-900/15 text-slate-700 dark:text-slate-500 hover:bg-slate-100/50"
                }`}
              title="Click to toggle project completion status"
            >
              <span className={`h-1.5 w-1.5 rounded-full ${activeProject.isCompleted ? 'bg-emerald-500' : "bg-slate-500 "}`} />
              {activeProject.isCompleted ? 'Quarter Completed' : 'Quarter In Progress'}
            </button>
          </div>

          <h2 className="ui-heading text-balance leading-tight">
            {activeProject.subject} • Class Grid ({activeProject.section})
          </h2>
        </div>

        {/* Quarter / Term Switcher */}
        {projectPeriods.length > 1 && (
          <div className="flex flex-wrap gap-1 bg-slate-50 dark:bg-slate-950/20 p-1 rounded-xl border border-slate-300 dark:border-slate-900/30 text-sm w-full sm:w-auto">
            {projectPeriods.map(period => (
              <button
                key={period}
                onClick={() => updateActiveProjectQuarter(period)}
                className={`px-3 py-1.5 rounded-lg font-medium cursor-pointer ${activeQuarterId === period
                  ? "bg-slate-600 text-white "
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900/30"
                  }`}
                title={`Switch to ${period}`}
              >
                {period}
              </button>
            ))}
          </div>
        )}

        {/* Tab Selection & Navigation */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setActiveRoute('dashboard')}
            className="ui-button"
            title="Return to Grading Hub Overview"
          >
            <ChevronLeft className="h-4 w-4 text-emerald-500" />
            <span>Grading Hub</span>
          </button>

          <div className="flex flex-wrap gap-1 bg-slate-50 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-900 text-sm">
            <button
              onClick={() => setActiveTab('gradebook')}
              className={`px-3 py-1.5 rounded-lg font-medium cursor-pointer ${activeTab === 'gradebook'
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white "
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
            >
              Gradebook
            </button>
            <button
              onClick={() => setActiveTab('assessments')}
              className={`px-3 py-1.5 rounded-lg font-medium cursor-pointer ${activeTab === 'assessments'
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white "
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
            >
              Assessments ({(activeQuarterData?.assessments || []).length})
            </button>
            <button
              onClick={() => setActiveTab('roster')}
              className={`px-3 py-1.5 rounded-lg font-medium cursor-pointer ${activeTab === 'roster'
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white "
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
            >
              Roster ({activeProject.students.length})
            </button>
            <button
              onClick={() => {
                setActiveTab('reports');
                // Auto-select first student for individual card if none selected
                if (!reportStudentId && activeProject.students.length > 0) {
                  setReportStudentId(activeProject.students[0].id);
                }
              }}
              className={`px-3 py-1.5 rounded-lg font-medium cursor-pointer ${activeTab === 'reports'
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white "
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
            >
              Reports & Print
            </button>
          </div>
        </div>
      </div>

      {/* --------------------------------------------------------
          TAB 1: GRADEBOOK SPREADSHEET (Phase 5 & Phase 6)
          -------------------------------------------------------- */}
      {activeTab === 'gradebook' && (
        <div className="space-y-4">
          {activeProject.isCompleted && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-300 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-400 text-sm rounded-xl flex items-center justify-between gap-3 font-medium">
              <div className="flex items-center gap-2.5">
                <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0" />
                <span>This quarter grading project is marked as Completed. Grade values and rosters are officially finalized.</span>
              </div>
              <button
                onClick={() => {
                  saveProject({
                    ...activeProject,
                    isCompleted: false
                  });
                }}
                className="ui-button"
              >
                Reopen for Editing
              </button>
            </div>
          )}

          {/* Class context and grading controls */}
          <div className="ui-panel space-y-3 p-4">
            <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
              {activeProject.workspace === 'SHS' && (
                <div className="min-w-0">
                  <label htmlFor="shs-assessment-profile" className="ui-label mb-1.5">Assessment profile</label>
                  <div className="flex items-center gap-2">
                    <select
                      id="shs-assessment-profile"
                      value={activeProject.assessmentProfileId || 'old-core'}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'custom') {
                          saveProject({
                            ...activeProject,
                            assessmentProfileId: 'custom',
                            customWeights: activeProject.customWeights || { wow: shsCustomWW / 100, ppt: shsCustomPT / 100, qste: shsCustomQA / 100 }
                          });
                          setShsCustomModalOpen(true);
                        } else {
                          saveProject({
                            ...activeProject,
                            assessmentProfileId: val
                          });
                        }
                      }}
                      className="ui-field min-w-0 flex-1"
                    >
                      <optgroup label="—— DepEd Order No. 8, s. 2015 (Old Curriculum) ——">
                        {SHS_OLD_PROFILES.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </optgroup>
                      <optgroup label="—— MATATAG Profiles ——">
                        {SHS_PROFILES.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </optgroup>
                      <optgroup label="—— Custom ——">
                        <option value="custom">Custom (Manual Weights %)</option>
                      </optgroup>
                    </select>

                    {activeProject.assessmentProfileId === 'custom' && (
                      <button
                        type="button"
                        onClick={() => setShsCustomModalOpen(true)}
                        className="ui-button shrink-0 whitespace-nowrap"
                        title="Edit custom weight percentages"
                      >
                        Edit %
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="min-w-0">
                <label htmlFor="deped-policy" className="ui-label mb-1.5">Grading policy</label>
                <select
                  id="deped-policy"
                  value={activeProject.depedPolicy}
                  onChange={(e) => {
                    const newPolicy = e.target.value as '2015' | '2027';
                    saveProject({
                      ...activeProject,
                      depedPolicy: newPolicy
                    });
                  }}
                  className="ui-field"
                >
                  <option value="2015">0-Based (0=0, 70=70, 100=100)</option>
                  <option value="2027">MATATAG Adjusted Transmutation (SY 2027-2028)</option>
                </select>
              </div>

              {/* Dynamic student filtering directly on spreadsheet canvas */}
              <div className="relative min-w-0 sm:col-span-2 lg:col-span-1">
                <label htmlFor="learner-filter" className="ui-label mb-1.5">Filter learners</label>
                <Search className="pointer-events-none absolute bottom-2.5 left-2.5 size-4 text-slate-400" aria-hidden="true" />
                <input
                  id="learner-filter"
                  type="text"
                  placeholder="Name or LRN..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="ui-field pl-8 pr-3"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
              <p className="min-w-0 text-sm">
                <span className="mr-2 text-xs font-medium text-slate-500 dark:text-slate-400">Weights</span>
                <span
                  className="font-medium text-slate-700 dark:text-slate-200"
                  title={getSubjectWeightsLabel(activeProject.subject, globalSettings.subjects, activeProject.workspace, activeProject.assessmentProfileId, activeProject.customWeights)}
                >
                  {getSubjectWeightsLabel(activeProject.subject, globalSettings.subjects, activeProject.workspace, activeProject.assessmentProfileId, activeProject.customWeights)}
                </span>
              </p>
              <p className="text-sm">
                <span className="mr-2 text-xs font-medium text-slate-500 dark:text-slate-400">Passing grade</span>
                <span className="font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">{activeProject.passingGrade}</span>
              </p>
            </div>

            {/* Quick add assessment, edit history, modes, and data tools */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-200 pt-3 dark:border-slate-800">
              <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                <button
                  onClick={() => openAddAssessmentModal('WOW')}
                  className="ui-button whitespace-nowrap"
                  title="Add Written Work column"
                >
                  <Plus className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                  <span>Written work</span>
                </button>

                <button
                  onClick={() => openAddAssessmentModal('PPT')}
                  className="ui-button whitespace-nowrap"
                  title="Add Performance Task column"
                >
                  <Plus className="size-4" aria-hidden="true" />
                  <span>Performance task</span>
                </button>

                <button
                  onClick={() => openAddAssessmentModal('QSTE')}
                  className="ui-button whitespace-nowrap"
                  title="Add Quarterly Exam column"
                >
                  <Plus className="size-4 text-emerald-700 dark:text-emerald-300" aria-hidden="true" />
                  <span>Quarterly exam</span>
                </button>
              </div>

              <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                <button
                  disabled={undoStack.length === 0}
                  onClick={handleUndo}
                  className="ui-button whitespace-nowrap"
                  title="Undo score edit"
                >
                  <RotateCcw className="size-4" aria-hidden="true" />
                  <span>Undo ({undoStack.length})</span>
                </button>
                <button
                  disabled={redoStack.length === 0}
                  onClick={handleRedo}
                  className="ui-button whitespace-nowrap"
                  title="Redo score edit"
                >
                  <RotateCw className="size-4" aria-hidden="true" />
                  <span>Redo ({redoStack.length})</span>
                </button>
              </div>

              {/* ── Mastery-Based Reassessment Toggle ── */}
              <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                <button
                  onClick={() => {
                    const next = !reassessmentMode;
                    if (next && activeProject) {
                      // Single atomic write: enable settings + all assessments in one save
                      const existingSettings = activeProject.reassessmentSettings;
                      enableReassessmentModeForQuarter(activeQuarterId, {
                        enabled: true,
                        masteryThreshold: existingSettings?.masteryThreshold ?? 75,
                        interventionThreshold: existingSettings?.interventionThreshold ?? 50,
                        policy: existingSettings?.policy ?? 'Average'
                      });
                    }
                    setReassessmentMode(next);
                  }}
                  aria-pressed={reassessmentMode}
                  className={`inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg border px-3 py-2 text-sm font-medium ${reassessmentMode
                    ? 'border-amber-600 bg-amber-600 text-white hover:bg-amber-700'
                    : (activeProject.reassessmentSettings?.enabled
                      ? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-900/50'
                      : 'border-slate-300 bg-white text-slate-600 shadow-xs hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800')
                    }`}
                  title={reassessmentMode ? 'Exit component reassessment mode' : 'Enter component reassessment mode'}
                >
                  <Sparkles className="size-4" aria-hidden="true" />
                  {reassessmentMode ? 'Exit reassessment' : 'Reassessment mode'}
                </button>
                <button
                  onClick={() => setShowReassessmentSettingsModal(true)}
                  aria-label="Configure reassessment settings"
                  className="ui-button px-2.5"
                  title="Configure reassessment settings"
                >
                  <Settings className="size-4" aria-hidden="true" />
                </button>

                {/* ── Grade Adjustment Feature (Teacher-Only) ── */}
                <button
                  onClick={() => toggleGradeAdjustmentMode(activeQuarterId, !isAdjustmentModeOn)}
                  aria-pressed={isAdjustmentModeOn}
                  className={`inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg border px-3 py-2 text-sm font-medium ${isAdjustmentModeOn
                    ? 'border-slate-700 bg-slate-700 text-white hover:bg-slate-600 dark:border-slate-600 dark:bg-slate-600 dark:hover:bg-slate-500'
                    : 'border-slate-300 bg-white text-slate-600 shadow-xs hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                  title={isAdjustmentModeOn ? 'Turn grade adjustment off' : 'Turn grade adjustment on'}
                >
                  <Sliders className="size-4" aria-hidden="true" />
                  <span>Grade adjustment {isAdjustmentModeOn ? 'on' : 'off'}</span>
                </button>
                {isAdjustmentModeOn && (
                  <button
                    onClick={() => setShowAdjustmentLogModal(true)}
                    className="ui-button whitespace-nowrap"
                    title="View grade adjustment audit log"
                  >
                    Log ({Object.keys(activeQuarterData?.adjustments || {}).length})
                  </button>
                )}
              </div>

              {/* Import, backup, and export tools */}
              <div className="flex min-w-0 flex-wrap items-center gap-1.5 lg:ml-auto">
                <button
                  onClick={() => setShowExcelImportModal(true)}
                  className="ui-button whitespace-nowrap"
                  title="Import scores and records from an Excel file"
                >
                  <FileUp className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                  <span>Import Excel record</span>
                </button>
                <button
                  onClick={() => setIsRestoreModalOpen(true)}
                  className="ui-button whitespace-nowrap"
                  title="Restore this gradebook from a JSON backup"
                >
                  <ShieldCheck className="size-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                  <span>Restore backup</span>
                </button>
                <button
                  onClick={() => setIsExcelExportOpen(true)}
                  className="ui-button whitespace-nowrap"
                  title="Export this class record for the adviser portal"
                >
                  <FileDown className="size-4" aria-hidden="true" />
                  <span>Export for adviser</span>
                </button>
                <button
                  onClick={handleExportCSVReport}
                  className="ui-button whitespace-nowrap"
                  title="Export the class record as CSV"
                >
                  <FileSpreadsheet className="size-4" aria-hidden="true" />
                  <span>Export class record</span>
                </button>
              </div>
            </div>
          </div>

          {/* Reassessment Mode Active Banner */}
          {reassessmentMode && (
            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-400 text-sm rounded-xl flex items-center justify-between gap-3 font-medium">
              <div className="flex items-center gap-2.5">
                <Sparkles className="h-4 w-4 text-amber-500 shrink-0" />
                <div>
                  <span className="font-semibold">Component Reassessment Mode Active.</span>
                  {' '}Cells display original scores (top) and effective scores (bottom). Click any cell to enter a reassessment score for eligible learners.
                  {activeProject.reassessmentSettings && (
                    <span className="ml-2 text-amber-600 dark:text-amber-500">
                      Policy: <strong>{activeProject.reassessmentSettings.policy}</strong> · Mastery: <strong>{activeProject.reassessmentSettings.masteryThreshold}%</strong>
                    </span>
                  )}
                </div>
              </div>
              <button onClick={() => setReassessmentMode(false)} className="ui-button">
                Exit Mode
              </button>
            </div>
          )}

          {activeProject.students.length === 0 ? (
            <div className="ui-panel min-w-0 py-16 text-center space-y-4">
              <p className="text-pretty text-sm text-slate-600 font-medium">Roster empty. Please import or create student accounts first.</p>
              <button
                onClick={() => setActiveTab('roster')}
                className="ui-button-primary"
              >
                Open Learner Roster
              </button>
            </div>
          ) : (activeQuarterData?.assessments || []).length === 0 ? (
            <div className="ui-panel min-w-0 py-16 text-center space-y-4">
              <p className="text-pretty text-sm text-slate-600 font-medium">No assessment columns yet. Click below to quickly create Written Works, Performance Tasks, or Quarterly Exams.</p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => openAddAssessmentModal('WOW')}
                  className="ui-button-primary"
                >
                  <Plus className="h-4 w-4" /> Add Written Work (+WW)
                </button>
                <button
                  onClick={() => openAddAssessmentModal('PPT')}
                  className="ui-button"
                >
                  <Plus className="h-4 w-4" /> Add Performance Task (+PT)
                </button>
                <button
                  onClick={() => openAddAssessmentModal('QSTE')}
                  className="ui-button"
                >
                  <Plus className="h-4 w-4" /> Add Quarterly Exam (+QE)
                </button>
              </div>
            </div>
          ) : (
            /* Spreadsheet Table */
            <div className="ui-panel min-w-0 overflow-hidden">
              <div className="min-w-0 max-w-full overflow-x-auto">
                <table ref={gradebookTableRef} className="gradebook-grid tabular-nums w-full text-left border-collapse border-spacing-0 select-none">
                  <thead>
                    {/* Header Row 1: Main Category Spans with Correct Mathematical Colspans */}
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-sans text-slate-500 dark:text-slate-500 font-semibold text-center">
                      <th rowSpan={2} className="py-3 px-4 text-left w-48 min-w-[220px] font-medium border-r border-slate-200 dark:border-slate-800 sticky left-0 bg-slate-50 dark:bg-slate-950 z-20">Student Name</th>
                      <th rowSpan={2} className="py-3 px-1.5 text-center w-12 font-medium border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">Sex</th>
                      {wwAssessments.length > 0 && (
                        <th className="py-2.5 px-2 text-center bg-slate-50/30 dark:bg-slate-950/15 text-slate-800 dark:text-slate-400 font-semibold border-r border-slate-200 dark:border-slate-800" colSpan={wwAssessments.length + 3}>
                          <div className="flex items-center justify-center gap-2">
                            <span>Written Works </span>
                            <button
                              onClick={() => openAddAssessmentModal('WOW')}
                              className="ui-button"
                              title="Add new Written Work column"
                            >
                              + Add WW
                            </button>
                          </div>
                        </th>
                      )}
                      {ptAssessments.length > 0 && (
                        <th className="py-2.5 px-2 text-center bg-slate-50/35 dark:bg-slate-950/15 text-slate-800 dark:text-slate-400 font-semibold border-r border-slate-200 dark:border-slate-800" colSpan={ptAssessments.length + 3}>
                          <div className="flex items-center justify-center gap-2">
                            <span>Performance Tasks </span>
                            <button
                              onClick={() => openAddAssessmentModal('PPT')}
                              className="ui-button"
                              title="Add new Performance Task column"
                            >
                              + Add PT
                            </button>
                          </div>
                        </th>
                      )}
                      {qeAssessments.length > 0 && (
                        <th className="py-2.5 px-2 text-center bg-emerald-50/35 dark:bg-emerald-950/15 text-emerald-800 dark:text-emerald-400 font-semibold border-r border-slate-200 dark:border-slate-800" colSpan={qeAssessments.length + 2}>
                          <div className="flex items-center justify-center gap-2">
                            <span>Quarterly Exam</span>
                            <button
                              onClick={() => openAddAssessmentModal('QSTE')}
                              className="ui-button"
                              title="Add new Quarterly Exam column"
                            >
                              + Add QE
                            </button>
                          </div>
                        </th>
                      )}
                      <th className="py-3 px-4 text-center bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-400 font-semibold w-44" colSpan={3}>Remarks Summary</th>
                    </tr>

                    {/* Header Row 2: Assessment Names & Total Headers */}
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-sans text-slate-500 dark:text-slate-500 font-semibold text-center">

                      {/* WW Columns */}
                      {wwAssessments.map(a => (
                        <th
                          key={a.id}
                          data-focus-col={a.id}
                          onClick={() => handleOpenEditAssessment(a)}
                          className={`py-2.5 px-2 text-center w-18 min-w-[72px] group relative cursor-pointer hover:bg-slate-50/60 dark:hover:bg-slate-950/30 transition-colors border-b-2 border-transparent hover:border-slate-400${selectedCell?.assessmentId === a.id ? ' focus-col-active' : ''}`}
                          title={`Click to edit ${a.name} (HPS: ${a.perfectScore})`}
                        >
                          <div className="flex items-center justify-center gap-0.5">
                            <span className="truncate max-w-[56px] font-semibold text-slate-700 dark:text-slate-400">{a.name}</span>
                            <Edit3 className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 text-slate-500 transition-opacity shrink-0" />
                          </div>
                          <div className="text-xs text-slate-600 dark:text-slate-500 font-semibold mt-0.5 group-hover:text-slate-600 dark:group-hover:text-slate-400">
                            Max: <span className="tabular-nums font-medium underline decoration-dotted">{a.perfectScore}</span>
                          </div>
                        </th>
                      ))}
                      {wwAssessments.length > 0 && (
                        <>
                          <th className="py-3 px-1.5 text-center w-12 bg-slate-50/45 dark:bg-slate-950/10 text-slate-700 dark:text-slate-400 font-medium">Total</th>
                          <th className="py-3 px-1.5 text-center w-12 bg-slate-50/45 dark:bg-slate-950/10 text-slate-700 dark:text-slate-400 font-medium">P.S.</th>
                          <th className="py-3 px-1.5 text-center w-12 bg-slate-100/30 dark:bg-slate-950/20 text-slate-700 dark:text-slate-500 font-semibold border-r border-slate-200 dark:border-slate-800">W.S.</th>
                        </>
                      )}

                      {/* PT Columns */}
                      {ptAssessments.map(a => (
                        <th
                          key={a.id}
                          data-focus-col={a.id}
                          onClick={() => handleOpenEditAssessment(a)}
                          className={`py-2.5 px-2 text-center w-18 min-w-[72px] group relative cursor-pointer hover:bg-slate-50/60 dark:hover:bg-slate-950/30 transition-colors border-b-2 border-transparent hover:border-slate-400${selectedCell?.assessmentId === a.id ? ' focus-col-active' : ''}`}
                          title={`Click to edit ${a.name} (HPS: ${a.perfectScore})`}
                        >
                          <div className="flex items-center justify-center gap-0.5">
                            <span className="truncate max-w-[56px] font-semibold text-slate-700 dark:text-slate-400">{a.name}</span>
                            <Edit3 className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 text-slate-500 transition-opacity shrink-0" />
                          </div>
                          <div className="text-xs text-slate-600 dark:text-slate-500 font-semibold mt-0.5 group-hover:text-slate-600 dark:group-hover:text-slate-400">
                            Max: <span className="tabular-nums font-medium underline decoration-dotted">{a.perfectScore}</span>
                          </div>
                        </th>
                      ))}
                      {ptAssessments.length > 0 && (
                        <>
                          <th className="py-3 px-1.5 text-center w-12 bg-slate-50/45 dark:bg-slate-950/10 text-slate-700 dark:text-slate-400 font-medium">Total</th>
                          <th className="py-3 px-1.5 text-center w-12 bg-slate-50/45 dark:bg-slate-950/10 text-slate-700 dark:text-slate-400 font-medium">P.S.</th>
                          <th className="py-3 px-1.5 text-center w-12 bg-slate-100/30 dark:bg-slate-950/20 text-slate-700 dark:text-slate-300 font-semibold border-r border-slate-200 dark:border-slate-800">W.S.</th>
                        </>
                      )}

                      {/* QE Columns */}
                      {qeAssessments.map(a => (
                        <th
                          key={a.id}
                          data-focus-col={a.id}
                          onClick={() => handleOpenEditAssessment(a)}
                          className={`py-2.5 px-2 text-center w-18 min-w-[72px] group relative cursor-pointer hover:bg-emerald-50/60 dark:hover:bg-emerald-950/30 transition-colors border-b-2 border-transparent hover:border-emerald-400${selectedCell?.assessmentId === a.id ? ' focus-col-active' : ''}`}
                          title={`Click to edit ${a.name} (HPS: ${a.perfectScore})`}
                        >
                          <div className="flex items-center justify-center gap-0.5">
                            <span className="truncate max-w-[56px] font-semibold text-slate-700 dark:text-slate-400">{a.name}</span>
                            <Edit3 className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 text-emerald-500 transition-opacity shrink-0" />
                          </div>
                          <div className="text-xs text-slate-600 dark:text-slate-500 font-semibold mt-0.5 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                            Max: <span className="tabular-nums font-medium underline decoration-dotted">{a.perfectScore}</span>
                          </div>
                        </th>
                      ))}
                      {qeAssessments.length > 0 && (
                        <>
                          <th className="py-3 px-1.5 text-center w-12 bg-emerald-50/45 dark:bg-emerald-950/10 text-emerald-700 dark:text-emerald-400 font-medium">P.S.</th>
                          <th className="py-3 px-1.5 text-center w-12 bg-emerald-100/30 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-500 font-semibold border-r border-slate-200 dark:border-slate-800">W.S.</th>
                        </>
                      )}

                      {/* Final Totals Columns */}
                      <th className="py-3 px-2 text-center bg-slate-100/50 dark:bg-slate-950/40 text-slate-500 dark:text-slate-500 w-16 font-medium">Initial</th>
                      <th className="py-3 px-2 text-center bg-slate-100/50 dark:bg-slate-950/40 text-slate-700 dark:text-slate-400 w-16 font-semibold">Final</th>
                      <th className="py-3 px-4 text-center bg-slate-100/50 dark:bg-slate-950/40 text-slate-900 dark:text-slate-200 w-24 font-medium">Remarks</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200 dark:divide-slate-900/60">
                    {activeStudents.map((st, sIdx) => {
                      const computed = computeProjectStudentGrade(activeProject, st.id, globalSettings.subjects, activeQuarterId);
                      const scores = (activeQuarterData?.scores || {})[st.id] || {};
                      const isInactive = st.status === 'Transferred' || st.status === 'Dropped';
                      const isBeingAdjusted = Boolean(isAdjustmentModeOn && editingAdjustmentStudent?.id === st.id);
                      const hasAdjustment = Boolean(computed.adjustmentEntry);

                      return (
                        <React.Fragment key={st.id}>
                          <tr
                            data-focus-row={st.id}
                            className={`group text-xs font-medium ${selectedCell?.studentId === st.id ? 'focus-row-active ' : ''}${
                              isBeingAdjusted
                                ? "bg-slate-100/70 dark:bg-slate-950/70 border-l-4 border-l-slate-600 dark:border-l-slate-400 ring-2 ring-slate-500/70 dark:ring-slate-400/80 "
                                : isInactive
                                  ? 'bg-rose-50/50 dark:bg-rose-950/20 hover:bg-rose-100/60 dark:hover:bg-rose-950/40 text-rose-900 dark:text-rose-200'
                                  : isAdjustmentModeOn
                                    ? hasAdjustment
                                      ? "bg-slate-50/30 dark:bg-slate-950/20 hover:bg-slate-50/60 dark:hover:bg-slate-950/40 border-l-2 border-l-slate-400 text-slate-800 dark:text-slate-200"
                                      : "hover:bg-slate-50/50 dark:hover:bg-slate-900/10 text-slate-700 dark:text-slate-300 border-l-2 border-l-transparent hover:border-l-slate-300/60"
                                    : "hover:bg-slate-50/50 dark:hover:bg-slate-900/10 text-slate-700 dark:text-slate-300"
                            }`}
                          >
                          {/* Frozen student details with distinct right shadow/border */}
                          <td data-focus-sticky className={`py-3 px-4 font-medium sticky left-0 z-10 border-r min-w-[220px] ${
                            isBeingAdjusted
                              ? "bg-slate-50 dark:bg-slate-900 border-l-4 border-l-slate-600 dark:border-l-slate-400 ring-2 ring-slate-500/70 border-r-slate-300 dark:border-r-slate-800"
                              : isInactive
                                ? 'bg-rose-50 dark:bg-rose-950 group-hover:bg-rose-100 dark:group-hover:bg-rose-900 border-rose-200 dark:border-rose-900/50'
                                : hasAdjustment && isAdjustmentModeOn
                                  ? "bg-white dark:bg-slate-900 border-l-2 border-l-slate-400 group-hover:bg-slate-50/40 dark:group-hover:bg-slate-900 border-slate-200 dark:border-slate-800"
                                  : "bg-white dark:bg-slate-900 group-hover:bg-slate-100 dark:group-hover:bg-slate-800 group-even:bg-slate-50 dark:group-even:bg-slate-900 border-slate-200 dark:border-slate-800"
                          }`}>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={` ${isBeingAdjusted ? "font-semibold text-slate-950 dark:text-slate-200" : isInactive ? "font-semibold text-rose-800 dark:text-rose-300" : "font-semibold text-slate-900 dark:text-slate-100"}`}>
                                {st.name}
                              </span>
                              {isBeingAdjusted && (
                                <span className="px-1.5 py-0.5 rounded text-xs font-semibold bg-slate-600 text-white flex items-center gap-1">
                                  <Sparkles className="h-2.5 w-2.5" /> Adjusting
                                </span>
                              )}
                              {hasAdjustment && isAdjustmentModeOn && !isBeingAdjusted && (
                                <span className="px-1.5 py-0.5 rounded text-xs tabular-nums font-semibold bg-slate-100 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 flex items-center gap-1" title={`Grade adjusted from ${computed.rawFinalGrade} to ${computed.finalGrade}`}>
                                  <Sliders className="h-2.5 w-2.5" /> Adj: {computed.rawFinalGrade} → {computed.finalGrade}
                                </span>
                              )}
                              {isInactive && (
                                <span className="px-1.5 py-0.5 rounded text-xs font-semibold bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-100 border border-rose-300 dark:border-rose-800">
                                  {st.status}
                                </span>
                              )}
                            </div>
                            <div className={`text-xs font-sans font-medium mt-0.5 ${isBeingAdjusted ? "text-slate-600 dark:text-slate-400 font-medium" : isInactive ? 'text-rose-500/80 dark:text-rose-400/80' : "text-slate-600 dark:text-slate-500"}`}>
                              LRN: {st.lrn}
                            </div>
                          </td>
                          <td className={`py-3 px-2.5 text-center border-r shrink-0 ${isInactive ? 'border-rose-200 dark:border-rose-900/50' : "border-slate-200 dark:border-slate-800"}`}>
                            {st.sex === 'Female' ? (
                              <span className="inline-block px-1.5 py-0.5 text-xs font-sans font-semibold rounded-md bg-slate-50 text-slate-600 dark:bg-slate-950/20 dark:text-slate-400 border border-slate-300 dark:border-slate-900/10">F</span>
                            ) : (
                              <span className="inline-block px-1.5 py-0.5 text-xs font-sans font-semibold rounded-md bg-slate-50 text-slate-600 dark:bg-slate-950/20 dark:text-slate-400 border border-slate-300 dark:border-slate-900/10">M</span>
                            )}
                          </td>

                          {/* WW Score Cells */}
                          {wwAssessments.map((ass, aIdx) => {
                            const score = scores[ass.id];
                            const reassessmentScore = (activeQuarterData?.reassessmentScores || {})[st.id]?.[ass.id];
                            const effectiveScore = getEffectiveScore(score, reassessmentScore, ass.perfectScore, activeProject.reassessmentSettings, ass.reassessmentEnabled);
                            const status = getLearnerReassessmentStatus(score, reassessmentScore, ass.perfectScore, activeProject.reassessmentSettings, ass.reassessmentEnabled);
                            const displayScore = reassessmentMode ? reassessmentScore : score;
                            const isMissing = reassessmentMode ? score === undefined : score === undefined;
                            const isCellSelected = selectedCell?.studentId === st.id && selectedCell?.assessmentId === ass.id;
                            const isEditing = editingScore?.studentId === st.id && editingScore?.assessmentId === ass.id;
                            const isEligible = reassessmentMode && ass.reassessmentEnabled && status === 'Eligible';
                            const isReassessed = reassessmentMode && status === 'Reassessed';
                            const isMastered = reassessmentMode && status === 'Mastered';

                            return (
                              <td
                                key={ass.id}
                                data-focus-col={ass.id}
                                onClick={() => {
                                  setSelectedCell({ studentId: st.id, assessmentId: ass.id });
                                  if (!isEditing) {
                                    const initVal = reassessmentMode ? reassessmentScore : score;
                                    setEditingScore({ studentId: st.id, assessmentId: ass.id, tempValue: initVal !== undefined ? initVal.toString() : '' });
                                  }
                                }}
                                onKeyDown={(e) => handleTableKeyDown(e, st.id, ass.id, sIdx, sortedAssessments.findIndex(x => x.id === ass.id))}
                                tabIndex={0}
                                className={`p-1.5 text-center tabular-nums outline-hidden cursor-pointer relative${selectedCell?.assessmentId === ass.id ? ' focus-col-active' : ''}${isCellSelected ? ' focus-cell-active' : ''}`}
                                title={reassessmentMode ? `Original: ${score ?? '—'} | Reassessment: ${reassessmentScore ?? '—'} | Effective: ${effectiveScore ?? '—'}` : 'Click to edit score'}
                              >
                                <div className={`w-14 mx-auto py-1 px-1 rounded-lg border-2 text-center flex flex-col items-center justify-center min-h-[32px] tabular-nums text-xs font-medium ${isEditing
                                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/80 ring-2 ring-emerald-500/30 text-emerald-950 dark:text-emerald-100'
                                  : isCellSelected
                                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-950 dark:text-emerald-100 ring-2 ring-emerald-500/30'
                                    : isReassessed
                                      ? "border-slate-400 bg-slate-50 dark:bg-slate-950/30 text-slate-800 dark:text-slate-200"
                                      : isEligible
                                        ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 hover:border-amber-500'
                                        : isMastered
                                          ? 'border-emerald-300 bg-emerald-50/60 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400'
                                          : score === undefined
                                            ? "border-slate-300 dark:border-slate-700 bg-emerald-50/20 dark:bg-emerald-950/10 text-slate-600 dark:text-slate-500 hover:border-emerald-500 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/30"
                                            : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 hover:border-emerald-500 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20'
                                  }`}>
                                  {isEditing ? (
                                    <input aria-label={`${st.name} — ${ass.name}${reassessmentMode ? " reassessment" : " score"}`}
                                      ref={inputRef}
                                      type="number"
                                      min={0}
                                      max={ass.perfectScore}
                                      value={editingScore.tempValue}
                                      onBlur={handleCellBlur}
                                      onClick={(e) => e.stopPropagation()}
                                      onChange={(e) => setEditingScore(prev => prev ? { ...prev, tempValue: e.target.value } : null)}
                                      placeholder={`0-${ass.perfectScore}`}
                                      className="w-full text-center bg-transparent text-emerald-950 dark:text-emerald-100 tabular-nums text-xs font-semibold focus:outline-hidden"
                                    />
                                  ) : reassessmentMode ? (
                                    <div className="flex flex-col items-center gap-0">
                                      <span className="text-xs text-slate-600 leading-none">{score ?? '—'}</span>
                                      <span className={`font-semibold leading-tight text-xs ${isReassessed ? "text-slate-700 dark:text-slate-300" : isEligible ? 'text-amber-700 dark:text-amber-300' : "text-slate-600"
                                        }`}>{effectiveScore ?? '—'}</span>
                                    </div>
                                  ) : (
                                    score !== undefined ? (
                                      <span className="font-semibold">{score}</span>
                                    ) : (
                                      <span className="text-slate-600 dark:text-slate-500 font-medium text-xs">—</span>
                                    )
                                  )}
                                </div>
                              </td>
                            );
                          })}
                          {wwAssessments.length > 0 && (
                            <>
                              <td className="py-3 px-1.5 text-center tabular-nums bg-slate-50/10 dark:bg-slate-950/5 text-slate-500 dark:text-slate-500 font-medium">
                                {computed.wowRawSum}
                              </td>
                              <td className="py-3 px-1.5 text-center tabular-nums bg-slate-50/10 dark:bg-slate-950/5 text-slate-600 dark:text-slate-400 font-medium">
                                {computed.wowPercentage}%
                              </td>
                              <td className="py-3 px-1.5 text-center tabular-nums bg-slate-50/20 dark:bg-slate-950/10 text-slate-600 dark:text-slate-400 font-semibold border-r border-slate-200 dark:border-slate-800">
                                {computed.weightedWOW}
                              </td>
                            </>
                          )}

                          {/* PT Score Cells */}
                          {ptAssessments.map((ass, aIdx) => {
                            const score = scores[ass.id];
                            const reassessmentScore = (activeQuarterData?.reassessmentScores || {})[st.id]?.[ass.id];
                            const effectiveScore = getEffectiveScore(score, reassessmentScore, ass.perfectScore, activeProject.reassessmentSettings, ass.reassessmentEnabled);
                            const status = getLearnerReassessmentStatus(score, reassessmentScore, ass.perfectScore, activeProject.reassessmentSettings, ass.reassessmentEnabled);
                            const isCellSelected = selectedCell?.studentId === st.id && selectedCell?.assessmentId === ass.id;
                            const isEditing = editingScore?.studentId === st.id && editingScore?.assessmentId === ass.id;
                            const isEligible = reassessmentMode && ass.reassessmentEnabled && status === 'Eligible';
                            const isReassessed = reassessmentMode && status === 'Reassessed';
                            const isMastered = reassessmentMode && status === 'Mastered';

                            return (
                              <td
                                key={ass.id}
                                data-focus-col={ass.id}
                                onClick={() => {
                                  setSelectedCell({ studentId: st.id, assessmentId: ass.id });
                                  if (!isEditing) {
                                    const initVal = reassessmentMode ? reassessmentScore : score;
                                    setEditingScore({ studentId: st.id, assessmentId: ass.id, tempValue: initVal !== undefined ? initVal.toString() : '' });
                                  }
                                }}
                                onKeyDown={(e) => handleTableKeyDown(e, st.id, ass.id, sIdx, sortedAssessments.findIndex(x => x.id === ass.id))}
                                tabIndex={0}
                                className={`p-1.5 text-center tabular-nums outline-hidden cursor-pointer relative${selectedCell?.assessmentId === ass.id ? ' focus-col-active' : ''}${isCellSelected ? ' focus-cell-active' : ''}`}
                                title={reassessmentMode ? `Original: ${score ?? '—'} | Reassessment: ${reassessmentScore ?? '—'} | Effective: ${effectiveScore ?? '—'}` : 'Click to edit score'}
                              >
                                <div className={`w-14 mx-auto py-1 px-1 rounded-lg border-2 text-center flex flex-col items-center justify-center min-h-[32px] tabular-nums text-xs font-medium ${isEditing
                                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/80 ring-2 ring-emerald-500/30 text-emerald-950 dark:text-emerald-100'
                                  : isCellSelected
                                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-950 dark:text-emerald-100 ring-2 ring-emerald-500/30'
                                    : isReassessed
                                      ? "border-slate-400 bg-slate-50 dark:bg-slate-950/30 text-slate-800 dark:text-slate-200"
                                      : isEligible
                                        ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 hover:border-amber-500'
                                        : isMastered
                                          ? 'border-emerald-300 bg-emerald-50/60 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400'
                                          : score === undefined
                                            ? "border-slate-300 dark:border-slate-700 bg-emerald-50/20 dark:bg-emerald-950/10 text-slate-600 dark:text-slate-500 hover:border-emerald-500 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/30"
                                            : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 hover:border-emerald-500 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20'
                                  }`}>
                                  {isEditing ? (
                                    <input aria-label={`${st.name} — ${ass.name}${reassessmentMode ? " reassessment" : " score"}`}
                                      ref={inputRef}
                                      type="number"
                                      min={0}
                                      max={ass.perfectScore}
                                      value={editingScore.tempValue}
                                      onBlur={handleCellBlur}
                                      onClick={(e) => e.stopPropagation()}
                                      onChange={(e) => setEditingScore(prev => prev ? { ...prev, tempValue: e.target.value } : null)}
                                      placeholder={`0-${ass.perfectScore}`}
                                      className="w-full text-center bg-transparent text-emerald-950 dark:text-emerald-100 tabular-nums text-xs font-semibold focus:outline-hidden"
                                    />
                                  ) : reassessmentMode ? (
                                    <div className="flex flex-col items-center gap-0">
                                      <span className="text-xs text-slate-600 leading-none">{score ?? '—'}</span>
                                      <span className={`font-semibold leading-tight text-xs ${isReassessed ? "text-slate-700 dark:text-slate-300" : isEligible ? 'text-amber-700 dark:text-amber-300' : "text-slate-600"
                                        }`}>{effectiveScore ?? '—'}</span>
                                    </div>
                                  ) : (
                                    score !== undefined ? (
                                      <span className="font-semibold">{score}</span>
                                    ) : (
                                      <span className="text-slate-600 dark:text-slate-500 font-medium text-xs">—</span>
                                    )
                                  )}
                                </div>
                              </td>
                            );
                          })}
                          {ptAssessments.length > 0 && (
                            <>
                              <td className="py-3 px-1.5 text-center tabular-nums bg-slate-50/10 dark:bg-slate-950/5 text-slate-500 dark:text-slate-500 font-medium">
                                {computed.pptRawSum}
                              </td>
                              <td className="py-3 px-1.5 text-center tabular-nums bg-slate-50/10 dark:bg-slate-950/5 text-slate-600 dark:text-slate-400 font-medium">
                                {computed.pptPercentage}%
                              </td>
                              <td className="py-3 px-1.5 text-center tabular-nums bg-slate-50/20 dark:bg-slate-950/10 text-slate-600 dark:text-slate-400 font-semibold border-r border-slate-200 dark:border-slate-800">
                                {computed.weightedPPT}
                              </td>
                            </>
                          )}

                          {/* QE Score Cells */}
                          {qeAssessments.map((ass, aIdx) => {
                            const score = scores[ass.id];
                            const reassessmentScore = (activeQuarterData?.reassessmentScores || {})[st.id]?.[ass.id];
                            const effectiveScore = getEffectiveScore(score, reassessmentScore, ass.perfectScore, activeProject.reassessmentSettings, ass.reassessmentEnabled);
                            const status = getLearnerReassessmentStatus(score, reassessmentScore, ass.perfectScore, activeProject.reassessmentSettings, ass.reassessmentEnabled);
                            const isCellSelected = selectedCell?.studentId === st.id && selectedCell?.assessmentId === ass.id;
                            const isEditing = editingScore?.studentId === st.id && editingScore?.assessmentId === ass.id;
                            const isEligible = reassessmentMode && ass.reassessmentEnabled && status === 'Eligible';
                            const isReassessed = reassessmentMode && status === 'Reassessed';
                            const isMastered = reassessmentMode && status === 'Mastered';

                            return (
                              <td
                                key={ass.id}
                                data-focus-col={ass.id}
                                onClick={() => {
                                  setSelectedCell({ studentId: st.id, assessmentId: ass.id });
                                  if (!isEditing) {
                                    const initVal = reassessmentMode ? reassessmentScore : score;
                                    setEditingScore({ studentId: st.id, assessmentId: ass.id, tempValue: initVal !== undefined ? initVal.toString() : '' });
                                  }
                                }}
                                onKeyDown={(e) => handleTableKeyDown(e, st.id, ass.id, sIdx, sortedAssessments.findIndex(x => x.id === ass.id))}
                                tabIndex={0}
                                className={`p-1.5 text-center tabular-nums outline-hidden cursor-pointer relative${selectedCell?.assessmentId === ass.id ? ' focus-col-active' : ''}${isCellSelected ? ' focus-cell-active' : ''}`}
                                title={reassessmentMode ? `Original: ${score ?? '—'} | Reassessment: ${reassessmentScore ?? '—'} | Effective: ${effectiveScore ?? '—'}` : 'Click to edit score'}
                              >
                                <div className={`w-14 mx-auto py-1 px-1 rounded-lg border-2 text-center flex flex-col items-center justify-center min-h-[32px] tabular-nums text-xs font-medium ${isEditing
                                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/80 ring-2 ring-emerald-500/30 text-emerald-950 dark:text-emerald-100'
                                  : isCellSelected
                                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-950 dark:text-emerald-100 ring-2 ring-emerald-500/30'
                                    : isReassessed
                                      ? "border-slate-400 bg-slate-50 dark:bg-slate-950/30 text-slate-800 dark:text-slate-200"
                                      : isEligible
                                        ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 hover:border-amber-500'
                                        : isMastered
                                          ? 'border-emerald-300 bg-emerald-50/60 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400'
                                          : score === undefined
                                            ? "border-slate-300 dark:border-slate-700 bg-emerald-50/20 dark:bg-emerald-950/10 text-slate-600 dark:text-slate-500 hover:border-emerald-500 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/30"
                                            : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 hover:border-emerald-500 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20'
                                  }`}>
                                  {isEditing ? (
                                    <input aria-label={`${st.name} — ${ass.name}${reassessmentMode ? " reassessment" : " score"}`}
                                      ref={inputRef}
                                      type="number"
                                      min={0}
                                      max={ass.perfectScore}
                                      value={editingScore.tempValue}
                                      onBlur={handleCellBlur}
                                      onClick={(e) => e.stopPropagation()}
                                      onChange={(e) => setEditingScore(prev => prev ? { ...prev, tempValue: e.target.value } : null)}
                                      placeholder={`0-${ass.perfectScore}`}
                                      className="w-full text-center bg-transparent text-emerald-950 dark:text-emerald-100 tabular-nums text-xs font-semibold focus:outline-hidden"
                                    />
                                  ) : reassessmentMode ? (
                                    <div className="flex flex-col items-center gap-0">
                                      <span className="text-xs text-slate-600 leading-none">{score ?? '—'}</span>
                                      <span className={`font-semibold leading-tight text-xs ${isReassessed ? "text-slate-700 dark:text-slate-300" : isEligible ? 'text-amber-700 dark:text-amber-300' : "text-slate-600"
                                        }`}>{effectiveScore ?? '—'}</span>
                                    </div>
                                  ) : (
                                    score !== undefined ? (
                                      <span className="font-semibold">{score}</span>
                                    ) : (
                                      <span className="text-slate-600 dark:text-slate-500 font-medium text-xs">—</span>
                                    )
                                  )}
                                </div>
                              </td>
                            );
                          })}
                          {qeAssessments.length > 0 && (
                            <>
                              <td className="py-3 px-1.5 text-center tabular-nums bg-emerald-50/10 dark:bg-emerald-950/5 text-slate-600 dark:text-slate-400 font-medium">
                                {computed.qstePercentage}%
                              </td>
                              <td className="py-3 px-1.5 text-center tabular-nums bg-emerald-50/20 dark:bg-emerald-950/10 text-emerald-600 dark:text-emerald-500 font-semibold border-r border-slate-200 dark:border-slate-800">
                                {computed.weightedQSTE}
                              </td>
                            </>
                          )}

                          {/* Calculated card grades */}
                          <td className="py-3 px-2 text-center tabular-nums bg-slate-50/35 dark:bg-slate-950/10 text-slate-500 dark:text-slate-500 font-medium">
                            {computed.initialGrade}%
                          </td>
                          <td className="py-3 px-2 text-center tabular-nums bg-slate-50/10 dark:bg-slate-950/5 text-slate-700 dark:text-slate-400 font-semibold text-xs">
                            <span className="inline-block font-semibold text-xs text-slate-800 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/30 px-2 py-0.5 rounded-lg border border-slate-300 dark:border-slate-900/10 min-w-[32px] text-center">
                              {computed.finalGrade}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            {computed.isPassing ? (
                              <span className="inline-flex items-center gap-1 text-xs font-sans font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/10">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                PASSED
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-sans font-semibold px-2 py-1 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-100 dark:border-rose-900/10">
                                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                                INTERVENTION
                              </span>
                            )}
                          </td>
                        </tr>
                        {isAdjustmentModeOn && (
                          <tr
                            key={`adj-${st.id}`}
                            data-focus-row={st.id}
                            className={`border-b text-xs tabular-nums ${selectedCell?.studentId === st.id ? 'focus-row-active ' : ''}${
                              isBeingAdjusted
                                ? "bg-slate-100/90 dark:bg-slate-950/80 border-l-4 border-l-slate-600 dark:border-l-slate-400 border-slate-300 dark:border-slate-700 ring-2 ring-slate-500/70 "
                                : hasAdjustment
                                  ? "bg-slate-50 dark:bg-slate-950/50 border-l-2 border-l-slate-400 dark:border-l-slate-600 border-slate-200 dark:border-slate-800/60"
                                  : "bg-slate-50/40 dark:bg-slate-950/30 border-l-2 border-l-slate-300/40 dark:border-l-slate-700/30 border-slate-100 dark:border-slate-900/40"
                            }`}
                          >
                            <td
                              data-focus-sticky
                              className={`py-2 px-3.5 font-medium sticky left-0 z-10 border-r min-w-[220px] ${
                                isBeingAdjusted
                                  ? "bg-slate-100 dark:bg-slate-950 border-l-4 border-l-slate-600 dark:border-l-slate-400 border-slate-300 dark:border-slate-700 ring-2 ring-slate-500/60 "
                                  : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 border-l-2 border-l-slate-300/60 dark:border-l-slate-700/60"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1.5">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <CornerDownRight className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400 shrink-0" />
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1">
                                      <span className="text-xs font-semibold text-slate-950 dark:text-slate-200 truncate" title={`Adjustment for ${st.name}`}>
                                        {st.name.split(',')[0]}
                                      </span>
                                      <span className="text-xs tabular-nums font-medium text-slate-600 dark:text-slate-400 shrink-0">
                                        (Adj)
                                      </span>
                                    </div>
                                    <div className="text-xs tabular-nums text-slate-600/80 dark:text-slate-400/80 truncate">
                                      {hasAdjustment
                                        ? `Raw: ${computed.rawFinalGrade ?? computed.finalGrade} → Final: ${computed.finalGrade}`
                                        : `Raw: ${computed.rawFinalGrade ?? computed.finalGrade}`}
                                    </div>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const raw = computed.rawFinalGrade ?? computed.finalGrade;
                                    setEditingAdjustmentStudent({
                                      id: st.id,
                                      name: st.name,
                                      computedGrade: raw,
                                      currentAdjusted: computed.adjustmentEntry ? computed.adjustmentEntry.adjustedGrade : raw,
                                      currentReason: computed.adjustmentEntry?.reason || 'Performance merit and remediation'
                                    });
                                    setTargetAdjustedGrade(computed.adjustmentEntry ? computed.adjustmentEntry.adjustedGrade : raw);
                                    setAdjustmentReason(computed.adjustmentEntry?.reason || 'Performance merit and remediation');
                                  }}
                                  className={`px-2 py-1 rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1 shrink-0 ${
                                    isBeingAdjusted
                                      ? "bg-slate-600 text-white ring-2 ring-slate-300 "
                                      : hasAdjustment
                                        ? "bg-slate-600 hover:bg-slate-700 text-white "
                                        : "bg-slate-200/80 hover:bg-slate-600 hover:text-white dark:bg-slate-900/60 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200"
                                  }`}
                                  title={`Adjust quarterly grade for ${st.name}`}
                                >
                                  {isBeingAdjusted ? (
                                    <>
                                      <Sparkles className="h-2.5 w-2.5" /> Adjusting
                                    </>
                                  ) : hasAdjustment ? (
                                    <>
                                      <Edit3 className="h-2.5 w-2.5" /> Edit Adj
                                    </>
                                  ) : (
                                    <>
                                      <Plus className="h-2.5 w-2.5" /> + Adjust
                                    </>
                                  )}
                                </button>
                              </div>
                            </td>
                            <td className="py-2.5 px-2.5 text-center border-r border-slate-200 dark:border-slate-800 text-slate-500 font-semibold text-xs">
                              <span className="inline-block px-1 py-0.5 rounded bg-slate-200/50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300">
                                Δ
                              </span>
                            </td>

                            {/* WW Adjustment distribution */}
                            {wwAssessments.length > 0 && (
                              <td
                                colSpan={wwAssessments.length + 3}
                                className="py-2.5 px-3 text-center border-r border-slate-200 dark:border-slate-800 bg-slate-100/40 dark:bg-slate-950/20"
                              >
                                <div className="flex items-center justify-center gap-1 text-xs font-semibold text-slate-800 dark:text-slate-300">
                                  <span>WW Adj:</span>
                                  <span className="px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-900/60 tabular-nums">
                                    {computed.adjustmentEntry
                                      ? ((computed.adjustmentEntry.wwAdjustment ?? 0) >= 0
                                          ? `+${(computed.adjustmentEntry.wwAdjustment ?? 0).toFixed(2)}`
                                          : `${(computed.adjustmentEntry.wwAdjustment ?? 0).toFixed(2)}`)
                                      : '+0.00'} pts
                                  </span>
                                </div>
                              </td>
                            )}

                            {/* PT Adjustment distribution */}
                            {ptAssessments.length > 0 && (
                              <td
                                colSpan={ptAssessments.length + 3}
                                className="py-2.5 px-3 text-center border-r border-slate-200 dark:border-slate-800 bg-slate-100/40 dark:bg-slate-950/20"
                              >
                                <div className="flex items-center justify-center gap-1 text-xs font-semibold text-slate-800 dark:text-slate-300">
                                  <span>PT Adj:</span>
                                  <span className="px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-900/60 tabular-nums">
                                    {computed.adjustmentEntry
                                      ? ((computed.adjustmentEntry.ptAdjustment ?? 0) >= 0
                                          ? `+${(computed.adjustmentEntry.ptAdjustment ?? 0).toFixed(2)}`
                                          : `${(computed.adjustmentEntry.ptAdjustment ?? 0).toFixed(2)}`)
                                      : '+0.00'} pts
                                  </span>
                                </div>
                              </td>
                            )}

                            {/* QE Adjustment distribution */}
                            {qeAssessments.length > 0 && (
                              <td
                                colSpan={qeAssessments.length + 2}
                                className="py-2.5 px-3 text-center border-r border-slate-200 dark:border-slate-800 bg-slate-100/40 dark:bg-slate-950/20"
                              >
                                <div className="flex items-center justify-center gap-1 text-xs font-semibold text-slate-800 dark:text-slate-300">
                                  <span>QE Adj:</span>
                                  <span className="px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-900/60 tabular-nums">
                                    {computed.adjustmentEntry
                                      ? ((computed.adjustmentEntry.qeAdjustment ?? 0) >= 0
                                          ? `+${(computed.adjustmentEntry.qeAdjustment ?? 0).toFixed(2)}`
                                          : `${(computed.adjustmentEntry.qeAdjustment ?? 0).toFixed(2)}`)
                                      : '+0.00'} pts
                                  </span>
                                </div>
                              </td>
                            )}

                            {/* Initial (Raw) Grade */}
                            <td className="py-2.5 px-2 text-center text-xs text-slate-600 dark:text-slate-400 font-medium">
                              {computed.rawFinalGrade ?? computed.finalGrade} (Raw)
                            </td>

                            {/* Adjusted Quarterly Grade */}
                            <td className="py-2.5 px-2 text-center">
                              <span className="inline-block px-2 py-0.5 bg-slate-700 text-white font-semibold rounded-lg text-xs">
                                {computed.finalGrade}
                              </span>
                            </td>

                            {/* Action / Status */}
                            <td className="py-2.5 px-3 text-center">
                              {computed.adjustmentEntry ? (
                                <button
                                  onClick={() => removeGradeAdjustmentForStudent(activeQuarterId, st.id)}
                                  className="ui-button"
                                  title="Remove grade adjustment"
                                >
                                  Reset Orig ({computed.rawFinalGrade})
                                </button>
                              ) : (
                                <span className="text-xs text-slate-600 dark:text-slate-500 font-medium">—</span>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                  </tbody>
                </table>
              </div>

              {/* Instructions footer */}
              <div className="p-4 bg-slate-50/70 dark:bg-slate-950/40 text-sm text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-900/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-2.5 font-medium">
                  <HelpCircle className="h-4 w-4 text-slate-500 shrink-0" />
                  <span>Click any score cell or press <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-900 rounded-sm font-sans text-sm font-medium">Enter</kbd> to edit scores in real-time. Blank cells indicate missing scores.</span>
                </div>

                {/* Keyboard Shortcuts Legend */}
                <div className="flex flex-wrap items-center gap-3 text-sm font-sans font-medium text-slate-500 dark:text-slate-500 self-start md:self-auto shrink-0">
                  <span className="text-sm text-slate-500 dark:text-slate-500">Shortcuts:</span>
                  <div className="flex items-center gap-1 bg-slate-100/50 dark:bg-slate-900/40 px-2 py-1 rounded-md border border-slate-200/20">
                    <kbd className="px-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded">↑</kbd>
                    <kbd className="px-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded">↓</kbd>
                    <kbd className="px-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded">←</kbd>
                    <kbd className="px-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded">→</kbd>
                    <span>Move</span>
                  </div>
                  <div className="flex items-center gap-1 bg-slate-100/50 dark:bg-slate-900/40 px-2 py-1 rounded-md border border-slate-200/20">
                    <kbd className="px-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded">Tab</kbd>
                    <span>Next</span>
                  </div>
                  <div className="flex items-center gap-1 bg-slate-100/50 dark:bg-slate-900/40 px-2 py-1 rounded-md border border-slate-200/20">
                    <kbd className="px-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded">Esc</kbd>
                    <span>Cancel</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --------------------------------------------------------
          TAB 2: ASSESSMENT BUILDER (Phase 4)
          -------------------------------------------------------- */}
      {activeTab === 'assessments' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Assessment List */}
          <div className="ui-panel min-w-0 lg:col-span-2 p-6 md:p-8 space-y-4">
            <h3 className="ui-section-title text-balance">
              Active Assessment List ({(activeQuarterData?.assessments || []).length})
            </h3>

            {(activeQuarterData?.assessments || []).length === 0 ? (
              <div className="text-center py-12 text-slate-600 text-sm font-semibold">
                No custom assessments defined. Use the creation board on the right to install grading categories.
              </div>
            ) : (
              <div className="space-y-3.5 max-h-[500px] overflow-y-auto pr-1">
                {sortedAssessments.map((ass, index) => (
                  <div key={ass.id}>
                    <div
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-950/10 hover:border-slate-200 dark:hover:border-slate-700 flex justify-between items-center"
                    >
                      <div className="space-y-1 max-w-[70%]">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm tabular-nums font-semibold px-1.5 py-0.5 rounded-sm ${ass.category === 'WOW' ? "bg-slate-50 text-slate-600 dark:bg-slate-950/20" : ass.category === 'PPT' ? "bg-slate-50 text-slate-600 dark:bg-slate-950/20" : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20'
                            }`}>
                            {ass.category === 'WOW' ? 'Written Works' : ass.category === 'PPT' ? 'Performance Tasks' : 'Quarterly Exam'}
                          </span>
                          {ass.date && (
                            <span className="text-sm tabular-nums text-slate-600">
                              {new Date(ass.date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <h4 className="ui-section-title text-balance">{ass.name}</h4>
                        {ass.description && (
                          <p className="text-pretty text-sm text-slate-600 leading-normal truncate">{ass.description}</p>
                        )}
                        <div className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                          Perfect Score: {ass.perfectScore} raw points
                        </div>
                      </div>

                      {/* Reordering & Deleting triggers */}
                      <div className="flex flex-col items-end gap-1.5">
                        <div className="flex items-center gap-1">
                          <button aria-label="Move Up"
                            disabled={index === 0}
                            onClick={() => {
                              const cpy = [...sortedAssessments];
                              const temp = cpy[index];
                              cpy[index] = cpy[index - 1];
                              cpy[index - 1] = temp;
                              reorderAssessmentsInActive(activeQuarterId, cpy);
                            }}
                            className="ui-icon-button"
                            title="Move Up"
                          >
                            <ChevronUp className="h-4 w-4" />
                          </button>
                          <button aria-label="Move Down"
                            disabled={index === sortedAssessments.length - 1}
                            onClick={() => {
                              const cpy = [...sortedAssessments];
                              const temp = cpy[index];
                              cpy[index] = cpy[index + 1];
                              cpy[index + 1] = temp;
                              reorderAssessmentsInActive(activeQuarterId, cpy);
                            }}
                            className="ui-icon-button"
                            title="Move Down"
                          >
                            <ChevronDown className="h-4 w-4" />
                          </button>
                          <button aria-label="Edit Assessment & HPS"
                            onClick={() => handleOpenEditAssessment(ass)}
                            className="ui-icon-button"
                            title="Edit Assessment & HPS"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button aria-label="Delete Assessment"
                            onClick={() => {
                              showCustomConfirm(
                                `Are you sure you want to permanently delete the assessment [${ass.name}]? All student score cells registered under this category will be purged. This action cannot be undone.`,
                                () => deleteAssessmentFromActive(activeQuarterId, ass.id),
                                "Delete Assessment"
                              );
                            }}
                            className="ui-icon-button"
                            title="Delete Assessment"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        {/* Per-Assessment Reassessment Toggle */}
                        {activeProject.reassessmentSettings?.enabled && (
                          <button
                            onClick={() => toggleReassessmentForAssessment(activeQuarterId, ass.id, !ass.reassessmentEnabled)}
                            className={`px-2 py-1 rounded-lg text-sm font-semibold flex items-center gap-1 cursor-pointer border ${ass.reassessmentEnabled
                              ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/40'
                              : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                              }`}
                            title={ass.reassessmentEnabled ? 'Disable reassessment for this assessment' : 'Enable reassessment for this assessment'}
                          >
                            <Sparkles className="h-3 w-3" />
                            {ass.reassessmentEnabled ? 'Reassess: On' : 'Reassess: Off'}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Per-Assessment Class Mastery Analysis */}
                    {activeProject.reassessmentSettings?.enabled && ass.reassessmentEnabled && (() => {
                      const activeStudents2 = activeProject.students.filter(s => s.status !== 'Dropped' && s.status !== 'Transferred');
                      const threshold = activeProject.reassessmentSettings!.masteryThreshold;
                      const interventionPct = activeProject.reassessmentSettings!.interventionThreshold;
                      const scores2 = activeQuarterData?.scores || {};
                      const withScores = activeStudents2.filter(s => scores2[s.id]?.[ass.id] !== undefined);
                      if (withScores.length === 0) return null;
                      const masteredCount = withScores.filter(s => ((scores2[s.id][ass.id] / ass.perfectScore) * 100) >= threshold).length;
                      const masteryPct = Math.round((masteredCount / withScores.length) * 100);
                      const eligibleCount = withScores.length - masteredCount;
                      const needsReteach = (100 - masteryPct) >= interventionPct;
                      return (
                        <div className={`mt-1.5 px-3 py-2 rounded-lg border text-sm font-semibold flex items-center gap-3 ${needsReteach
                          ? 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/20 dark:border-rose-900/30 dark:text-rose-400'
                          : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
                          }`}>
                          <Sparkles className={`h-3 w-3 shrink-0 ${needsReteach ? 'text-rose-500' : 'text-amber-500'}`} />
                          <span>
                            Class Mastery: <strong>{masteryPct}%</strong> ({masteredCount}/{withScores.length} mastered) ·{' '}
                            <strong>{eligibleCount}</strong> eligible for reassessment
                            {needsReteach && <span className="ml-1 font-semibold text-rose-700 dark:text-rose-400"> ⚠ Reteaching Recommended</span>}
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Create Assessment Form */}
          <div className="ui-panel min-w-0 p-6 md:p-8 space-y-4 h-fit">
            <h3 className="ui-section-title text-balance flex items-center gap-2">
              <Plus className="h-5 w-5 text-slate-600" />
              Build Assessment
            </h3>

            <form onSubmit={handleAddAssessment} className="space-y-4">
              <div>
                <label className="ui-label tabular-nums text-slate-600 dark:text-slate-500">Assessment Name</label>
                <input aria-label="Assessment name"
                  type="text"
                  required
                  placeholder="e.g. WW3: Lab report rubric"
                  value={assName}
                  onChange={(e) => setAssName(e.target.value)}
                  className="ui-field mt-1.5"
                />
              </div>

              <div>
                <label className="ui-label tabular-nums text-slate-600 dark:text-slate-500">Grading Category</label>
                <select aria-label="Grading category"
                  value={assCategory}
                  onChange={(e) => setAssCategory(e.target.value as any)}
                  className="ui-field mt-1.5"
                >
                  <option value="WW">Written Works (WW)</option>
                  <option value="PT">Performance Tasks (PT)</option>
                  <option value="QE">Quarterly Examination (QE)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="ui-label tabular-nums text-slate-600 dark:text-slate-500">Perfect Score</label>
                  <input aria-label="Highest possible score"
                    type="number"
                    required
                    min={1}
                    max={1000}
                    value={assPerfectScore}
                    onChange={(e) => setAssPerfectScore(parseInt(e.target.value) || 20)}
                    className="ui-field mt-1.5"
                  />
                </div>
                <div>
                  <label className="ui-label tabular-nums text-slate-600 dark:text-slate-500">Date (Optional)</label>
                  <input aria-label="Assessment date"
                    type="date"
                    value={assDate}
                    onChange={(e) => setAssDate(e.target.value)}
                    className="ui-field mt-1.5"
                  />
                </div>
              </div>

              <div>
                <label className="ui-label tabular-nums text-slate-600 dark:text-slate-500">Description (Optional)</label>
                <textarea aria-label="Assessment description"
                  placeholder="Notes on assessment scope, rubrics..."
                  value={assDescription}
                  onChange={(e) => setAssDescription(e.target.value)}
                  className="ui-field mt-1.5 h-20 resize-none"
                />
              </div>

              <button
                type="submit"
                className="ui-button-primary w-full"
              >
                Create Assessment Card
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------
          TAB 3: LEARNER ROSTER MANAGER (Phase 3)
          -------------------------------------------------------- */}
      {activeTab === 'roster' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Roster list */}
          <div className="ui-panel min-w-0 lg:col-span-2 p-6 md:p-8 space-y-5">

            {/* Search and Sort controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3.5 pb-2 border-b border-slate-100 dark:border-slate-900">
              <h3 className="ui-section-title text-balance">
                Learners Roster Directory ({activeProject.students.length})
              </h3>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-none">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-600" />
                  <input aria-label="Search learners by name or LRN"
                    type="text"
                    placeholder="Search LRN / Name..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="ui-field pl-8 pr-3"
                  />
                </div>

                <select aria-label="Sort learners"
                  value={studentSort}
                  onChange={(e) => setStudentSort(e.target.value as any)}
                  className="ui-field"
                >
                  <option value="name-asc">Alphabetical A-Z</option>
                  <option value="name-desc">Alphabetical Z-A</option>
                  <option value="lrn">Sort by LRN</option>
                  <option value="sex">Sort by Sex</option>
                </select>
              </div>
            </div>

            {activeProject.students.length === 0 ? (
              <div className="text-center py-12 text-slate-600 text-sm font-semibold">
                Roster empty. Register students manually on the right or use batch import.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-900 max-h-[500px] overflow-y-auto pr-1">
                {activeStudents.map((st) => (
                  <div key={st.id} className="py-3.5 flex justify-between items-center hover:bg-slate-50/30 dark:hover:bg-slate-900/10 px-2 rounded-xl transition-colors">
                    <div className="space-y-1">
                      <h4 className="ui-section-title text-balance">{st.name}</h4>
                      <p className="text-pretty text-sm tabular-nums text-slate-500 dark:text-slate-500 font-medium">
                        LRN: {st.lrn} | Sex: {st.sex} {st.studentNumber ? `| No: ${st.studentNumber}` : ''}
                      </p>
                      <span className={`text-sm tabular-nums font-semibold px-1.5 py-0.5 rounded-sm ${st.status === 'Active' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20' : st.status === 'Dropped' ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/20' : 'bg-slate-50 text-slate-500 dark:bg-slate-950/20'
                        }`}>
                        {st.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button aria-label="Edit Student details"
                        onClick={() => setEditingStudent(st)}
                        className="ui-icon-button"
                        title="Edit Student details"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button aria-label="Purge Student"
                        onClick={() => {
                          showCustomConfirm(
                            `Are you sure you want to permanently delete learner [${st.name}]? All registered grade cards and scores for this student will be completely purged.`,
                            () => deleteStudentFromActive(st.id),
                            "Purge Learner Profile"
                          );
                        }}
                        className="ui-icon-button"
                        title="Purge Student"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Roster inputs */}
          <div className="space-y-6">

            {/* Manual student add */}
            <div className="ui-panel min-w-0 p-6 md:p-8 space-y-4 h-fit">
              <h3 className="ui-section-title text-balance flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-slate-600" />
                Register Student
              </h3>

              <form onSubmit={handleAddStudent} className="space-y-3.5">
                <div>
                  <label className="ui-label tabular-nums text-slate-600 dark:text-slate-500">Learner Ref. Number (LRN)</label>
                  <input aria-label="Learner reference number (LRN)"
                    type="text"
                    required
                    maxLength={12}
                    placeholder="12-digit number (e.g. 102938475612)"
                    value={newStudentLrn}
                    onChange={(e) => setNewStudentLrn(e.target.value.replace(/\D/g, ''))}
                    className="ui-field mt-1.5"
                  />
                </div>

                <div>
                  <label className="ui-label tabular-nums text-slate-600 dark:text-slate-500">Student Name</label>
                  <input aria-label="Student name"
                    type="text"
                    required
                    placeholder="LASTNAME, FIRSTNAME MIDDLE_I."
                    value={newStudentName}
                    onChange={(e) => setNewStudentName(e.target.value)}
                    className="ui-field mt-1.5"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="ui-label tabular-nums text-slate-600 dark:text-slate-500">Gender (Sex)</label>
                    <select aria-label="Sex"
                      value={newStudentSex}
                      onChange={(e) => setNewStudentSex(e.target.value as any)}
                      className="ui-field mt-1.5"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                  <div>
                    <label className="ui-label tabular-nums text-slate-600 dark:text-slate-500">Student No. (Opt.)</label>
                    <input aria-label="Student number (optional)"
                      type="text"
                      placeholder="e.g. 2026-004"
                      value={newStudentNumber}
                      onChange={(e) => setNewStudentNumber(e.target.value)}
                      className="ui-field mt-1.5"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="ui-button-primary w-full"
                >
                  Register Learner Account
                </button>
              </form>
            </div>

            {/* Quick Import from another Class/Project */}
            {projects.length > 1 && (
              <div className="ui-panel min-w-0 p-6 md:p-8 space-y-4 h-fit">
                <h3 className="ui-section-title text-balance flex items-center gap-2">
                  <FolderSync className="h-5 w-5 text-slate-600" />
                  Clone/Import Class Roster
                </h3>
                <p className="text-pretty text-sm text-slate-600 leading-normal font-semibold">
                  Instantly copy the complete learner roster from any other existing class with one click to avoid manual encoding.
                </p>

                <div className="space-y-3">
                  <label className="ui-label tabular-nums text-slate-600 dark:text-slate-500 block">Roster Source Class</label>
                  <select aria-label="Roster source class"
                    onChange={(e) => {
                      const selectedProjId = e.target.value;
                      if (!selectedProjId) return;
                      const sourceProj = projects.find(p => p.id === selectedProjId);
                      if (sourceProj && sourceProj.students.length > 0) {
                        showCustomConfirm(
                          `Are you sure you want to import all ${sourceProj.students.length} students from ${sourceProj.gradeLevel} - ${sourceProj.section} (${sourceProj.subject}) into this active class? This will append them to your current roster.`,
                          () => {
                            const studentsToImport = sourceProj.students.map(s => ({
                              lrn: s.lrn,
                              name: s.name,
                              sex: s.sex,
                              studentNumber: s.studentNumber,
                              status: s.status as any
                            }));
                            const { added, skipped } = importRosterToActive(studentsToImport);
                            showCustomAlert(
                              added > 0
                                ? `Added ${added} learner(s) from ${sourceProj.gradeLevel} - ${sourceProj.section}.${skipped > 0 ? ` Skipped ${skipped} learner(s) already in this roster.` : ''}`
                                : `No learners were added. All ${studentsToImport.length} learner(s) are already in this roster.`,
                              added > 0 ? "Import Successful" : "Nothing Imported",
                              added > 0 ? "success" : "info"
                            );
                          },
                          "Clone Class Roster"
                        );
                      } else {
                        showCustomAlert("The selected class has no students in its roster.", "Empty Class Roster", "error");
                      }
                      e.target.value = "";
                    }}
                    className="ui-field"
                    defaultValue=""
                  >
                    <option value="" disabled>-- Select class to import from --</option>
                    {projects
                      .filter(p => p.id !== activeProjectId)
                      .map(p => (
                        <option key={p.id} value={p.id}>
                          {p.gradeLevel} - {p.section} | {p.subject} ({p.students.length} students)
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            )}

            {/* CSV Batch Paste Import */}
            <div className="ui-panel min-w-0 p-6 md:p-8 space-y-4 h-fit">
              <h3 className="ui-section-title text-balance flex items-center gap-2">
                <Upload className="h-5 w-5 text-emerald-600" />
                Batch Paste CSV / Excel Import
              </h3>
              <p className="text-pretty text-sm text-slate-600 leading-normal font-semibold">
                Paste student lists directly from CSV or Excel/Google Sheets. Each row needs a 12-digit LRN and a name. Existing learners are kept and duplicates are skipped. Supports quoted names with commas, e.g. <span className="tabular-nums text-emerald-600 dark:text-emerald-400">117563820451,"Dela Cruz, John Reyes",M</span>
              </p>

              {!csvPasteMode ? (
                <button
                  type="button"
                  onClick={() => setCsvPasteMode(true)}
                  className="ui-button w-full"
                >
                  Open Paste Portal
                </button>
              ) : (
                <div className="space-y-3">
                  <textarea aria-label="Paste learner records"
                    placeholder={'117563820451,"Dela Cruz, John Reyes",M\n109827364512,"Santos, Maria B.",F,2026-101\n102938475610,"Reyes, Juan A.",M,2026-102'}
                    value={csvInput}
                    onChange={(e) => setCsvInput(e.target.value)}
                    className="ui-field h-28 resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleCsvImport}
                      className="ui-button-primary flex-1"
                    >
                      Import Batch
                    </button>
                    <button
                      type="button"
                      onClick={() => { setCsvInput(''); setCsvPasteMode(false); }}
                      className="ui-button"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------
          TAB 4: REPORTS & PRINTING (Phase 8)
          -------------------------------------------------------- */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          {/* Top selection of report types */}
          <div className="ui-panel min-w-0 p-6 md:p-8 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 dark:border-slate-900 pb-4">
              <div>
                <h3 className="ui-section-title text-balance flex items-center gap-2">
                  <Printer className="h-5 w-5 text-slate-600" />
                  Printable Report Suite (Phase 8)
                </h3>
                <p className="text-pretty text-sm text-slate-600 mt-1 font-semibold">Generate structured report sheets completely matching DepEd output standards.</p>
              </div>

              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  disabled={isExportingPDF}
                  onClick={async () => {
                    if (!activeProject) return;
                    setIsExportingPDF(true);
                    try {
                      const filename = `Academic_Report_${activeProject.gradeLevel}_${activeProject.section}_${activeProject.subject}.pdf`.replace(/\s+/g, '_');
                      await exportClassRecordPDF(activeProject, filename);
                    } catch (e) {
                      console.error('PDF export error:', e);
                    } finally {
                      setIsExportingPDF(false);
                    }
                  }}
                  className="ui-button flex-1 sm:flex-none"
                >
                  <FileDown className="h-4 w-4" />
                  <span>{isExportingPDF ? 'Generating PDF...' : 'Download PDF (All Pages)'}</span>
                </button>
                <button
                  onClick={handlePrint}
                  className="ui-button flex-1 sm:flex-none"
                >
                  <Printer className="h-4 w-4" /> {isAndroid() ? 'Print (PDF)' : 'Direct Print'}
                </button>
                <button
                  onClick={() => setIsExcelExportOpen(true)}
                  className="ui-button flex-1 sm:flex-none"
                >
                  <FileSpreadsheet className="h-4 w-4" /> Export Excel
                </button>
                <button
                  onClick={handleExportCSVReport}
                  className="ui-button flex-1 sm:flex-none"
                >
                  <FileSpreadsheet className="h-4 w-4" /> Export CSV
                </button>
              </div>
            </div>

            {/* Individual report options view selector */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">

              {/* Report 1: Learner Summary Card Selector */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-900 space-y-3">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-400 font-semibold text-sm">
                  <FileText className="h-4.5 w-4.5" /> Learner Individual Progress Card
                </div>
                <p className="text-pretty text-sm text-slate-600 leading-relaxed font-semibold">
                  Generates an individual student progress slip detailing WW/PT percentages, examination marks, final grades, and official comments.
                </p>
                <div className="flex gap-2">
                  <select aria-label="Learner for progress report"
                    value={reportStudentId}
                    onChange={(e) => setReportStudentId(e.target.value)}
                    className="ui-field flex-1"
                  >
                    <option value="">-- Choose Learner --</option>
                    {activeProject.students
                      .filter(s => s.status !== 'Dropped' && s.status !== 'Transferred')
                      .map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Report 2: Class assessment statistics summary */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-900 space-y-3">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-400 font-semibold text-sm">
                  <BarChart4 className="h-4.5 w-4.5" /> Assessment Difficulty & Passing Ratios
                </div>
                <p className="text-pretty text-sm text-slate-600 leading-relaxed font-semibold">
                  Reviews assessment-wise parameters: high grades, low scores, class averages, and percentage passes.
                </p>
                <div className="text-sm tabular-nums text-slate-600 dark:text-slate-400 font-medium">
                  {activeQuarterData?.assessments?.length ?? 0} assessment(s) in {activeQuarterId}
                </div>
              </div>

            </div>

            {/* Assessment Difficulty & Passing Ratios Table */}
            {(() => {
              const assessments = [...(activeQuarterData?.assessments || [])].sort((a, b) => a.order - b.order);
              const learners = activeProject.students.filter(s => s.status !== 'Dropped' && s.status !== 'Transferred');
              const qScores = activeQuarterData?.scores || {};
              const rScores = activeQuarterData?.reassessmentScores || {};

              const stats = assessments.map(a => {
                let total = 0;
                let scored = 0;
                let passed = 0;
                learners.forEach(st => {
                  const raw = qScores[st.id]?.[a.id];
                  const reassessed = rScores[st.id]?.[a.id];
                  const value = reassessed !== undefined ? reassessed : raw;
                  if (value !== undefined && value !== null) {
                    total += value;
                    scored++;
                    if (a.perfectScore > 0 && value / a.perfectScore >= 0.75) passed++;
                  }
                });
                const mean = scored > 0 ? total / scored : 0;
                const meanPct = a.perfectScore > 0 ? (mean / a.perfectScore) * 100 : 0;
                const passPct = scored > 0 ? (passed / scored) * 100 : 0;
                const difficulty = meanPct >= 85 ? 'Easy' : meanPct >= 70 ? 'Moderate' : 'Challenging';
                return { a, mean, meanPct, scored, passed, passPct, difficulty };
              });

              if (stats.length === 0) {
                return (
                  <div className="pt-2 text-sm text-slate-600 font-semibold italic">
                    No assessments yet for {activeQuarterId}. Add assessments in the Workspace tab to see difficulty and passing ratios.
                  </div>
                );
              }

              return (
                <div className="pt-2 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <h4 className="ui-section-title text-balance">
                      Assessment Difficulty & Passing Ratios — {activeQuarterId}
                    </h4>
                    <span className="text-sm tabular-nums font-medium text-slate-600">
                      {learners.length} active learner(s)
                    </span>
                  </div>
                  <div className="min-w-0 max-w-full overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                    <table className="tabular-nums w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-950 text-xs tabular-nums text-slate-500 dark:text-slate-400">
                          <th className="py-2 px-3">Category</th>
                          <th className="py-2 px-3">Assessment</th>
                          <th className="py-2 px-3 text-center">Perfect</th>
                          <th className="py-2 px-3 text-center">Scored</th>
                          <th className="py-2 px-3 text-center">Class Mean</th>
                          <th className="py-2 px-3 text-center">Mean %</th>
                          <th className="py-2 px-3 text-center">Passed (≥75%)</th>
                          <th className="py-2 px-3 text-center">Pass Ratio</th>
                          <th className="py-2 px-3 text-center">Difficulty</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-900 font-semibold text-slate-700 dark:text-slate-300">
                        {stats.map(({ a, mean, meanPct, scored, passed, passPct, difficulty }) => {
                          const categoryClass = a.category === 'WOW'
                            ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400'
                            : a.category === 'PPT'
                              ? 'bg-teal-50 text-teal-700 dark:bg-teal-950/30 dark:text-teal-400'
                              : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400';
                          const difficultyClass = difficulty === 'Easy'
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : difficulty === 'Moderate'
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-rose-600 dark:text-rose-400';
                          const passClass = passPct >= 75
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : passPct >= 50
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-rose-600 dark:text-rose-400';
                          return (
                            <tr key={a.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-950/40">
                              <td className="py-2 px-3">
                                <span className={`text-xs tabular-nums font-semibold px-1.5 py-0.5 rounded-sm ${categoryClass}`}>{a.category}</span>
                              </td>
                              <td className="py-2 px-3">
                                <div className="font-semibold text-slate-800 dark:text-slate-200">{a.name}</div>
                                {a.date && <div className="text-xs tabular-nums text-slate-600">{a.date}</div>}
                              </td>
                              <td className="py-2 px-3 text-center tabular-nums">{a.perfectScore}</td>
                              <td className="py-2 px-3 text-center tabular-nums">{scored}/{learners.length}</td>
                              <td className="py-2 px-3 text-center tabular-nums">{Math.round(mean * 10) / 10}</td>
                              <td className="py-2 px-3 text-center tabular-nums font-semibold">{meanPct.toFixed(1)}%</td>
                              <td className="py-2 px-3 text-center tabular-nums">{passed}</td>
                              <td className={`py-2 px-3 text-center tabular-nums font-semibold ${passClass}`}>{passPct.toFixed(1)}%</td>
                              <td className={`py-2 px-3 text-center text-xs font-semibold ${difficultyClass}`}>{difficulty}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-pretty text-sm text-slate-600 font-semibold">
                    Difficulty is the class mean as a percentage of the perfect score (Easy ≥ 85%, Moderate 70–84%, Challenging below 70%). Passing uses a score of at least 75% of the perfect score.
                  </p>
                </div>
              );
            })()}
          </div>

          {/* Printable Layout Canvas */}
          <div id="printable-report-card" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl p-8 shadow-xs max-w-4xl mx-auto space-y-8 font-sans print:border-0 print:shadow-none print:p-0">

            {/* Report Header */}
            <div className="text-center space-y-1.5 border-b-2 border-slate-900 dark:border-slate-100 pb-5">
              <span className="text-[10px] font-mono font-black tracking-widest text-slate-400 uppercase">OFFICIAL ACADEMIC GRADED DOCUMENT</span>
              <h1 className="text-lg font-black tracking-tight text-slate-900 dark:text-white uppercase">{activeProject.schoolName}</h1>
              <p className="text-xs text-slate-450 dark:text-slate-400 font-bold">
                DepEd Region Grade report • S.Y. {activeProject.schoolYear} • {activeQuarterId}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-left text-[10px] font-mono pt-3 border-t border-dashed border-slate-200 mt-3 text-slate-500">
                <div><span className="font-bold uppercase">GRADE LEVEL:</span> <span className="font-extrabold text-slate-800 dark:text-slate-200">{activeProject.gradeLevel}</span></div>
                <div><span className="font-bold uppercase">SECTION:</span> <span className="font-extrabold text-slate-800 dark:text-slate-200">{activeProject.section}</span></div>
                <div><span className="font-bold uppercase">SUBJECT:</span> <span className="font-extrabold text-slate-800 dark:text-slate-200">{activeProject.subject}</span></div>
                <div><span className="font-bold uppercase">TEACHER:</span> <span className="font-extrabold text-slate-800 dark:text-slate-200 text-xs">{activeProject.teacherName}</span></div>
              </div>
            </div>

            {/* SECTION A: INDIVIDUAL PROGRESS CARD */}
            {reportStudentId && (
              <div className="space-y-4">
                <h4 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider border-b border-slate-150 pb-1.5 flex items-center gap-1.5">
                  <Award className="h-4 w-4 text-indigo-600" />
                  Learner Progress Breakdown: {activeProject.students.find(s => s.id === reportStudentId)?.name}
                </h4>

                {(() => {
                  const s = activeProject.students.find(x => x.id === reportStudentId);
                  if (!s) return null;
                  const g = computeProjectStudentGrade(activeProject, s.id, globalSettings.subjects);
                  return (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 dark:bg-slate-950 p-6 rounded-xl border border-slate-150 dark:border-slate-850">

                        <div className="space-y-3">
                          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Student Profile</div>
                          <div>
                            <div className="text-xs font-black text-slate-850 dark:text-slate-200">{s.name}</div>
                            <div className="text-[10px] text-slate-450 dark:text-slate-550 mt-0.5">LRN: {s.lrn}</div>
                            <div className="text-[10px] text-slate-450 dark:text-slate-550">Sex: {s.sex}</div>
                            <div className="text-[10px] text-slate-450 dark:text-slate-550 mt-1">Status: <span className="font-bold text-emerald-600">{s.status}</span></div>
                          </div>
                        </div>

                        <div className="space-y-2 col-span-2">
                          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Subject Component Ratios</div>

                          <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-350 font-bold">
                            <div className="flex justify-between">
                              <span>Written Works Ratio:</span>
                              <span className="font-mono">{g.wowPercentage}% score &rarr; {g.weightedWOW}% weighted</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Performance Tasks Ratio:</span>
                              <span className="font-mono">{g.pptPercentage}% score &rarr; {g.weightedPPT}% weighted</span>
                            </div>
                            <div className="flex justify-between pb-1.5 border-b border-slate-200 dark:border-slate-800">
                              <span>Quarterly Periodic Exam:</span>
                              <span className="font-mono">{g.qstePercentage}% score &rarr; {g.weightedQSTE}% weighted</span>
                            </div>
                            <div className="flex justify-between pt-1.5 text-slate-900 dark:text-slate-100 font-extrabold">
                              <span>Weighted Initial Raw Score:</span>
                              <span className="font-mono text-indigo-650">{g.initialGrade}%</span>
                            </div>
                            <div className="flex justify-between text-indigo-700 dark:text-indigo-400 font-black text-sm pt-1">
                              <span>Final Quarterly Card Grade:</span>
                              <span className="font-mono">{g.finalGrade} ({g.remarks})</span>
                            </div>
                          </div>
                        </div>

                      </div>

                      {/* Detailed Scores Breakdown */}
                      <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 rounded-xl p-5 space-y-4">
                        <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Assessment Scores Breakdown</div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {(() => {
                            const assessments = activeQuarterData ? [...activeQuarterData.assessments].sort((a, b) => a.order - b.order) : [];
                            const studentScores = activeQuarterData ? (activeQuarterData.scores[s.id] || {}) : {};

                            const wwList = assessments.filter(a => a.category === 'WOW');
                            const ptList = assessments.filter(a => a.category === 'PPT');
                            const qeList = assessments.filter(a => a.category === 'QSTE');

                            const renderAssessmentList = (title: string, list: typeof wwList, colorClass: string, bgClass: string, borderClass: string) => (
                              <div className={`p-4 rounded-xl border ${borderClass} ${bgClass} space-y-2`}>
                                <div className={`text-[10px] font-mono font-black uppercase tracking-wider ${colorClass}`}>{title}</div>
                                {list.length === 0 ? (
                                  <div className="text-[10px] text-slate-400 font-bold italic py-2">No assessments recorded</div>
                                ) : (
                                  <div className="space-y-1.5">
                                    {list.map(a => {
                                      const score = studentScores[a.id];
                                      const scoreDisplay = score !== undefined ? `${score} / ${a.perfectScore}` : `Missing / ${a.perfectScore}`;
                                      const pctDisplay = score !== undefined ? `${((score / a.perfectScore) * 100).toFixed(0)}%` : '-';
                                      return (
                                        <div key={a.id} className="flex justify-between items-center text-xs border-b border-slate-100 dark:border-slate-800/50 pb-1 last:border-b-0">
                                          <div className="truncate pr-2">
                                            <span className="font-extrabold text-slate-700 dark:text-slate-350">{a.name}</span>
                                            {a.date && <span className="text-[9px] font-mono text-slate-450 block">{a.date}</span>}
                                          </div>
                                          <div className="text-right shrink-0">
                                            <span className="font-mono font-black text-slate-800 dark:text-slate-200">{scoreDisplay}</span>
                                            <span className="text-[9px] font-mono text-slate-400 block">{pctDisplay}</span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );

                            return (
                              <>
                                {renderAssessmentList("Written Works", wwList, "text-indigo-600 dark:text-indigo-400", "bg-indigo-50/20 dark:bg-indigo-950/10", "border-indigo-100 dark:border-indigo-900/30")}
                                {renderAssessmentList("Performance Tasks", ptList, "text-teal-600 dark:text-teal-400", "bg-teal-50/20 dark:bg-teal-950/10", "border-teal-100 dark:border-teal-900/30")}
                                {renderAssessmentList("Quarterly Exams", qeList, "text-emerald-600 dark:text-emerald-400", "bg-emerald-50/20 dark:bg-emerald-950/10", "border-emerald-100 dark:border-emerald-900/30")}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* SECTION B: CLASS GRADE SUMMARIES */}
            <div className="space-y-4">
              <h4 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider border-b border-slate-150 pb-1.5 flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-indigo-600" />
                Class Grade Summary Directory
              </h4>

              <table className="w-full text-left border-collapse text-[10px]">
                <thead>
                  <tr className="border-b border-slate-900 text-[9px] font-mono text-slate-500 uppercase tracking-wider font-bold">
                    <th className="py-2">No.</th>
                    <th className="py-2">Student Name</th>
                    <th className="py-2 text-center">LRN</th>
                    <th className="py-2 text-center">Sex</th>
                    <th className="py-2 text-center">WW Weighted</th>
                    <th className="py-2 text-center">PT Weighted</th>
                    <th className="py-2 text-center">QE Weighted</th>
                    <th className="py-2 text-center">Initial</th>
                    <th className="py-2 text-center">Final Card</th>
                    <th className="py-2 text-center">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 text-slate-800 font-bold">
                  {activeProject.students.filter(s => s.status !== 'Dropped' && s.status !== 'Transferred').sort((a, b) => a.name.localeCompare(b.name)).map((s, idx) => {
                    const g = computeProjectStudentGrade(activeProject, s.id, globalSettings.subjects);
                    return (
                      <tr key={s.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 font-mono">{idx + 1}</td>
                        <td className="py-2.5 uppercase text-slate-950">{s.name}</td>
                        <td className="py-2.5 text-center font-mono">{s.lrn}</td>
                        <td className="py-2.5 text-center">{s.sex[0]}</td>
                        <td className="py-2.5 text-center font-mono">{g.weightedWOW}%</td>
                        <td className="py-2.5 text-center font-mono">{g.weightedPPT}%</td>
                        <td className="py-2.5 text-center font-mono">{g.weightedQSTE}%</td>
                        <td className="py-2.5 text-center font-mono text-slate-500">{g.initialGrade}%</td>
                        <td className="py-2.5 text-center font-mono text-indigo-700 text-xs font-black">{g.finalGrade}</td>
                        <td className="py-2.5 text-center">
                          <span className={g.isPassing ? 'text-emerald-700' : 'text-rose-600 animate-pulse'}>
                            {g.remarks}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Official signature box */}
            <div className="grid grid-cols-2 gap-8 pt-12 border-t border-dashed border-slate-200 text-xs font-medium text-slate-500">
              <div className="space-y-12">
                <div>Prepared & Computed By:</div>
                <div className="text-slate-900 font-black uppercase border-b border-slate-900 pb-1 max-w-[220px]">
                  {activeProject.teacherName}
                </div>
                <div className="text-[10px] font-mono -mt-1 uppercase tracking-wider">Teacher I / Adviser / Instructor</div>
              </div>
              <div className="space-y-12 text-right">
                <div>Verified & Approved By:</div>
                <div className="text-slate-900 font-black uppercase border-b border-slate-900 pb-1 ml-auto max-w-[220px]">
                  {globalSettings.principalName?.trim() || '_________________________'}
                </div>
                <div className="text-[10px] font-mono -mt-1 uppercase tracking-wider">School Principal / Head Teacher</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------
          EDIT STUDENT MODAL
          -------------------------------------------------------- */}
      {editingStudent && (
        <div className="ui-dialog-overlay">
          <div role="dialog" aria-modal="true" aria-label="Modify Student Profile" className="ui-dialog max-w-md block overflow-y-auto p-4 sm:p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="ui-section-title text-balance">Modify Student Profile</h3>
              <button aria-label="Close dialog" onClick={() => setEditingStudent(null)} className="ui-icon-button">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <label className="ui-label tabular-nums text-slate-600">Learner Ref. Number (LRN)</label>
                <input aria-label="Learner reference number (LRN)"
                  type="text"
                  maxLength={12}
                  value={editingStudent.lrn}
                  onChange={(e) => setEditingStudent({ ...editingStudent, lrn: e.target.value.replace(/\D/g, '') })}
                  className="ui-field mt-1"
                />
              </div>

              <div>
                <label className="ui-label tabular-nums text-slate-600">Student Name</label>
                <input aria-label="Student name"
                  type="text"
                  value={editingStudent.name}
                  onChange={(e) => setEditingStudent({ ...editingStudent, name: e.target.value.toUpperCase() })}
                  className="ui-field mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="ui-label tabular-nums text-slate-600">Sex (Gender)</label>
                  <select aria-label="Sex"
                    value={editingStudent.sex}
                    onChange={(e) => setEditingStudent({ ...editingStudent, sex: e.target.value as any })}
                    className="ui-field mt-1"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div>
                  <label className="ui-label tabular-nums text-slate-600">Registration Status</label>
                  <select aria-label="Registration status"
                    value={editingStudent.status}
                    onChange={(e) => setEditingStudent({ ...editingStudent, status: e.target.value as any })}
                    className="ui-field mt-1"
                  >
                    <option value="Active">Active</option>
                    <option value="Dropped">Dropped</option>
                    <option value="Transferred">Transferred</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    updateStudentInActive(editingStudent);
                    setEditingStudent(null);
                  }}
                  className="ui-button-primary flex-1"
                >
                  Save Profile Changes
                </button>
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="ui-button"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------
          ADD ASSESSMENT COLUMN POP-UP MODAL
          -------------------------------------------------------- */}
      {isAddAssessmentModalOpen && activeProject && (
        <div className="ui-dialog-overlay">
          <div role="dialog" aria-modal="true" aria-label="Add Assessment Column" className="ui-dialog max-w-lg block overflow-y-auto p-4 sm:p-6 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-slate-50 dark:bg-slate-950/40 text-slate-600 dark:text-slate-400 rounded-xl">
                  <Plus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="ui-section-title text-balance">
                    Add Assessment Column
                  </h3>
                  <p className="text-pretty text-sm text-slate-600 font-medium">
                    Create WW, PT, or QE entry for {activeProject.subject} (Grade {activeProject.gradeLevel}-{activeProject.section})
                  </p>
                </div>
              </div>
              <button aria-label="Close dialog"
                type="button"
                onClick={() => setIsAddAssessmentModalOpen(false)}
                className="ui-icon-button"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleModalSubmitAssessment} className="space-y-4">
              {/* Category Selector Cards */}
              <div>
                <label className="ui-label tabular-nums text-slate-600 dark:text-slate-500 mb-1.5 block">
                  Select Grading Component Category
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(() => {
                    const activeWeights = getSubjectWeights(
                      activeProject.subject,
                      globalSettings.subjects,
                      activeProject.workspace,
                      activeProject.assessmentProfileId,
                      activeProject.customWeights
                    );
                    return (
                      <>
                        <button
                          type="button"
                          onClick={() => handleModalCategoryChange('WOW')}
                          className={`p-3 rounded-xl border text-left cursor-pointer ${modalAssCategory === 'WOW'
                            ? 'bg-emerald-50/80 dark:bg-emerald-950/50 border-emerald-500 text-emerald-900 dark:text-emerald-100 ring-2 ring-emerald-500/30'
                            : 'bg-slate-50/50 dark:bg-slate-950/30 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100/50'
                            }`}
                        >
                          <div className="text-sm font-semibold flex items-center justify-between">
                            <span>Written Work</span>
                            <span className="text-sm tabular-nums font-semibold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded">WW</span>
                          </div>
                          <div className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-semibold">
                            Quizzes & Exams ({Math.round(activeWeights.wow * 100)}%)
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleModalCategoryChange('PPT')}
                          className={`p-3 rounded-xl border text-left cursor-pointer ${modalAssCategory === 'PPT'
                            ? "bg-slate-50/80 dark:bg-slate-950/50 border-slate-500 text-slate-900 dark:text-slate-100 ring-2 ring-slate-500/30"
                            : 'bg-slate-50/50 dark:bg-slate-950/30 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100/50'
                            }`}
                        >
                          <div className="text-sm font-semibold flex items-center justify-between">
                            <span>Performance Task</span>
                            <span className="text-sm tabular-nums font-semibold bg-slate-100 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded">PT</span>
                          </div>
                          <div className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-semibold">
                            Projects & Hands-on ({Math.round(activeWeights.ppt * 100)}%)
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleModalCategoryChange('QSTE')}
                          className={`p-3 rounded-xl border text-left cursor-pointer ${modalAssCategory === 'QSTE'
                            ? 'bg-emerald-50/80 dark:bg-emerald-950/50 border-emerald-500 text-emerald-900 dark:text-emerald-100 ring-2 ring-emerald-500/30'
                            : 'bg-slate-50/50 dark:bg-slate-950/30 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100/50'
                            }`}
                        >
                          <div className="text-sm font-semibold flex items-center justify-between">
                            <span>Quarterly Exam</span>
                            <span className="text-sm tabular-nums font-semibold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded">QE</span>
                          </div>
                          <div className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-semibold">
                            Periodic Exam ({Math.round(activeWeights.qste * 100)}%)
                          </div>
                        </button>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Quick Preset Title Templates */}
              <div>
                <label className="ui-label tabular-nums text-slate-600 dark:text-slate-500 mb-1 block">
                  Quick Naming Presets
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {modalAssCategory === 'WOW' && [
                    "WW: Short Quiz",
                    "WW: Long Quiz",
                    "WW: Unit Test",
                    "WW: Seatwork / Activity",
                    "WW: Essay / Worksheet"
                  ].map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setModalAssName(preset)}
                      className="ui-button"
                    >
                      {preset}
                    </button>
                  ))}

                  {modalAssCategory === 'PPT' && [
                    "PT: Group Project",
                    "PT: Laboratory Activity",
                    "PT: Oral Presentation",
                    "PT: Portfolio / Artifact",
                    "PT: Research Work"
                  ].map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setModalAssName(preset)}
                      className="ui-button"
                    >
                      {preset}
                    </button>
                  ))}

                  {modalAssCategory === 'QSTE' && [
                    "1st Quarterly Exam",
                    "2nd Quarterly Exam",
                    "3rd Quarterly Exam",
                    "4th Quarterly Exam",
                    "Periodic Test"
                  ].map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setModalAssName(preset)}
                      className="ui-button"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title & Perfect Score */}
              <div>
                <label className="ui-label tabular-nums text-slate-600 dark:text-slate-500">
                  Assessment Title
                </label>
                <input aria-label="Assessment title"
                  type="text"
                  required
                  placeholder="e.g. Quiz 1 or PT2: Lab experiment"
                  value={modalAssName}
                  onChange={(e) => setModalAssName(e.target.value)}
                  className="ui-field mt-1"
                />
              </div>

              {/* Perfect Score (HPS) with quick score chips */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="ui-label tabular-nums text-slate-600 dark:text-slate-500">
                    Highest Possible Score (HPS / Max)
                  </label>
                  <div className="flex items-center gap-1">
                    {[10, 15, 20, 30, 50, 100].map(pts => (
                      <button
                        key={pts}
                        type="button"
                        onClick={() => setModalAssPerfectScore(pts)}
                        className={`text-sm tabular-nums font-semibold px-1.5 py-0.5 rounded cursor-pointer transition-colors ${modalAssPerfectScore === pts
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                          }`}
                      >
                        {pts} pts
                      </button>
                    ))}
                  </div>
                </div>
                <input aria-label="Highest possible score"
                  type="number"
                  required
                  min={1}
                  max={1000}
                  value={modalAssPerfectScore}
                  onChange={(e) => setModalAssPerfectScore(parseInt(e.target.value) || 20)}
                  className="ui-field mt-1"
                />
              </div>

              {/* Date & Optional Description */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="ui-label tabular-nums text-slate-600 dark:text-slate-500">
                    Conduct Date (Optional)
                  </label>
                  <input aria-label="Assessment date"
                    type="date"
                    value={modalAssDate}
                    onChange={(e) => setModalAssDate(e.target.value)}
                    className="ui-field mt-1"
                  />
                </div>
                <div>
                  <label className="ui-label tabular-nums text-slate-600 dark:text-slate-500">
                    Notes / Rubric (Optional)
                  </label>
                  <input aria-label="Notes or rubric"
                    type="text"
                    placeholder="Brief scope notes..."
                    value={modalAssDescription}
                    onChange={(e) => setModalAssDescription(e.target.value)}
                    className="ui-field mt-1"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="submit"
                  className="ui-button-primary flex-1"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Column to Gradebook</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddAssessmentModalOpen(false)}
                  className="ui-button"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------
          EDIT ASSESSMENT & HPS POP-UP MODAL
          -------------------------------------------------------- */}
      {editingAssessmentModal && activeProject && (
        <div className="ui-dialog-overlay">
          <div role="dialog" aria-modal="true" aria-label="Edit Assessment & Highest Possible Score" className="ui-dialog max-w-lg block overflow-y-auto p-4 sm:p-6 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-slate-50 dark:bg-slate-950/40 text-slate-600 dark:text-slate-400 rounded-xl">
                  <Edit3 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="ui-section-title text-balance">
                    Edit Assessment & Highest Possible Score
                  </h3>
                  <p className="text-pretty text-sm text-slate-600 font-medium">
                    Update assessment details & HPS for {activeProject.subject} ({activeQuarterId})
                  </p>
                </div>
              </div>
              <button aria-label="Close dialog"
                type="button"
                onClick={() => setEditingAssessmentModal(null)}
                className="ui-icon-button"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditAssessment} className="space-y-4">
              {/* Category Selector Cards */}
              <div>
                <label className="ui-label tabular-nums text-slate-600 dark:text-slate-500 mb-1.5 block">
                  Grading Component Category
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditAssCategory('WOW')}
                    className={`p-3 rounded-xl border text-left cursor-pointer ${editAssCategory === 'WOW'
                      ? "bg-slate-50/80 dark:bg-slate-950/50 border-slate-500 text-slate-900 dark:text-slate-100 ring-2 ring-slate-500/30"
                      : 'bg-slate-50/50 dark:bg-slate-950/30 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100/50'
                      }`}
                  >
                    <div className="text-sm font-semibold flex items-center justify-between">
                      <span>Written Work</span>
                      <span className="text-sm tabular-nums font-semibold bg-slate-100 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded">WW</span>
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-semibold">
                      Quizzes & Unit Tests
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditAssCategory('PPT')}
                    className={`p-3 rounded-xl border text-left cursor-pointer ${editAssCategory === 'PPT'
                      ? "bg-slate-50/80 dark:bg-slate-950/50 border-slate-500 text-slate-900 dark:text-slate-100 ring-2 ring-slate-500/30"
                      : 'bg-slate-50/50 dark:bg-slate-950/30 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100/50'
                      }`}
                  >
                    <div className="text-sm font-semibold flex items-center justify-between">
                      <span>Performance</span>
                      <span className="text-sm tabular-nums font-semibold bg-slate-100 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded">PT</span>
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-semibold">
                      Projects & Practical
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditAssCategory('QSTE')}
                    className={`p-3 rounded-xl border text-left cursor-pointer ${editAssCategory === 'QSTE'
                      ? 'bg-emerald-50/80 dark:bg-emerald-950/50 border-emerald-500 text-emerald-900 dark:text-emerald-100 ring-2 ring-emerald-500/30'
                      : 'bg-slate-50/50 dark:bg-slate-950/30 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100/50'
                      }`}
                  >
                    <div className="text-sm font-semibold flex items-center justify-between">
                      <span>Quarterly Exam</span>
                      <span className="text-sm tabular-nums font-semibold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded">QE</span>
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-semibold">
                      Periodic Exam
                    </div>
                  </button>
                </div>
              </div>

              {/* Assessment Title */}
              <div>
                <label className="ui-label tabular-nums text-slate-600 dark:text-slate-500">
                  Assessment Title
                </label>
                <input aria-label="Assessment title"
                  type="text"
                  required
                  placeholder="e.g. Quiz 1, PT2: Science Experiment"
                  value={editAssName}
                  onChange={(e) => setEditAssName(e.target.value)}
                  className="ui-field mt-1"
                />
              </div>

              {/* Highest Possible Score (HPS) with quick score chips */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="ui-label tabular-nums text-slate-600 dark:text-slate-400">
                    Highest Possible Score (HPS / Max) *
                  </label>
                  <div className="flex items-center gap-1">
                    {[10, 15, 20, 25, 30, 50, 100].map(pts => (
                      <button
                        key={pts}
                        type="button"
                        onClick={() => setEditAssPerfectScore(pts)}
                        className={`text-sm tabular-nums font-semibold px-1.5 py-0.5 rounded cursor-pointer transition-colors ${editAssPerfectScore === pts
                          ? "bg-slate-600 text-white"
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                          }`}
                      >
                        {pts} pts
                      </button>
                    ))}
                  </div>
                </div>
                <input aria-label="Highest possible score"
                  type="number"
                  required
                  min={1}
                  max={1000}
                  value={editAssPerfectScore}
                  onChange={(e) => setEditAssPerfectScore(parseInt(e.target.value) || 1)}
                  className="ui-field mt-1"
                />
                <p className="text-pretty text-sm text-slate-600 dark:text-slate-500 mt-1">
                  Changing HPS instantly recalculates percentage scores (P.S.) and weighted scores (W.S.) across all students.
                </p>
              </div>

              {/* Date & Optional Description */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="ui-label tabular-nums text-slate-600 dark:text-slate-500">
                    Conduct Date (Optional)
                  </label>
                  <input aria-label="Assessment date"
                    type="date"
                    value={editAssDate}
                    onChange={(e) => setEditAssDate(e.target.value)}
                    className="ui-field mt-1"
                  />
                </div>
                <div>
                  <label className="ui-label tabular-nums text-slate-600 dark:text-slate-500">
                    Notes / Description (Optional)
                  </label>
                  <input aria-label="Assessment description"
                    type="text"
                    placeholder="Brief notes..."
                    value={editAssDescription}
                    onChange={(e) => setEditAssDescription(e.target.value)}
                    className="ui-field mt-1"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="submit"
                  className="ui-button-primary flex-1"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Save Changes</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditingAssessmentModal(null)}
                  className="ui-button"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------
          CUSTOM ALERT DIALOG OVERLAY (IFrame-Safe)
          -------------------------------------------------------- */}
      {customAlert && customAlert.isOpen && (
        <div className="ui-dialog-overlay">
          <div role="dialog" aria-modal="true" aria-label="Notification" className="ui-dialog max-w-sm block overflow-y-auto p-4 sm:p-6 space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-900">
              {customAlert.type === 'success' ? (
                <Sparkles className="h-6 w-6 text-emerald-500" />
              ) : customAlert.type === 'error' ? (
                <AlertCircle className="h-6 w-6 text-rose-500" />
              ) : (
                <HelpCircle className="h-6 w-6 text-slate-500" />
              )}
            </div>

            <div className="space-y-1.5">
              <h3 className="ui-section-title text-balance">{customAlert.title}</h3>
              <p className="text-pretty text-sm text-slate-500 dark:text-slate-400 font-semibold leading-relaxed whitespace-pre-line">{customAlert.message}</p>
            </div>

            <button
              type="button"
              onClick={() => setCustomAlert(null)}
              className="ui-button w-full"
            >
              Okay, Understood
            </button>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------
          CUSTOM CONFIRM DIALOG OVERLAY (IFrame-Safe)
          -------------------------------------------------------- */}
      {customConfirm && customConfirm.isOpen && (
        <div className="ui-dialog-overlay">
          <div role="alertdialog" aria-modal="true" aria-label="Confirm action" className="ui-dialog max-w-sm block overflow-y-auto p-4 sm:p-6 space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-900">
              <AlertCircle className="h-6 w-6 text-slate-500" />
            </div>

            <div className="space-y-1.5">
              <h3 className="ui-section-title text-balance">{customConfirm.title}</h3>
              <p className="text-pretty text-sm text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">{customConfirm.message}</p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  customConfirm.onConfirm();
                  setCustomConfirm(null);
                }}
                className="ui-button flex-1"
              >
                Yes, Execute
              </button>
              <button
                type="button"
                onClick={() => setCustomConfirm(null)}
                className="ui-button"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {isExcelExportOpen && activeProject && (
        <TeacherExcelExportModal
          project={activeProject}
          onClose={() => setIsExcelExportOpen(false)}
        />
      )}

      {isRestoreModalOpen && activeProject && (
        <GradebookRestoreModal
          project={activeProject}
          onClose={() => setIsRestoreModalOpen(false)}
          onRestored={() => {
            setUndoStack([]);
            setRedoStack([]);
          }}
        />
      )}

      {/* ─── Component Reassessment Settings Modal ─── */}
      {showReassessmentSettingsModal && activeProject && (() => {
        const current = activeProject.reassessmentSettings ?? { enabled: false, masteryThreshold: 75, interventionThreshold: 50, policy: 'Average' as const };
        return (
          <div className="ui-dialog-overlay">
            <div role="dialog" aria-modal="true" aria-label="Component Reassessment Settings" className="ui-dialog max-w-md block overflow-y-auto p-4 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-amber-500" />
                  <h3 className="ui-section-title text-balance">Component Reassessment Settings</h3>
                </div>
                <button aria-label="Close dialog" onClick={() => setShowReassessmentSettingsModal(false)} className="ui-icon-button"><X className="h-4 w-4" /></button>
              </div>

              <p className="text-pretty text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Configure mastery-based component reassessment for this grading project. Original scores are never overwritten. Effective scores are computed dynamically.
              </p>

              <div className="space-y-4">
                {/* Enable / Disable */}
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div>
                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">Enable Component Reassessment</div>
                    <div className="text-sm text-slate-500 mt-0.5">Unlocks reassessment for individual assessments in this project</div>
                  </div>
                  <button
                    onClick={() => updateReassessmentSettingsInActive({ ...current, enabled: !current.enabled })}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${current.enabled ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                  >
                    <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 ${current.enabled ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </div>

                {current.enabled && (
                  <>
                    {/* Mastery Threshold */}
                    <div className="space-y-1">
                      <label className="ui-label tabular-nums text-slate-600">
                        Mastery Threshold: <strong className="text-amber-600">{current.masteryThreshold}%</strong>
                      </label>
                      <input aria-label="Mastery threshold (%)"
                        type="range" min={50} max={100} step={5}
                        value={current.masteryThreshold}
                        onChange={e => updateReassessmentSettingsInActive({ ...current, masteryThreshold: +e.target.value })}
                        className="w-full accent-amber-500"
                      />
                      <div className="text-sm text-slate-600">Students scoring below this threshold are eligible for reassessment.</div>
                    </div>

                    {/* Intervention Threshold */}
                    <div className="space-y-1">
                      <label className="ui-label tabular-nums text-slate-600">
                        Class Intervention Threshold: <strong className="text-rose-600">{current.interventionThreshold}%</strong>
                      </label>
                      <input aria-label="Class intervention threshold (%)"
                        type="range" min={20} max={100} step={5}
                        value={current.interventionThreshold}
                        onChange={e => updateReassessmentSettingsInActive({ ...current, interventionThreshold: +e.target.value })}
                        className="w-full accent-rose-500"
                      />
                      <div className="text-sm text-slate-600">When this % of students fail mastery, a reteaching recommendation is shown.</div>
                    </div>

                    {/* Computation Policy */}
                    <div className="space-y-1">
                      <label className="ui-label tabular-nums text-slate-600">Effective Score Policy</label>
                      <div className="flex flex-col gap-1.5">
                        {(['Average', 'Highest', 'Replacement'] as const).map(p => (
                          <button
                            key={p}
                            onClick={() => updateReassessmentSettingsInActive({ ...current, policy: p })}
                            className={`w-full text-left px-3 py-2 rounded-lg border text-sm font-semibold cursor-pointer ${current.policy === p
                              ? 'bg-amber-50 border-amber-300 text-amber-800 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-300'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-amber-300'
                              }`}
                          >
                            <span className="font-semibold">{p}</span>
                            <span className="text-sm ml-2 opacity-70">
                              {p === 'Average' ? '(Original + Reassessment) ÷ 2' : p === 'Highest' ? 'max(Original, Reassessment)' : 'Replace with Reassessment score'}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Remove All Reassessment Data */}
                    <button
                      onClick={() => setShowClearReassessmentConfirm(true)}
                      className="ui-button-danger w-full"
                    >
                      Remove All Reassessment Data for This Quarter
                    </button>
                  </>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setShowReassessmentSettingsModal(false)}
                  className="ui-button"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ─── SHS Custom Weights Modal ─── */}
      {shsCustomModalOpen && activeProject && (() => {
        const customTotal = shsCustomWW + shsCustomPT + shsCustomQA;
        const isValid = customTotal === 100;
        return (
          <div className="ui-dialog-overlay">
            <div role="dialog" aria-modal="true" aria-label="Custom SHS Weights" className="ui-dialog max-w-sm block overflow-y-auto p-4 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="ui-section-title text-balance">Custom SHS Weights</h3>
                    <p className="text-pretty text-sm text-slate-600 font-medium">Manual WW %, PT %, and QA % Setup</p>
                  </div>
                </div>
                <button aria-label="Close dialog"
                  type="button"
                  onClick={() => setShsCustomModalOpen(false)}
                  className="ui-icon-button"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950 rounded-xl p-3.5 border border-slate-200 dark:border-slate-900 space-y-3">
                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="ui-label tabular-nums text-slate-500 dark:text-slate-400 block mb-1">WW %</label>
                    <input aria-label="Written works weight (%)"
                      type="number"
                      min={0}
                      max={100}
                      value={shsCustomWW}
                      onChange={(e) => setShsCustomWW(parseInt(e.target.value) || 0)}
                      className="ui-field text-center"
                    />
                    <span className="text-sm text-slate-600 block text-center mt-0.5">Written Work</span>
                  </div>

                  <div>
                    <label className="ui-label tabular-nums text-slate-500 dark:text-slate-400 block mb-1">PT %</label>
                    <input aria-label="Performance tasks weight (%)"
                      type="number"
                      min={0}
                      max={100}
                      value={shsCustomPT}
                      onChange={(e) => setShsCustomPT(parseInt(e.target.value) || 0)}
                      className="ui-field text-center"
                    />
                    <span className="text-sm text-slate-600 block text-center mt-0.5">Performance</span>
                  </div>

                  <div>
                    <label className="ui-label tabular-nums text-slate-500 dark:text-slate-400 block mb-1">QA %</label>
                    <input aria-label="Quarterly assessment weight (%)"
                      type="number"
                      min={0}
                      max={100}
                      value={shsCustomQA}
                      onChange={(e) => setShsCustomQA(parseInt(e.target.value) || 0)}
                      className="ui-field text-center"
                    />
                    <span className="text-sm text-slate-600 block text-center mt-0.5">Quarter Exam</span>
                  </div>
                </div>

                <div className={`text-sm tabular-nums font-semibold text-center py-1.5 rounded-lg border ${isValid ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/30' : 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/30'}`}>
                  Total: {customTotal}% {isValid ? '✓ Valid (100%)' : `— Must equal 100% (${100 - customTotal > 0 ? '+' : ''}${100 - customTotal}%)`}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={!isValid}
                  onClick={() => {
                    if (!isValid) return;
                    saveProject({
                      ...activeProject,
                      assessmentProfileId: 'custom',
                      customWeights: {
                        wow: shsCustomWW / 100,
                        ppt: shsCustomPT / 100,
                        qste: shsCustomQA / 100
                      }
                    });
                    globalToast.show('success', `Custom weights applied (${shsCustomWW}% WW / ${shsCustomPT}% PT / ${shsCustomQA}% QA)!`, 'Weights Updated');
                    setShsCustomModalOpen(false);
                  }}
                  className="ui-button-primary flex-1"
                >
                  Save & Apply Weights
                </button>
                <button
                  type="button"
                  onClick={() => setShsCustomModalOpen(false)}
                  className="ui-button"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ─── 1. Teacher & Class Info Edit Modal ─── */}
      {showTeacherInfoModal && activeProject && (
        <div className="ui-dialog-overlay">
          <div role="dialog" aria-modal="true" aria-label="Edit Teacher & Class Info" className="ui-dialog max-w-lg block overflow-y-auto p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl">
                  <Edit3 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="ui-section-title text-balance">Edit Teacher & Class Info</h3>
                  <p className="text-pretty text-sm text-slate-600 font-medium">Update instructor and subject credentials inside gradebook</p>
                </div>
              </div>
              <button aria-label="Close dialog"
                type="button"
                onClick={() => setShowTeacherInfoModal(false)}
                className="ui-icon-button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="ui-label tabular-nums text-slate-500 block mb-1">Teacher / Instructor Name</label>
                <input aria-label="Teacher name"
                  type="text"
                  value={editTeacherName}
                  onChange={(e) => setEditTeacherName(e.target.value)}
                  placeholder="e.g. Maria Santos, LPT"
                  className="ui-field"
                />
              </div>

              <div>
                <label className="ui-label tabular-nums text-slate-500 block mb-1">School Name</label>
                <input aria-label="School name"
                  type="text"
                  value={editSchoolName}
                  onChange={(e) => setEditSchoolName(e.target.value)}
                  placeholder="e.g. San Roque National High School"
                  className="ui-field"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="ui-label tabular-nums text-slate-500 block mb-1">Subject Name</label>
                  <input aria-label="Subject name"
                    type="text"
                    value={editSubjectName}
                    onChange={(e) => setEditSubjectName(e.target.value)}
                    className="ui-field"
                  />
                </div>

                <div>
                  <label className="ui-label tabular-nums text-slate-500 block mb-1">Section</label>
                  <input aria-label="Section"
                    type="text"
                    value={editSectionName}
                    onChange={(e) => setEditSectionName(e.target.value)}
                    className="ui-field"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="ui-label tabular-nums text-slate-500 block mb-1">Grade Level</label>
                  <input aria-label="Grade level"
                    type="text"
                    value={editGradeLevel}
                    onChange={(e) => setEditGradeLevel(e.target.value)}
                    className="ui-field"
                  />
                </div>

                <div>
                  <label className="ui-label tabular-nums text-slate-500 block mb-1">Passing Grade</label>
                  <input aria-label="Passing grade"
                    type="number"
                    value={editPassingGrade}
                    onChange={(e) => setEditPassingGrade(parseInt(e.target.value) || 75)}
                    className="ui-field"
                  />
                </div>
              </div>

              <div>
                <label className="ui-label tabular-nums text-slate-500 block mb-1">DepEd Transmutation Policy</label>
                <select aria-label="DepEd transmutation policy"
                  value={editDepedPolicy}
                  onChange={(e) => setEditDepedPolicy(e.target.value as '2015' | '2027')}
                  className="ui-field"
                >
                  <option value="2015">DepEd Order No. 8, s. 2015 (Standard Transmutation)</option>
                  <option value="2027">MATATAG Transmutation (DepEd Order 2027/2028)</option>
                </select>
              </div>

              {/* Subject Component Weights Edit */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <label className="ui-label tabular-nums text-slate-500">
                    Subject Component Weights (%)
                  </label>
                  <span
                    className={`text-sm tabular-nums font-semibold px-2 py-0.5 rounded-md ${
                      editWeightWW + editWeightPT + editWeightQE === 100
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                        : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                    }`}
                  >
                    Total: {editWeightWW + editWeightPT + editWeightQE}%
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="ui-label tabular-nums text-slate-600 block mb-0.5">WW (%)</label>
                    <input aria-label="Written works weight (%)"
                      type="number"
                      min={0}
                      max={100}
                      value={editWeightWW}
                      onChange={(e) => setEditWeightWW(parseInt(e.target.value) || 0)}
                      className="ui-field text-center"
                    />
                  </div>

                  <div>
                    <label className="ui-label tabular-nums text-slate-600 block mb-0.5">PT (%)</label>
                    <input aria-label="Performance tasks weight (%)"
                      type="number"
                      min={0}
                      max={100}
                      value={editWeightPT}
                      onChange={(e) => setEditWeightPT(parseInt(e.target.value) || 0)}
                      className="ui-field text-center"
                    />
                  </div>

                  <div>
                    <label className="ui-label tabular-nums text-slate-600 block mb-0.5">QE (%)</label>
                    <input aria-label="Quarterly exam weight (%)"
                      type="number"
                      min={0}
                      max={100}
                      value={editWeightQE}
                      onChange={(e) => setEditWeightQE(parseInt(e.target.value) || 0)}
                      className="ui-field text-center"
                    />
                  </div>
                </div>

                {/* Quick Preset buttons */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="text-sm text-slate-600 font-medium self-center">Presets:</span>
                  <button
                    type="button"
                    onClick={() => { setEditWeightWW(20); setEditWeightPT(50); setEditWeightQE(30); }}
                    className="ui-button"
                  >
                    20-50-30 (Core: Math/Sci/Eng/Fil/AP/EsP)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEditWeightWW(20); setEditWeightPT(60); setEditWeightQE(20); }}
                    className="ui-button"
                  >
                    20-60-20 (EPP/TLE/MAPEH)
                  </button>
                </div>
              </div>

              {/* Quarter Grade & Assessment Migration Tool */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 rounded-xl space-y-2.5">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-amber-500 text-white rounded-lg">
                      <ArrowRightLeft className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <h4 className="ui-section-title text-balance flex items-center gap-1.5">
                        Migrate Quarter Scores & Grades
                        <span className="text-sm font-normal lowercase bg-amber-200/60 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 rounded tabular-nums">
                          recovery tool
                        </span>
                      </h4>
                      <p className="text-pretty text-sm text-slate-500 dark:text-slate-400">
                        Accidentally entered grades in the wrong quarter? Move all assessments and student scores seamlessly.
                      </p>
                    </div>
                  </div>

                  {(() => {
                    const allQKeys = Object.keys(activeProject.quarters || {});
                    const srcData = activeProject.quarters[migrateSourceQuarter];
                    const srcAssessmentsCount = srcData?.assessments?.length || 0;
                    const srcScoresCount = Object.values(srcData?.scores || {}).reduce((acc, sc) => acc + Object.keys(sc || {}).length, 0);
                    const tgtData = activeProject.quarters[migrateTargetQuarter];
                    const tgtAssessmentsCount = tgtData?.assessments?.length || 0;

                    return (
                      <div className="space-y-2 pt-1">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="ui-label tabular-nums text-slate-500 block mb-0.5">
                              From (Source Quarter)
                            </label>
                            <select aria-label="Source quarter"
                              value={migrateSourceQuarter}
                              onChange={(e) => {
                                setMigrateSourceQuarter(e.target.value);
                                setShowMigrateConfirm(false);
                              }}
                              className="ui-field"
                            >
                              {allQKeys.map(q => {
                                const qAssCount = activeProject.quarters[q]?.assessments?.length || 0;
                                return (
                                  <option key={`src-${q}`} value={q}>
                                    {q} ({qAssCount} col{qAssCount !== 1 ? 's' : ''})
                                  </option>
                                );
                              })}
                            </select>
                          </div>

                          <div>
                            <label className="ui-label tabular-nums text-slate-500 block mb-0.5">
                              To (Destination Quarter)
                            </label>
                            <select aria-label="Destination quarter"
                              value={migrateTargetQuarter}
                              onChange={(e) => {
                                setMigrateTargetQuarter(e.target.value);
                                setShowMigrateConfirm(false);
                              }}
                              className="ui-field"
                            >
                              {allQKeys.map(q => (
                                <option key={`tgt-${q}`} value={q}>
                                  {q}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Source Status & Warning */}
                        <div className="text-sm text-slate-600 dark:text-slate-400 bg-white/70 dark:bg-slate-900/60 p-2 rounded-xl border border-slate-200/60 dark:border-slate-800">
                          <div className="flex justify-between items-center tabular-nums text-sm">
                            <span>Found in <strong className="text-amber-700 dark:text-amber-400">{migrateSourceQuarter}</strong>:</span>
                            <span className="font-medium">{srcAssessmentsCount} columns · {srcScoresCount} recorded scores</span>
                          </div>
                          {tgtAssessmentsCount > 0 && (
                            <div className="text-rose-600 dark:text-rose-400 font-medium text-sm mt-1">
                              ⚠️ Warning: {migrateTargetQuarter} currently has {tgtAssessmentsCount} assessment column(s). Moving will overwrite them.
                            </div>
                          )}
                        </div>

                        <label className="flex items-center gap-2 cursor-pointer pt-0.5">
                          <input
                            type="checkbox"
                            checked={migrateClearSource}
                            onChange={(e) => setMigrateClearSource(e.target.checked)}
                            className="rounded border-slate-300 text-slate-600 focus:ring-slate-500 h-3.5 w-3.5"
                          />
                          <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                            Clear <strong className="text-slate-800 dark:text-slate-200">{migrateSourceQuarter}</strong> after migration (Move instead of Copy)
                          </span>
                        </label>

                        {showMigrateConfirm ? (
                          <div className="p-2.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 rounded-xl space-y-2">
                            <p className="text-pretty text-sm font-medium text-rose-800 dark:text-rose-300">
                              Confirm: Transfer all scores from {migrateSourceQuarter} into {migrateTargetQuarter}?
                            </p>
                            {migrateClearSource && (
                              <>
                                <p className="text-pretty text-sm font-semibold text-rose-700 dark:text-rose-400 leading-relaxed">
                                  "Clear after migration" is ON — every score in {migrateSourceQuarter} will be erased after the transfer.
                                </p>
                                <TypeToConfirmField
                                  value={migrateConfirmText}
                                  onChange={setMigrateConfirmText}
                                  inputId="quarter-migrate-confirm"
                                />
                              </>
                            )}
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  if (migrateClearSource && migrateConfirmText.trim() !== 'INITIATE') return;
                                  if (migrateSourceQuarter === migrateTargetQuarter) {
                                    globalToast.show('error', 'Source and target quarter cannot be the same.', 'Migration Error');
                                    return;
                                  }
                                  const success = migrateQuarterData(migrateSourceQuarter, migrateTargetQuarter, migrateClearSource);
                                  if (success) {
                                    globalToast.show('success', `Successfully transferred grades from ${migrateSourceQuarter} to ${migrateTargetQuarter}!`, 'Quarters Migrated');
                                    setShowMigrateConfirm(false);
                                    setMigrateConfirmText('');
                                    setShowTeacherInfoModal(false);
                                  } else {
                                    globalToast.show('error', 'Failed to migrate quarter data. Please verify the quarters.', 'Migration Failed');
                                  }
                                }}
                                disabled={migrateClearSource && migrateConfirmText.trim() !== 'INITIATE'}
                                className="ui-button-danger flex-1"
                              >
                                <RefreshCw className="h-3 w-3" />
                                Yes, Transfer Now
                              </button>
                              <button
                                type="button"
                                onClick={() => { setShowMigrateConfirm(false); setMigrateConfirmText(''); }}
                                className="ui-button"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={migrateSourceQuarter === migrateTargetQuarter || srcAssessmentsCount === 0}
                            onClick={() => { setMigrateConfirmText(''); setShowMigrateConfirm(true); }}
                            className="ui-button w-full"
                          >
                            <ArrowRightLeft className="h-3.5 w-3.5" />
                            Transfer Scores ({migrateSourceQuarter} → {migrateTargetQuarter})
                          </button>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  const totalWeight = editWeightWW + editWeightPT + editWeightQE;
                  if (totalWeight !== 100) {
                    globalToast.show('error', `Component weights must add up to exactly 100% (currently ${totalWeight}%).`, 'Invalid Weights');
                    return;
                  }

                  updateProjectTeacherInfo({
                    teacherName: editTeacherName.trim(),
                    schoolName: editSchoolName.trim(),
                    subject: editSubjectName.trim(),
                    section: editSectionName.trim(),
                    gradeLevel: editGradeLevel.trim(),
                    passingGrade: editPassingGrade,
                    depedPolicy: editDepedPolicy,
                    customWeights: {
                      wow: editWeightWW / 100,
                      ppt: editWeightPT / 100,
                      qste: editWeightQE / 100
                    }
                  });
                  globalToast.show('success', 'Teacher credentials and subject weights updated successfully!', 'Saved');
                  setShowTeacherInfoModal(false);
                }}
                className="ui-button-primary flex-1"
              >
                Save Teacher Details
              </button>
              <button
                type="button"
                onClick={() => setShowTeacherInfoModal(false)}
                className="ui-button"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 2. Teacher-Only Grade Adjustment Input Dialog ─── */}
      {editingAdjustmentStudent && activeProject && (() => {
        const rawGrade = editingAdjustmentStudent.computedGrade;
        const diff = targetAdjustedGrade - rawGrade;
        const weights = getSubjectWeights(
          activeProject.subject,
          globalSettings.subjects,
          activeProject.workspace,
          activeProject.assessmentProfileId,
          activeProject.customWeights
        );
        const dist = computeGradeAdjustmentDistribution(diff, weights);

        return (
          <div className="ui-dialog-overlay">
            <div role="dialog" aria-modal="true" aria-label="Teacher Grade Adjustment" className="ui-dialog max-w-md block overflow-y-auto p-4 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 rounded-xl ring-2 ring-slate-500/30">
                    <Sliders className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="ui-section-title text-balance">Teacher Grade Adjustment</h3>
                    <p className="text-pretty text-sm text-slate-600 dark:text-slate-400 font-medium flex items-center gap-1">
                      <Sparkles className="h-3 w-3" /> Adjusting Learner
                    </p>
                  </div>
                </div>
                <button aria-label="Close dialog"
                  type="button"
                  onClick={() => setEditingAdjustmentStudent(null)}
                  className="ui-icon-button"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Prominent Target Student Card */}
              <div className="bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-xl p-3 flex items-center justify-between ring-1 ring-slate-500/20">
                <div className="space-y-0.5">
                  <div className="text-sm tabular-nums font-medium text-slate-600 dark:text-slate-400">Target Student</div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{editingAdjustmentStudent.name}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm tabular-nums font-medium text-slate-600">Raw Grade</div>
                  <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 tabular-nums">{rawGrade}</div>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-900 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500 font-semibold">Original Computed Grade:</span>
                  <span className="tabular-nums font-semibold text-slate-800 dark:text-slate-200 text-sm bg-slate-200/60 dark:bg-slate-800 px-2.5 py-0.5 rounded-lg">
                    {rawGrade}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="ui-label tabular-nums text-slate-600 dark:text-slate-400 block">
                    Desired Adjusted Quarterly Grade (e.g., {rawGrade} → {rawGrade + 1})
                  </label>
                  <input aria-label="Adjusted quarterly grade"
                    type="number"
                    min={60}
                    max={100}
                    value={targetAdjustedGrade}
                    onChange={(e) => setTargetAdjustedGrade(parseInt(e.target.value) || 0)}
                    className="ui-field text-center"
                  />
                </div>

                {/* Live Distribution Breakdown */}
                <div className="p-3 bg-slate-50/70 dark:bg-slate-950/30 rounded-xl border border-slate-200/60 dark:border-slate-800/40 space-y-2">
                  <div className="flex items-center justify-between text-sm font-semibold text-slate-900 dark:text-slate-200">
                    <span>Grade Difference:</span>
                    <span className="tabular-nums text-sm px-2 py-0.5 rounded bg-slate-200/80 dark:bg-slate-900/60">
                      {diff >= 0 ? `+${diff}` : diff}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-sm tabular-nums font-medium pt-1 border-t border-slate-200/50 dark:border-slate-800/40">
                    <div className="p-1.5 bg-slate-100/50 dark:bg-slate-900/40 rounded-lg">
                      <span className="block text-sm text-slate-600">WW (+{Math.round(weights.wow * 100)}%)</span>
                      <span className="text-slate-900 dark:text-slate-200 font-semibold">{(dist?.wwAdjustment ?? 0) >= 0 ? `+${(dist?.wwAdjustment ?? 0).toFixed(2)}` : (dist?.wwAdjustment ?? 0).toFixed(2)} pts</span>
                    </div>
                    <div className="p-1.5 bg-slate-100/50 dark:bg-slate-900/40 rounded-lg">
                      <span className="block text-sm text-slate-600">PT (+{Math.round(weights.ppt * 100)}%)</span>
                      <span className="text-slate-900 dark:text-slate-200 font-semibold">{(dist?.ptAdjustment ?? 0) >= 0 ? `+${(dist?.ptAdjustment ?? 0).toFixed(2)}` : (dist?.ptAdjustment ?? 0).toFixed(2)} pts</span>
                    </div>
                    <div className="p-1.5 bg-slate-100/50 dark:bg-slate-900/40 rounded-lg">
                      <span className="block text-sm text-slate-600">QE (+{Math.round(weights.qste * 100)}%)</span>
                      <span className="text-slate-900 dark:text-slate-200 font-semibold">{(dist?.qeAdjustment ?? 0) >= 0 ? `+${(dist?.qeAdjustment ?? 0).toFixed(2)}` : (dist?.qeAdjustment ?? 0).toFixed(2)} pts</span>
                    </div>
                  </div>
                  <p className="text-pretty text-sm text-slate-500 leading-tight">
                    * Raw score entries are 100% preserved. Additional points are distributed proportionally according to component weights and logged for DepEd auditing.
                  </p>
                </div>

                <div>
                  <label className="ui-label tabular-nums text-slate-500 block mb-1">Audit Log Reason</label>
                  <input aria-label="Audit log reason"
                    type="text"
                    value={adjustmentReason}
                    onChange={(e) => setAdjustmentReason(e.target.value)}
                    placeholder="e.g. Remediation activity & special merit"
                    className="ui-field"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const rawGrade = editingAdjustmentStudent.computedGrade;
                    const diff = targetAdjustedGrade - rawGrade;
                    const weights = getSubjectWeights(
                      activeProject.subject,
                      globalSettings.subjects,
                      activeProject.workspace,
                      activeProject.assessmentProfileId,
                      activeProject.customWeights
                    );
                    const dist = computeGradeAdjustmentDistribution(diff, weights);
                    const reason = adjustmentReason.trim() || 'Performance merit and remediation';
                    const now = new Date();
                    const entry: import('../types').GradeAdjustmentEntry = {
                      studentId: editingAdjustmentStudent.id,
                      studentName: editingAdjustmentStudent.name,
                      originalGrade: rawGrade,
                      adjustedGrade: targetAdjustedGrade,
                      difference: diff,
                      wwAdjustment: dist.wwAdjustment,
                      ptAdjustment: dist.ptAdjustment,
                      qeAdjustment: dist.qeAdjustment,
                      reason,
                      teacherName: activeProject.teacherName || 'Teacher',
                      subject: activeProject.subject || '',
                      timestamp: now.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: '2-digit' })
                        + ' ' + now.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })
                    };
                    setGradeAdjustmentForStudent(activeQuarterId, editingAdjustmentStudent.id, entry);
                    setEditingAdjustmentStudent(null);
                  }}
                  className="ui-button-primary flex-1"
                >
                  Apply Grade Adjustment
                </button>
                <button
                  type="button"
                  onClick={() => setEditingAdjustmentStudent(null)}
                  className="ui-button"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ─── 3. Grade Adjustment Audit Log Modal ─── */}
      {showAdjustmentLogModal && activeProject && (() => {
        const adjustments = Object.values(activeQuarterData?.adjustments || {});
        return (
          <div className="ui-dialog-overlay">
            <div role="dialog" aria-modal="true" aria-label="Grade Adjustment Audit Log" className="ui-dialog max-w-2xl block overflow-y-auto p-4 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-slate-50 dark:bg-slate-950/40 text-slate-600 dark:text-slate-400 rounded-xl">
                    <Sliders className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="ui-section-title text-balance">Grade Adjustment Audit Log</h3>
                    <p className="text-pretty text-sm text-slate-600 font-medium">{activeProject.subject} • {activeQuarterId} ({adjustments.length} records)</p>
                  </div>
                </div>
                <button aria-label="Close dialog"
                  type="button"
                  onClick={() => setShowAdjustmentLogModal(false)}
                  className="ui-icon-button"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {adjustments.length === 0 ? (
                <div className="py-12 text-center text-slate-600 text-sm font-semibold">
                  No grade adjustments have been recorded for {activeQuarterId}.
                </div>
              ) : (
                <div className="max-h-80 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <table className="tabular-nums w-full text-left text-xs">
                    <thead className="bg-slate-50/70 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-900/30 text-xs tabular-nums text-slate-800 dark:text-slate-300 font-semibold">
                      <tr>
                        <th className="py-2.5 px-3">Student</th>
                        <th className="py-2.5 px-2 text-center">Orig</th>
                        <th className="py-2.5 px-2 text-center">Adjusted</th>
                        <th className="py-2.5 px-2 text-center">Δ</th>
                        <th className="py-2.5 px-2">WW/PT/QE Added</th>
                        <th className="py-2.5 px-3">Reason</th>
                        <th className="py-2.5 px-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
                      {adjustments.map((entry) => {
                        const st = activeProject.students.find(s => s.id === entry.studentId);
                        return (
                          <tr key={entry.studentId} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 text-xs">
                            <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">
                              {st?.name || 'Unknown Student'}
                              <div className="text-xs text-slate-600 tabular-nums">{entry.timestamp}</div>
                            </td>
                            <td className="py-2.5 px-2 text-center tabular-nums font-medium text-slate-500">
                              {entry.originalGrade}
                            </td>
                            <td className="py-2.5 px-2 text-center tabular-nums font-semibold text-slate-700 dark:text-slate-400">
                              {entry.adjustedGrade}
                            </td>
                            <td className="py-2.5 px-2 text-center tabular-nums font-medium text-slate-600">
                              {entry.difference >= 0 ? `+${entry.difference}` : entry.difference}
                            </td>
                            <td className="py-2.5 px-2 tabular-nums text-xs text-slate-600 dark:text-slate-400">
                              +{entry.wwAdjustment} / +{entry.ptAdjustment} / +{entry.qeAdjustment}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 text-xs max-w-[140px] truncate" title={entry.reason}>
                              {entry.reason}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <button
                                onClick={() => removeGradeAdjustmentForStudent(activeQuarterId, entry.studentId)}
                                className="ui-button-danger"
                              >
                                Revert
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdjustmentLogModal(false)}
                  className="ui-button"
                >
                  Close Log
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ─── 4. Smart Excel Class Record Import Modal ─── */}
      {showExcelImportModal && activeProject && (
        <div className="ui-dialog-overlay">
          <div role="dialog" aria-modal="true" aria-label="Smart Excel Class Record Import" className="ui-dialog max-w-xl block overflow-y-auto p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
                  <FileUp className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="ui-section-title text-balance">Smart Excel Class Record Import</h3>
                  <p className="text-pretty text-sm text-slate-600 font-medium">Auto-detect Written Works, Performance Tasks, and Exam columns from Excel</p>
                </div>
              </div>
              <button aria-label="Close dialog"
                type="button"
                onClick={() => {
                  setShowExcelImportModal(false);
                  setParsedExcelData(null);
                  setExcelImportFile(null);
                  setExcelImportError(null);
                }}
                className="ui-icon-button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {!parsedExcelData ? (
              <div className="space-y-4">
                <div className="border-2 border-dashed border-emerald-200 dark:border-emerald-800/80 rounded-xl p-8 text-center bg-emerald-50/20 dark:bg-emerald-950/10 space-y-3">
                  <FileSpreadsheet className="h-10 w-10 text-emerald-600 dark:text-emerald-400 mx-auto" />
                  <div>
                    <p className="text-pretty text-sm font-medium text-slate-800 dark:text-slate-200">Select teacher class record spreadsheet</p>
                    <p className="text-pretty text-sm text-slate-600 mt-0.5">Supports .xlsx, .xls DepEd Electronic Class Records</p>
                  </div>
                  <label className="inline-block px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl cursor-pointer">
                    Choose Excel File
                    <input aria-label="Choose Excel class record"
                      type="file"
                      accept=".xlsx, .xls"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setExcelImportFile(file);
                        setIsParsingExcel(true);
                        setExcelImportError(null);
                        try {
                          const result = await parseTeacherExcelRecords(file);
                          setParsedExcelData(result);
                        } catch (err: any) {
                          setExcelImportError(err.message || 'Failed to parse Excel file');
                        } finally {
                          setIsParsingExcel(false);
                        }
                      }}
                    />
                  </label>
                </div>

                {isParsingExcel && (
                  <div className="text-center py-4 text-sm font-medium text-emerald-600">
                    Scanning sheet structure, recognizing assessment headers, and parsing scores...
                  </div>
                )}

                {excelImportError && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 text-rose-700 dark:text-rose-400 text-sm rounded-xl font-medium">
                    {excelImportError}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-900 space-y-3 text-sm">
                  <div className="flex items-center justify-between font-semibold text-emerald-700 dark:text-emerald-400">
                    <span>✓ File Analyzed Successfully</span>
                    <span className="tabular-nums text-sm bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded">{excelImportFile?.name}</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center tabular-nums">
                    <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                      <span className="text-sm text-slate-600 block">Learners</span>
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{parsedExcelData.students.length}</span>
                    </div>
                    <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                      <span className="text-sm text-slate-500 block">WW Columns</span>
                      <span className="text-sm font-semibold text-slate-600">{parsedExcelData.assessments.filter(a => a.category === 'WOW').length}</span>
                    </div>
                    <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                      <span className="text-sm text-slate-500 block">PT Columns</span>
                      <span className="text-sm font-semibold text-slate-600">{parsedExcelData.assessments.filter(a => a.category === 'PPT').length}</span>
                    </div>
                    <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                      <span className="text-sm text-emerald-500 block">QE Column</span>
                      <span className="text-sm font-semibold text-emerald-600">{parsedExcelData.assessments.filter(a => a.category === 'QSTE').length}</span>
                    </div>
                  </div>

                  <div className="space-y-1 text-sm text-slate-600 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800 pt-2">
                    {parsedExcelData.schoolName && (
                      <div>School: <strong>{parsedExcelData.schoolName}</strong></div>
                    )}
                    <div>
                      Subject: <strong>{parsedExcelData.subject || 'Not detected'}</strong>
                      {' | '}Grade Level: <strong>{parsedExcelData.gradeLevel || 'Not detected'}</strong>
                      {' | '}Section: <strong>{parsedExcelData.section || 'Not detected'}</strong>
                    </div>
                    {parsedExcelData.teacherName && (
                      <div>Teacher: <strong>{parsedExcelData.teacherName}</strong></div>
                    )}
                    <div>
                      Scores will load into: <strong>{parsedExcelData.quarter && activeProject.quarters?.[parsedExcelData.quarter] ? parsedExcelData.quarter : activeQuarterId}</strong>
                      {' '}(existing assessment names and dates are kept)
                    </div>
                    {(parsedExcelData.skippedRows || 0) > 0 && (
                      <div className="text-amber-600 dark:text-amber-400 font-medium">
                        {parsedExcelData.skippedRows} row(s) skipped because the LRN was missing or not 12 digits.
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      // Load scores into the quarter named in the file when it exists in this project.
                      const targetQuarterId = parsedExcelData.quarter && activeProject.quarters?.[parsedExcelData.quarter]
                        ? parsedExcelData.quarter
                        : activeQuarterId;
                      const existingQuarter = activeProject.quarters?.[targetQuarterId] || {
                        assessments: [],
                        scores: {},
                        reassessmentScores: {}
                      };

                      // Copy roster objects so metadata can be filled without mutating state in place.
                      const newStudents: Student[] = activeProject.students.map(s => ({ ...s }));
                      const lrnToStudentId: Record<string, string> = {};

                      parsedExcelData.students.forEach(importedSt => {
                        const importedName = importedSt.name.trim().toUpperCase();
                        let existing = newStudents.find(s => (s.lrn || '').trim() === importedSt.lrn);

                        // A placeholder/demo learner may match by name and later receive its real LRN.
                        if (!existing) {
                          existing = newStudents.find(s =>
                            s.name.trim().toUpperCase() === importedName &&
                            (!s.lrn || s.lrn === '123456789123')
                          );
                        }

                        if (existing) {
                          if (!existing.lrn || existing.lrn === '123456789123') existing.lrn = importedSt.lrn;
                          if (!existing.studentNumber && importedSt.studentNumber) existing.studentNumber = importedSt.studentNumber;
                          if (!existing.sex) existing.sex = importedSt.sex;
                          lrnToStudentId[importedSt.lrn] = existing.id;
                        } else {
                          const newId = `std-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
                          newStudents.push({
                            id: newId,
                            lrn: importedSt.lrn,
                            name: importedSt.name,
                            sex: importedSt.sex,
                            studentNumber: importedSt.studentNumber,
                            status: importedSt.status || 'Active'
                          });
                          lrnToStudentId[importedSt.lrn] = newId;
                        }
                      });

                      // Merge assessment columns into the existing set: keep names, dates,
                      // descriptions, reassessment flags, and IDs; only scores are replaced.
                      const existingAssessments = existingQuarter.assessments || [];
                      const existingSorted = [...existingAssessments].sort((a, b) => a.order - b.order);
                      const categoryOrder = ['WOW', 'PPT', 'QSTE'] as const;
                      const categoryRank: Record<string, number> = { WOW: 0, PPT: 1, QSTE: 2 };
                      const importedColumns = parsedExcelData.assessments.map((a, idx) => ({ ...a, tempKey: `temp-${idx}` }));
                      const assessmentTempToId: Record<string, string> = {};
                      const mergedById = new Map(existingAssessments.map(a => [a.id, { ...a }]));
                      const importDate = new Date().toISOString().split('T')[0];
                      let addedAssessments = 0;

                      categoryOrder.forEach(category => {
                        const existingInCategory = existingSorted.filter(a => a.category === category);
                        const importedInCategory = importedColumns.filter(a => a.category === category);

                        importedInCategory.forEach((imported, idx) => {
                          const match = existingInCategory[idx];
                          if (match) {
                            mergedById.set(match.id, {
                              ...match,
                              // The source record defines its own perfect score.
                              perfectScore: imported.perfectScore > 0 ? imported.perfectScore : match.perfectScore
                            });
                            assessmentTempToId[imported.tempKey] = match.id;
                            return;
                          }

                          const newId = `ass-${Date.now()}-${category}-${idx}-${Math.random().toString(36).substring(2, 5)}`;
                          const maxOrder = existingAssessments.length > 0
                            ? Math.max(...existingAssessments.map(a => a.order))
                            : -1;
                          mergedById.set(newId, {
                            id: newId,
                            name: imported.name,
                            category,
                            perfectScore: imported.perfectScore,
                            order: maxOrder + 1 + addedAssessments,
                            date: importDate
                          });
                          assessmentTempToId[imported.tempKey] = newId;
                          addedAssessments++;
                        });
                      });

                      let mergedAssessments: Assessment[] = existingQuarter.assessments;
                      if (importedColumns.length > 0) {
                        // Renumber so new columns sit inside their category block.
                        mergedAssessments = Array.from(mergedById.values())
                          .sort((a, b) =>
                            (categoryRank[a.category] - categoryRank[b.category]) || (a.order - b.order)
                          )
                          .map((a, idx) => ({ ...a, order: idx }));
                      }

                      // Overlay imported scores onto existing scores, keyed by the stable assessment IDs.
                      const mergedScores: Record<string, Record<string, number>> = { ...existingQuarter.scores };
                      Object.entries(parsedExcelData.scores).forEach(([lrn, scoreMap]) => {
                        const studentId = lrnToStudentId[lrn];
                        if (!studentId) return;
                        const studentScores = { ...(mergedScores[studentId] || {}) };
                        Object.entries(scoreMap).forEach(([tempKey, val]) => {
                          const realAssId = assessmentTempToId[tempKey];
                          if (realAssId) {
                            studentScores[realAssId] = val;
                          }
                        });
                        mergedScores[studentId] = studentScores;
                      });

                      saveProject({
                        ...activeProject,
                        students: newStudents,
                        teacherName: parsedExcelData.teacherName || activeProject.teacherName,
                        schoolName: parsedExcelData.schoolName || activeProject.schoolName,
                        lastActiveQuarter: targetQuarterId,
                        quarters: {
                          ...activeProject.quarters,
                          [targetQuarterId]: {
                            ...existingQuarter,
                            assessments: mergedAssessments,
                            scores: mergedScores
                          }
                        }
                      });

                      const skipped = parsedExcelData.skippedRows || 0;
                      const learnerCount = Object.keys(lrnToStudentId).length;
                      globalToast.show(
                        'success',
                        `${learnerCount} learner(s) and ${parsedExcelData.assessments.length} assessment column(s) loaded into ${targetQuarterId}.` +
                        (addedAssessments > 0 ? ` ${addedAssessments} new assessment(s) added.` : ' Existing assessment names and dates were kept.') +
                        (skipped > 0 ? ` ${skipped} row(s) skipped for a missing/invalid LRN.` : ''),
                        'Excel Record Loaded'
                      );
                      setShowExcelImportModal(false);
                      setParsedExcelData(null);
                      setExcelImportFile(null);
                    }}
                    className="ui-button-primary flex-1"
                  >
                    Apply Record to Gradebook
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setParsedExcelData(null);
                      setExcelImportFile(null);
                    }}
                    className="ui-button"
                  >
                    Reselect
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Typed confirmation for bulk reassessment wipe */}
      <DangerConfirmModal
        isOpen={showClearReassessmentConfirm}
        title="Remove All Reassessment Data"
        confirmLabel="Remove Reassessment Scores"
        onClose={() => setShowClearReassessmentConfirm(false)}
        onConfirm={() => {
          if (!activeProject) return;
          const qData = activeProject.quarters[activeQuarterId];
          if (qData) {
            saveProject({
              ...activeProject,
              quarters: {
                ...activeProject.quarters,
                [activeQuarterId]: { ...qData, reassessmentScores: {} }
              }
            });
          }
          setShowClearReassessmentConfirm(false);
          setShowReassessmentSettingsModal(false);
        }}
      >
        {activeProject && (
          <>
            You are about to permanently remove every reassessment score recorded in{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {activeProject.subject} • {activeProject.gradeLevel} - {activeProject.section}
            </span>{' '}
            for <span className="font-semibold text-slate-700 dark:text-slate-200">{activeQuarterId}</span>. Original scores, final grades, and other quarters are unaffected.
          </>
        )}
      </DangerConfirmModal>

    </div>
  );
}
