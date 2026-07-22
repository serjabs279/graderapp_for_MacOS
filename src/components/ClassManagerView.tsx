import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Student, Assessment, Project, SubjectType } from '../types';
import { computeProjectStudentGrade, getSubjectWeightsLabel } from '../utils';
import { exportClassRecordPDF } from '../utils/pdfExport';
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
  X
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
    clearScoreInActive
  } = useApp();

  const activeProject = projects.find(p => p.id === activeProjectId);

  // Workspace sub-tabs
  const [activeTab, setActiveTab] = useState<TabType>('gradebook');
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  // Gradebook cell-selection reference for keyboard navigation
  const [selectedCell, setSelectedCell] = useState<{ studentId: string; assessmentId: string } | null>(null);
  const [editingScore, setEditingScore] = useState<{ studentId: string; assessmentId: string; tempValue: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Undo/Redo history stack
  const [undoStack, setUndoStack] = useState<{ studentId: string; assessmentId: string; prevVal: number | undefined }[]>([]);
  const [redoStack, setRedoStack] = useState<{ studentId: string; assessmentId: string; nextVal: number | undefined }[]>([]);

  // Search/Sort roster states
  const [studentSearch, setStudentSearch] = useState('');
  const [studentSort, setStudentSort] = useState<'name-asc' | 'name-desc' | 'lrn' | 'sex'>('name-asc');
  
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
  const [assCategory, setAssCategory] = useState<'WW' | 'PT' | 'QE'>('WW');
  const [assPerfectScore, setAssPerfectScore] = useState(20);
  const [assDate, setAssDate] = useState(new Date().toISOString().split('T')[0]);
  const [assDescription, setAssDescription] = useState('');

  // Quick Add Assessment Modal states
  const [isAddAssessmentModalOpen, setIsAddAssessmentModalOpen] = useState(false);
  const [modalAssCategory, setModalAssCategory] = useState<'WW' | 'PT' | 'QE'>('WW');
  const [modalAssName, setModalAssName] = useState('');
  const [modalAssPerfectScore, setModalAssPerfectScore] = useState<number>(20);
  const [modalAssDate, setModalAssDate] = useState('');
  const [modalAssDescription, setModalAssDescription] = useState('');

  const openAddAssessmentModal = (cat: 'WW' | 'PT' | 'QE' = 'WW') => {
    if (!activeProject) return;
    setModalAssCategory(cat);

    const existingInCat = activeProject.assessments.filter(a => a.category === cat);
    const nextNum = existingInCat.length + 1;

    if (cat === 'WW') {
      setModalAssName(`WW${nextNum}: Written Work ${nextNum}`);
      setModalAssPerfectScore(20);
    } else if (cat === 'PT') {
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

  const handleModalCategoryChange = (cat: 'WW' | 'PT' | 'QE') => {
    setModalAssCategory(cat);
    if (!activeProject) return;
    const existingInCat = activeProject.assessments.filter(a => a.category === cat);
    const nextNum = existingInCat.length + 1;

    if (cat === 'WW') {
      setModalAssName(`WW${nextNum}: Written Work ${nextNum}`);
      setModalAssPerfectScore(20);
    } else if (cat === 'PT') {
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

    addAssessmentToActive({
      name: modalAssName.trim(),
      category: modalAssCategory,
      perfectScore: modalAssPerfectScore,
      date: modalAssDate || undefined,
      description: modalAssDescription || undefined
    });

    setIsAddAssessmentModalOpen(false);
    showCustomAlert(`Successfully added column "${modalAssName.trim()}" (${modalAssCategory}, HPS: ${modalAssPerfectScore}) to gradebook spreadsheet!`, "Assessment Column Created", "success");
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
    const assessment = activeProject.assessments.find(a => a.id === assessmentId);
    if (!assessment) return;

    if (tempValue.trim() === '') {
      // Clear score
      const currentScore = activeProject.scores[studentId]?.[assessmentId];
      setUndoStack(prev => [...prev, { studentId, assessmentId, prevVal: currentScore }]);
      setRedoStack([]);
      clearScoreInActive(studentId, assessmentId);
    } else {
      const parsed = parseInt(tempValue);
      if (isNaN(parsed) || parsed < 0 || parsed > assessment.perfectScore) {
        showCustomAlert(`Must be a whole number between 0 and the perfect score of ${assessment.perfectScore}.`, "Invalid Score Entry", "error");
      } else {
        const currentScore = activeProject.scores[studentId]?.[assessmentId];
        setUndoStack(prev => [...prev, { studentId, assessmentId, prevVal: currentScore }]);
        setRedoStack([]);
        updateScoreInActive(studentId, assessmentId, parsed);
      }
    }
    setEditingScore(null);
  };

  // Keyboard navigation handler (Arrow keys, tab, enter, escape)
  const handleTableKeyDown = (e: React.KeyboardEvent, studentId: string, assessmentId: string, studentIndex: number, assessmentIndex: number) => {
    if (!activeProject) return;
    const activeStudents = activeProject.students.filter(s => s.status === 'Active');
    const assessments = [...activeProject.assessments].sort((a,b) => a.order - b.order);

    if (editingScore) {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveEditingCell();
        // Move select down to next student
        const nextIndex = studentIndex + 1;
        if (nextIndex < activeStudents.length) {
          const nextStudentId = activeStudents[nextIndex].id;
          setSelectedCell({ studentId: nextStudentId, assessmentId });
        }
      } else if (e.key === 'Escape') {
        setEditingScore(null);
      }
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      const currentScore = activeProject.scores[studentId]?.[assessmentId];
      setEditingScore({
        studentId,
        assessmentId,
        tempValue: currentScore !== undefined ? currentScore.toString() : ''
      });
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = studentIndex + 1;
      if (nextIndex < activeStudents.length) {
        setSelectedCell({ studentId: activeStudents[nextIndex].id, assessmentId });
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = studentIndex - 1;
      if (prevIndex >= 0) {
        setSelectedCell({ studentId: activeStudents[prevIndex].id, assessmentId });
      }
    } else if (e.key === 'ArrowRight' || e.key === 'Tab') {
      e.preventDefault();
      const nextAssIndex = assessmentIndex + 1;
      if (nextAssIndex < assessments.length) {
        setSelectedCell({ studentId, assessmentId: assessments[nextAssIndex].id });
      } else {
        // Move to first assessment of next student
        const nextStudentIndex = studentIndex + 1;
        if (nextStudentIndex < activeStudents.length) {
          setSelectedCell({ studentId: activeStudents[nextStudentIndex].id, assessmentId: assessments[0].id });
        }
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevAssIndex = assessmentIndex - 1;
      if (prevAssIndex >= 0) {
        setSelectedCell({ studentId, assessmentId: assessments[prevAssIndex].id });
      } else {
        // Move to last assessment of previous student
        const prevStudentIndex = studentIndex - 1;
        if (prevStudentIndex >= 0) {
          setSelectedCell({ studentId: activeStudents[prevStudentIndex].id, assessmentId: assessments[assessments.length - 1].id });
        }
      }
    }
  };

  // Undo score edits
  const handleUndo = () => {
    if (undoStack.length === 0 || !activeProject) return;
    const lastEdit = undoStack[undoStack.length - 1];
    const currentVal = activeProject.scores[lastEdit.studentId]?.[lastEdit.assessmentId];

    setRedoStack(prev => [...prev, { studentId: lastEdit.studentId, assessmentId: lastEdit.assessmentId, nextVal: currentVal }]);
    setUndoStack(prev => prev.slice(0, -1));

    if (lastEdit.prevVal === undefined) {
      clearScoreInActive(lastEdit.studentId, lastEdit.assessmentId);
    } else {
      updateScoreInActive(lastEdit.studentId, lastEdit.assessmentId, lastEdit.prevVal);
    }
  };

  // Redo score edits
  const handleRedo = () => {
    if (redoStack.length === 0 || !activeProject) return;
    const lastRedo = redoStack[redoStack.length - 1];
    const currentVal = activeProject.scores[lastRedo.studentId]?.[lastRedo.assessmentId];

    setUndoStack(prev => [...prev, { studentId: lastRedo.studentId, assessmentId: lastRedo.assessmentId, prevVal: currentVal }]);
    setRedoStack(prev => prev.slice(0, -1));

    if (lastRedo.nextVal === undefined) {
      clearScoreInActive(lastRedo.studentId, lastRedo.assessmentId);
    } else {
      updateScoreInActive(lastRedo.studentId, lastRedo.assessmentId, lastRedo.nextVal);
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
    
    let generatedLrnCounter = 1000000000;

    lines.forEach((rawLine, lineIdx) => {
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

      let lrn = '';
      let sex: 'Male' | 'Female' = 'Male';
      let name = '';
      let studNum: string | undefined = undefined;

      // 1. Check for 11 to 13 digit LRN
      let lrnIdx = parts.findIndex(p => {
        const cleaned = p.replace(/[\s-]/g, '');
        return /^\d{11,13}$/.test(cleaned);
      });

      if (lrnIdx !== -1) {
        lrn = parts[lrnIdx].replace(/[\s-]/g, '').trim();
      }

      // 2. Check for Sex token ('M', 'F', 'Male', 'Female', 'MALE', 'FEMALE')
      let sexIdx = parts.findIndex((p, idx) => 
        idx !== lrnIdx && /^(m|f|male|female|m\.?|f\.?)$/i.test(p.trim())
      );

      if (sexIdx !== -1) {
        const rawSex = parts[sexIdx].trim().toLowerCase();
        sex = rawSex.startsWith('f') ? 'Female' : 'Male';
      }

      // Remaining tokens are candidates for Name and Sequence/Student Number
      const remaining = parts.filter((_, idx) => idx !== lrnIdx && idx !== sexIdx);

      if (remaining.length > 0) {
        let candidateNameIdx = 0;
        // If first item is a sequence number like "1", "2", "01" or "#1"
        if (remaining.length > 1 && /^#?\d{1,3}$/.test(remaining[0].trim())) {
          candidateNameIdx = 1;
        }

        name = remaining[candidateNameIdx].trim().toUpperCase();

        // Check for extra tokens for Student Number
        const extraTokens = remaining.filter((_, idx) => idx !== candidateNameIdx && !/^#?\d{1,3}$/.test(_.trim()));
        if (extraTokens.length > 0) {
          studNum = extraTokens[0].trim();
        }
      }

      // Fallback: if name wasn't set but line has content
      if (!name && parts.length > 0) {
        const nonLrnSexParts = parts.filter((_, idx) => idx !== lrnIdx && idx !== sexIdx && !/^#?\d{1,3}$/.test(_.trim()));
        if (nonLrnSexParts.length > 0) {
          name = nonLrnSexParts.join(' ').trim().toUpperCase();
        }
      }

      // Clean quotes
      name = name.replace(/^["']|["']$/g, '').trim();

      // Fallback LRN generation if missing
      if (!lrn) {
        generatedLrnCounter++;
        lrn = `123${String(generatedLrnCounter).slice(-9)}`;
      }

      // Final validation
      if (name && name.length >= 2 && !/^(MALE|FEMALE|SEX|LRN|NAME|TOTAL|REMARKS)$/i.test(name)) {
        parsedStudents.push({
          lrn,
          name,
          sex,
          studentNumber: studNum,
          status: 'Active'
        });
      }
    });

    if (parsedStudents.length > 0) {
      importRosterToActive(parsedStudents, true);
      setCsvInput('');
      setCsvPasteMode(false);
      showCustomAlert(`Successfully imported ${parsedStudents.length} student profiles and synced across quarters!`, "Import Successful", "success");
    } else {
      showCustomAlert("Import failed. Make sure to paste lines containing student names.", "Import Error", "error");
    }
  };

  // Create new assessment
  const handleAddAssessment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assName.trim()) return;
    addAssessmentToActive({
      name: assName.trim(),
      category: assCategory,
      perfectScore: assPerfectScore,
      date: assDate || undefined,
      description: assDescription || undefined
    });
    setAssName('');
    setAssDescription('');
  };

  // CSV report generation download
  const handleExportCSVReport = () => {
    if (!activeProject) return;
    const activeStudents = activeProject.students.filter(s => s.status === 'Active');
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Student Name,LRN,Sex,WW_Pct,PT_Pct,QE_Pct,Initial_Grade,Final_Grade,Remarks\n";

    activeStudents.forEach(s => {
      const g = computeProjectStudentGrade(activeProject, s.id, globalSettings.subjects);
      csvContent += `"${s.name}",${s.lrn},${s.sex},${g.wwPercentage}%,${g.ptPercentage}%,${g.qePercentage}%,${g.initialGrade},${g.finalGrade},${g.remarks}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ClassRecord_${activeProject.subject}_${activeProject.gradeLevel}_${activeProject.section}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print trigger
  const handlePrint = () => {
    window.print();
  };

  // Empty state view when no project loaded
  if (!activeProject) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-2xl p-8 max-w-2xl mx-auto shadow-xs text-center space-y-6 my-12 animate-fade-in">
        <div className="p-4 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded-full w-16 h-16 flex items-center justify-center mx-auto">
          <FolderSync className="h-8 w-8 animate-spin" />
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-black text-slate-800 dark:text-slate-150 tracking-tight">Gradebook Workspace Locked</h2>
          <p className="text-xs text-slate-450 dark:text-slate-400 font-semibold max-w-md mx-auto leading-relaxed">
            There is currently no active grading project loaded. Navigate to the Project Hub to spin up a new class portal, or choose an existing project to initialize the spreadsheet canvas.
          </p>
        </div>

        {/* List existing projects right here for fast launch */}
        {projects.length > 0 && (
          <div className="border-t border-slate-100 dark:border-slate-850 pt-6 space-y-3.5 max-w-md mx-auto text-left">
            <span className="text-[10px] font-mono font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block text-center">
              Quick Select Workspace Project
            </span>
            <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
              {projects.map(p => (
                <button
                  key={p.id}
                  onClick={() => openProject(p.id)}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-900 border border-slate-150 dark:border-slate-800 transition-all text-xs font-bold"
                >
                  <span className="truncate text-slate-800 dark:text-slate-300">
                    {p.subject} • {p.gradeLevel} ({p.section})
                  </span>
                  <span className="text-[9px] font-mono text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
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
  const activeStudents = activeProject.students.filter(s => {
    if (!studentSearch.trim()) return true;
    const q = studentSearch.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.lrn.includes(q);
  });

  if (studentSort === 'name-asc') {
    activeStudents.sort((a,b) => a.name.localeCompare(b.name));
  } else if (studentSort === 'name-desc') {
    activeStudents.sort((a,b) => b.name.localeCompare(a.name));
  } else if (studentSort === 'lrn') {
    activeStudents.sort((a,b) => a.lrn.localeCompare(b.lrn));
  } else if (studentSort === 'sex') {
    activeStudents.sort((a,b) => a.sex.localeCompare(b.sex));
  }

  const sortedAssessments = [...activeProject.assessments].sort((a,b) => a.order - b.order);
  const wwAssessments = sortedAssessments.filter(a => a.category === 'WW');
  const ptAssessments = sortedAssessments.filter(a => a.category === 'PT');
  const qeAssessments = sortedAssessments.filter(a => a.category === 'QE');

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      
      {/* Mini Workspace Header bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-4.5 rounded-2xl shadow-3xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[9px] font-mono font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
              {activeProject.gradeLevel} • {activeProject.quarter} • S.Y. {activeProject.schoolYear}
            </span>
            
            {/* Completed/In-Progress Badge Trigger */}
            <button
              onClick={() => {
                const nextCompleted = !activeProject.isCompleted;
                saveProject({
                  ...activeProject,
                  isCompleted: nextCompleted
                });
              }}
              className={`text-[8.5px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider transition-all cursor-pointer border flex items-center gap-1.5 ${
                activeProject.isCompleted
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-450 hover:bg-emerald-100/50'
                  : 'bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900/15 text-indigo-700 dark:text-indigo-450 hover:bg-indigo-100/50'
              }`}
              title="Click to toggle project completion status"
            >
              <span className={`h-1.5 w-1.5 rounded-full ${activeProject.isCompleted ? 'bg-emerald-500' : 'bg-indigo-500 animate-pulse'}`} />
              {activeProject.isCompleted ? 'Quarter Completed' : 'Quarter In Progress'}
            </button>
          </div>
          
          <h2 className="text-base font-black text-slate-800 dark:text-slate-100 leading-tight">
            {activeProject.subject} • Class Grid ({activeProject.section})
          </h2>
        </div>

        {/* Tab Selection */}
        <div className="flex flex-wrap gap-1 bg-slate-50 dark:bg-slate-950 p-1 rounded-xl border border-slate-150 dark:border-slate-850 text-xs w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('gradebook')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === 'gradebook' 
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-3xs' 
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Gradebook
          </button>
          <button
            onClick={() => setActiveTab('assessments')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === 'assessments' 
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-3xs' 
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Assessments ({activeProject.assessments.length})
          </button>
          <button
            onClick={() => setActiveTab('roster')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === 'roster' 
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-3xs' 
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
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === 'reports' 
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-3xs' 
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Reports & Print
          </button>
        </div>
      </div>

      {/* --------------------------------------------------------
          TAB 1: GRADEBOOK SPREADSHEET (Phase 5 & Phase 6)
          -------------------------------------------------------- */}
      {activeTab === 'gradebook' && (
        <div className="space-y-4">
          {activeProject.isCompleted && (
            <div className="p-4.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-250 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-400 text-xs rounded-xl flex items-center justify-between gap-3 font-bold animate-fade-in shadow-3xs">
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
                className="px-2.5 py-1 bg-white hover:bg-slate-55 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] font-black cursor-pointer shadow-4xs"
              >
                Reopen for Editing
              </button>
            </div>
          )}
          
          {/* Quick Stats & Controls row */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-slate-100/40 dark:bg-slate-950/30 p-3.5 rounded-2xl border border-slate-150 dark:border-slate-850/85">
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5 bg-indigo-50/50 dark:bg-indigo-950/25 text-indigo-700 dark:text-indigo-400 px-2.5 py-1 rounded-lg border border-indigo-100/40 dark:border-indigo-900/10 font-sans text-[10px] font-bold">
                WEIGHTS: {getSubjectWeightsLabel(activeProject.subject, globalSettings.subjects, activeProject.workspace, activeProject.assessmentProfileId)}
              </div>
              <div className="flex items-center gap-1.5 bg-emerald-50/50 dark:bg-emerald-950/25 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 rounded-lg border border-emerald-100/40 dark:border-emerald-900/10 font-sans text-[10px] font-bold">
                PASSING: {activeProject.passingGrade}
              </div>
              
              <div className="flex items-center gap-1.5 bg-teal-50/50 dark:bg-teal-950/25 text-teal-700 dark:text-teal-400 px-2.5 py-1 rounded-lg border border-teal-100/40 dark:border-teal-900/10 font-sans text-[10px] font-bold">
                POLICY: 
                <select
                  value={activeProject.depedPolicy}
                  onChange={(e) => {
                    const newPolicy = e.target.value as '2015' | '2027';
                    saveProject({
                      ...activeProject,
                      depedPolicy: newPolicy
                    });
                  }}
                  className="bg-transparent border-none text-teal-700 dark:text-teal-400 font-bold focus:outline-hidden py-0 cursor-pointer text-[10px]"
                >
                  <option value="2015">0-Based (0=0, 70=70, 100=100)</option>
                  <option value="2027">MATATAG Adjusted Transmutation (SY 2027-2028)</option>
                </select>
              </div>
              
              {/* Dynamic student filtering directly on spreadsheet canvas */}
              <div className="relative min-w-[200px]">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter student names..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="pl-8 pr-3 py-1 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold focus:outline-hidden focus:ring-1.5 focus:ring-indigo-500 w-full sm:w-48 transition-all"
                />
              </div>
            </div>

            {/* Quick Add Assessment & Undo, Redo, Export Controls */}
            <div className="flex flex-wrap items-center gap-2 self-end md:self-auto shrink-0">
              <div className="flex items-center gap-1.5 border-r border-slate-200 dark:border-slate-800 pr-2.5">
                <button
                  onClick={() => openAddAssessmentModal('WW')}
                  className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60 text-[10px] font-black rounded-lg transition-all cursor-pointer shadow-3xs flex items-center gap-1"
                  title="Add Written Work Column"
                >
                  <Plus className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>+ WW</span>
                </button>

                <button
                  onClick={() => openAddAssessmentModal('PT')}
                  className="px-2.5 py-1.5 bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/40 dark:hover:bg-teal-900/50 text-teal-700 dark:text-teal-300 border border-teal-200/60 dark:border-teal-800/60 text-[10px] font-black rounded-lg transition-all cursor-pointer shadow-3xs flex items-center gap-1"
                  title="Add Performance Task Column"
                >
                  <Plus className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                  <span>+ PT</span>
                </button>

                <button
                  onClick={() => openAddAssessmentModal('QE')}
                  className="px-2.5 py-1.5 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:hover:bg-emerald-800/50 text-emerald-800 dark:text-emerald-200 border border-emerald-300/60 dark:border-emerald-700/60 text-[10px] font-black rounded-lg transition-all cursor-pointer shadow-3xs flex items-center gap-1"
                  title="Add Quarterly Exam Column"
                >
                  <Plus className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-300" />
                  <span>+ QE</span>
                </button>

                <button
                  onClick={() => openAddAssessmentModal('WW')}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black rounded-lg transition-all shadow-3xs cursor-pointer flex items-center gap-1.5"
                  title="Open Add Assessment Column Pop-Up Modal"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Add Column</span>
                </button>
              </div>

              <button
                disabled={undoStack.length === 0}
                onClick={handleUndo}
                className="px-3 py-1.5 bg-white hover:bg-slate-50 disabled:bg-slate-100/50 dark:bg-slate-900 dark:hover:bg-slate-800 dark:disabled:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 disabled:text-slate-400 text-[10px] font-bold rounded-lg transition-all cursor-pointer shadow-3xs flex items-center gap-1"
                title="Undo score edit"
              >
                Undo ({undoStack.length})
              </button>
              <button
                disabled={redoStack.length === 0}
                onClick={handleRedo}
                className="px-3 py-1.5 bg-white hover:bg-slate-50 disabled:bg-slate-100/50 dark:bg-slate-900 dark:hover:bg-slate-800 dark:disabled:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 disabled:text-slate-400 text-[10px] font-bold rounded-lg transition-all cursor-pointer shadow-3xs flex items-center gap-1"
                title="Redo score edit"
              >
                Redo ({redoStack.length})
              </button>
              <button
                onClick={handleExportCSVReport}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-[10px] font-bold rounded-lg transition-all shadow-3xs cursor-pointer flex items-center gap-1.5"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" /> Export Class Record
              </button>
            </div>
          </div>

          {activeProject.students.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-2xl py-16 text-center space-y-4">
              <p className="text-xs text-slate-400 font-bold">Roster empty. Please import or create student accounts first.</p>
              <button
                onClick={() => setActiveTab('roster')}
                className="px-4 py-2 bg-indigo-600 text-white text-xs font-black rounded-xl cursor-pointer"
              >
                Open Learner Roster
              </button>
            </div>
          ) : activeProject.assessments.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-2xl py-16 text-center space-y-4">
              <p className="text-xs text-slate-400 font-bold">No assessment columns yet. Click below to quickly create Written Works, Performance Tasks, or Quarterly Exams.</p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => openAddAssessmentModal('WW')}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl cursor-pointer shadow-3xs flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" /> Add Written Work (+WW)
                </button>
                <button
                  onClick={() => openAddAssessmentModal('PT')}
                  className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-black rounded-xl cursor-pointer shadow-3xs flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" /> Add Performance Task (+PT)
                </button>
                <button
                  onClick={() => openAddAssessmentModal('QE')}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl cursor-pointer shadow-3xs flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" /> Add Quarterly Exam (+QE)
                </button>
              </div>
            </div>
          ) : (
            /* Spreadsheet Table */
            <div className="bg-white dark:bg-slate-900 border border-slate-150/80 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto max-w-full">
                <table className="w-full text-left border-collapse border-spacing-0 select-none">
                  <thead>
                    {/* Header Row 1: Main Category Spans with Correct Mathematical Colspans */}
                    <tr className="border-b border-slate-150 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/40 text-[9px] font-sans text-slate-450 dark:text-slate-500 uppercase tracking-widest font-black text-center">
                      <th className="py-3 px-4 text-left w-64 min-w-[220px] border-r border-slate-200 dark:border-slate-800/60 bg-slate-100/50 dark:bg-slate-950/50 text-slate-500 dark:text-slate-400 font-bold" colSpan={2}>Learner Details</th>
                      {wwAssessments.length > 0 && (
                        <th className="py-2.5 px-2 text-center bg-indigo-50/30 dark:bg-indigo-950/15 text-indigo-750 dark:text-indigo-400 font-black border-r border-slate-200 dark:border-slate-800" colSpan={wwAssessments.length + 3}>
                          <div className="flex items-center justify-center gap-2">
                            <span>Written Works ({Math.round(activeProject.subject === 'Science' || activeProject.subject === 'Math' ? 40 : activeProject.subject === 'MAPEH' || activeProject.subject === 'TLE' ? 20 : 30)}%)</span>
                            <button
                              onClick={() => openAddAssessmentModal('WW')}
                              className="px-1.5 py-0.5 bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900/60 dark:hover:bg-indigo-800 text-indigo-800 dark:text-indigo-200 text-[8px] font-black rounded cursor-pointer transition-colors"
                              title="Add new Written Work column"
                            >
                              + Add WW
                            </button>
                          </div>
                        </th>
                      )}
                      {ptAssessments.length > 0 && (
                        <th className="py-2.5 px-2 text-center bg-teal-50/35 dark:bg-teal-950/15 text-teal-800 dark:text-teal-400 font-black border-r border-slate-200 dark:border-slate-800" colSpan={ptAssessments.length + 3}>
                          <div className="flex items-center justify-center gap-2">
                            <span>Performance Tasks ({Math.round(activeProject.subject === 'Science' || activeProject.subject === 'Math' ? 40 : activeProject.subject === 'MAPEH' || activeProject.subject === 'TLE' ? 60 : 50)}%)</span>
                            <button
                              onClick={() => openAddAssessmentModal('PT')}
                              className="px-1.5 py-0.5 bg-teal-100 hover:bg-teal-200 dark:bg-teal-900/60 dark:hover:bg-teal-800 text-teal-800 dark:text-teal-200 text-[8px] font-black rounded cursor-pointer transition-colors"
                              title="Add new Performance Task column"
                            >
                              + Add PT
                            </button>
                          </div>
                        </th>
                      )}
                      {qeAssessments.length > 0 && (
                        <th className="py-2.5 px-2 text-center bg-emerald-50/35 dark:bg-emerald-950/15 text-emerald-750 dark:text-emerald-400 font-black border-r border-slate-200 dark:border-slate-800" colSpan={qeAssessments.length + 2}>
                          <div className="flex items-center justify-center gap-2">
                            <span>Quarterly Exam (20%)</span>
                            <button
                              onClick={() => openAddAssessmentModal('QE')}
                              className="px-1.5 py-0.5 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/60 dark:hover:bg-emerald-800 text-emerald-800 dark:text-emerald-200 text-[8px] font-black rounded cursor-pointer transition-colors"
                              title="Add new Quarterly Exam column"
                            >
                              + Add QE
                            </button>
                          </div>
                        </th>
                      )}
                      <th className="py-3 px-4 text-center bg-slate-50 dark:bg-slate-950 text-slate-650 dark:text-slate-400 font-black w-44" colSpan={3}>Remarks Summary</th>
                    </tr>

                    {/* Header Row 2: Assessment Names & Total Headers */}
                    <tr className="border-b border-slate-150 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/20 text-[9px] font-sans text-slate-450 dark:text-slate-500 uppercase tracking-wide font-black text-center">
                      {/* Frozen Student Columns */}
                      <th className="py-3 px-4 text-left w-48 min-w-[220px] font-bold border-r border-slate-200 dark:border-slate-800 sticky left-0 bg-slate-50 dark:bg-slate-950 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.03)]">Student Name</th>
                      <th className="py-3 px-1.5 text-center w-12 font-bold border-r border-slate-200 dark:border-slate-800">Sex</th>

                      {/* WW Columns */}
                      {wwAssessments.map(a => (
                        <th key={a.id} className="py-3 px-2 text-center w-18 min-w-[72px] group relative" title={a.description}>
                          <div className="truncate w-16 mx-auto font-black text-slate-700 dark:text-slate-350">{a.name}</div>
                          <div className="text-[8px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5">Max: {a.perfectScore}</div>
                        </th>
                      ))}
                      {wwAssessments.length > 0 && (
                        <>
                          <th className="py-3 px-1.5 text-center w-12 bg-indigo-50/45 dark:bg-indigo-950/10 text-indigo-650 dark:text-indigo-400 font-bold">Total</th>
                          <th className="py-3 px-1.5 text-center w-12 bg-indigo-50/45 dark:bg-indigo-950/10 text-indigo-650 dark:text-indigo-400 font-bold">P.S.</th>
                          <th className="py-3 px-1.5 text-center w-12 bg-indigo-100/30 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-450 font-extrabold border-r border-slate-200 dark:border-slate-800">W.S.</th>
                        </>
                      )}

                      {/* PT Columns */}
                      {ptAssessments.map(a => (
                        <th key={a.id} className="py-3 px-2 text-center w-18 min-w-[72px] group relative" title={a.description}>
                          <div className="truncate w-16 mx-auto font-black text-slate-700 dark:text-slate-350">{a.name}</div>
                          <div className="text-[8px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5">Max: {a.perfectScore}</div>
                        </th>
                      ))}
                      {ptAssessments.length > 0 && (
                        <>
                          <th className="py-3 px-1.5 text-center w-12 bg-teal-50/45 dark:bg-teal-950/10 text-teal-700 dark:text-teal-400 font-bold">Total</th>
                          <th className="py-3 px-1.5 text-center w-12 bg-teal-50/45 dark:bg-teal-950/10 text-teal-700 dark:text-teal-400 font-bold">P.S.</th>
                          <th className="py-3 px-1.5 text-center w-12 bg-teal-100/30 dark:bg-teal-950/20 text-teal-700 dark:text-teal-300 font-extrabold border-r border-slate-200 dark:border-slate-800">W.S.</th>
                        </>
                      )}

                      {/* QE Columns */}
                      {qeAssessments.map(a => (
                        <th key={a.id} className="py-3 px-2 text-center w-18 min-w-[72px] group relative" title={a.description}>
                          <div className="truncate w-16 mx-auto font-black text-slate-700 dark:text-slate-350">{a.name}</div>
                          <div className="text-[8px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5">Max: {a.perfectScore}</div>
                        </th>
                      ))}
                      {qeAssessments.length > 0 && (
                        <>
                          <th className="py-3 px-1.5 text-center w-12 bg-emerald-50/45 dark:bg-emerald-950/10 text-emerald-650 dark:text-emerald-400 font-bold">P.S.</th>
                          <th className="py-3 px-1.5 text-center w-12 bg-emerald-100/30 dark:bg-emerald-950/20 text-emerald-750 dark:text-emerald-450 font-extrabold border-r border-slate-200 dark:border-slate-800">W.S.</th>
                        </>
                      )}

                      {/* Final Totals Columns */}
                      <th className="py-3 px-2 text-center bg-slate-100/50 dark:bg-slate-950/40 text-slate-500 dark:text-slate-450 w-16 font-bold">Initial</th>
                      <th className="py-3 px-2 text-center bg-slate-100/50 dark:bg-slate-950/40 text-indigo-700 dark:text-indigo-400 w-16 font-extrabold">Final</th>
                      <th className="py-3 px-4 text-center bg-slate-100/50 dark:bg-slate-950/40 text-slate-850 dark:text-slate-200 w-24 font-bold">Remarks</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-150 dark:divide-slate-850/60">
                    {activeStudents.map((st, sIdx) => {
                      const computed = computeProjectStudentGrade(activeProject, st.id, globalSettings.subjects);
                      const scores = activeProject.scores[st.id] || {};

                      return (
                        <tr 
                          key={st.id} 
                          className="group hover:bg-slate-50/50 dark:hover:bg-slate-850/10 text-xs text-slate-700 dark:text-slate-300 font-medium transition-colors"
                        >
                          {/* Frozen student details with distinct right shadow/border */}
                          <td className="py-3 px-4 font-bold sticky left-0 bg-white dark:bg-slate-900 group-hover:bg-slate-50/80 dark:group-hover:bg-slate-850/20 group-even:bg-slate-50/30 dark:group-even:bg-slate-950/20 z-10 transition-colors border-r border-slate-150 dark:border-slate-800 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.06)] min-w-[220px]">
                            <div className="font-extrabold text-slate-850 dark:text-slate-100 tracking-tight">{st.name}</div>
                            <div className="text-[9px] text-slate-400 dark:text-slate-500 font-sans font-medium mt-0.5">LRN: {st.lrn}</div>
                          </td>
                          <td className="py-3 px-2.5 text-center border-r border-slate-150 dark:border-slate-800 shrink-0">
                            {st.sex === 'Female' ? (
                              <span className="inline-block px-1.5 py-0.5 text-[9px] font-sans font-black rounded-md bg-pink-50 text-pink-600 dark:bg-pink-950/20 dark:text-pink-400 border border-pink-100/40 dark:border-pink-900/10">F</span>
                            ) : (
                              <span className="inline-block px-1.5 py-0.5 text-[9px] font-sans font-black rounded-md bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400 border border-blue-100/40 dark:border-blue-900/10">M</span>
                            )}
                          </td>

                          {/* WW Score Cells */}
                          {wwAssessments.map((ass, aIdx) => {
                            const score = scores[ass.id];
                            const isMissing = score === undefined;
                            const isCellSelected = selectedCell?.studentId === st.id && selectedCell?.assessmentId === ass.id;
                            const isEditing = editingScore?.studentId === st.id && editingScore?.assessmentId === ass.id;

                            return (
                              <td 
                                key={ass.id} 
                                onClick={() => {
                                  setSelectedCell({ studentId: st.id, assessmentId: ass.id });
                                  if (!isEditing) {
                                    setEditingScore({ studentId: st.id, assessmentId: ass.id, tempValue: score !== undefined ? score.toString() : '' });
                                  }
                                }}
                                onKeyDown={(e) => handleTableKeyDown(e, st.id, ass.id, sIdx, sortedAssessments.findIndex(x => x.id === ass.id))}
                                tabIndex={0}
                                className="p-1.5 text-center font-mono transition-all outline-hidden cursor-pointer relative"
                                title="Click to edit score"
                              >
                                <div className={`w-14 mx-auto py-1 px-1 rounded-lg border-2 text-center transition-all flex items-center justify-center min-h-[32px] font-mono text-xs font-bold shadow-2xs ${
                                  isEditing
                                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/80 ring-2 ring-emerald-500/30 text-emerald-950 dark:text-emerald-100'
                                    : isCellSelected
                                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-950 dark:text-emerald-100 ring-2 ring-emerald-500/30'
                                      : isMissing
                                        ? 'border-slate-300 dark:border-slate-700 bg-emerald-50/20 dark:bg-emerald-950/10 text-slate-400 dark:text-slate-500 hover:border-emerald-500 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/30'
                                        : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 hover:border-emerald-500 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20'
                                }`}>
                                  {isEditing ? (
                                    <input
                                      ref={inputRef}
                                      type="number"
                                      min={0}
                                      max={ass.perfectScore}
                                      value={editingScore.tempValue}
                                      onBlur={handleCellBlur}
                                      onClick={(e) => e.stopPropagation()}
                                      onChange={(e) => setEditingScore(prev => prev ? { ...prev, tempValue: e.target.value } : null)}
                                      placeholder={`0-${ass.perfectScore}`}
                                      className="w-full text-center bg-transparent text-emerald-950 dark:text-emerald-100 font-mono text-xs font-black focus:outline-hidden"
                                    />
                                  ) : (
                                    score !== undefined ? (
                                      <span className="font-extrabold">{score}</span>
                                    ) : (
                                      <span className="text-slate-400 dark:text-slate-500 font-medium text-[10px]">—</span>
                                    )
                                  )}
                                </div>
                              </td>
                            );
                          })}
                          {wwAssessments.length > 0 && (
                            <>
                              <td className="py-3 px-1.5 text-center font-mono bg-indigo-50/10 dark:bg-indigo-950/5 text-slate-500 dark:text-slate-450 font-medium">
                                {computed.wwRawSum}
                              </td>
                              <td className="py-3 px-1.5 text-center font-mono bg-indigo-50/10 dark:bg-indigo-950/5 text-slate-600 dark:text-slate-400 font-bold">
                                {computed.wwPercentage}%
                              </td>
                              <td className="py-3 px-1.5 text-center font-mono bg-indigo-50/20 dark:bg-indigo-950/10 text-indigo-600 dark:text-indigo-400 font-extrabold border-r border-slate-150 dark:border-slate-800">
                                {computed.weightedWW}
                              </td>
                            </>
                          )}

                          {/* PT Score Cells */}
                          {ptAssessments.map((ass, aIdx) => {
                            const score = scores[ass.id];
                            const isMissing = score === undefined;
                            const isCellSelected = selectedCell?.studentId === st.id && selectedCell?.assessmentId === ass.id;
                            const isEditing = editingScore?.studentId === st.id && editingScore?.assessmentId === ass.id;

                            return (
                              <td 
                                key={ass.id} 
                                onClick={() => {
                                  setSelectedCell({ studentId: st.id, assessmentId: ass.id });
                                  if (!isEditing) {
                                    setEditingScore({ studentId: st.id, assessmentId: ass.id, tempValue: score !== undefined ? score.toString() : '' });
                                  }
                                }}
                                onKeyDown={(e) => handleTableKeyDown(e, st.id, ass.id, sIdx, sortedAssessments.findIndex(x => x.id === ass.id))}
                                tabIndex={0}
                                className="p-1.5 text-center font-mono transition-all outline-hidden cursor-pointer relative"
                                title="Click to edit score"
                              >
                                <div className={`w-14 mx-auto py-1 px-1 rounded-lg border-2 text-center transition-all flex items-center justify-center min-h-[32px] font-mono text-xs font-bold shadow-2xs ${
                                  isEditing
                                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/80 ring-2 ring-emerald-500/30 text-emerald-950 dark:text-emerald-100'
                                    : isCellSelected
                                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-950 dark:text-emerald-100 ring-2 ring-emerald-500/30'
                                      : isMissing
                                        ? 'border-slate-300 dark:border-slate-700 bg-emerald-50/20 dark:bg-emerald-950/10 text-slate-400 dark:text-slate-500 hover:border-emerald-500 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/30'
                                        : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 hover:border-emerald-500 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20'
                                }`}>
                                  {isEditing ? (
                                    <input
                                      ref={inputRef}
                                      type="number"
                                      min={0}
                                      max={ass.perfectScore}
                                      value={editingScore.tempValue}
                                      onBlur={handleCellBlur}
                                      onClick={(e) => e.stopPropagation()}
                                      onChange={(e) => setEditingScore(prev => prev ? { ...prev, tempValue: e.target.value } : null)}
                                      placeholder={`0-${ass.perfectScore}`}
                                      className="w-full text-center bg-transparent text-emerald-950 dark:text-emerald-100 font-mono text-xs font-black focus:outline-hidden"
                                    />
                                  ) : (
                                    score !== undefined ? (
                                      <span className="font-extrabold">{score}</span>
                                    ) : (
                                      <span className="text-slate-400 dark:text-slate-500 font-medium text-[10px]">—</span>
                                    )
                                  )}
                                </div>
                              </td>
                            );
                          })}
                          {ptAssessments.length > 0 && (
                            <>
                              <td className="py-3 px-1.5 text-center font-mono bg-teal-50/10 dark:bg-teal-950/5 text-slate-500 dark:text-slate-450 font-medium">
                                {computed.ptRawSum}
                              </td>
                              <td className="py-3 px-1.5 text-center font-mono bg-teal-50/10 dark:bg-teal-950/5 text-slate-600 dark:text-slate-400 font-bold">
                                {computed.ptPercentage}%
                              </td>
                              <td className="py-3 px-1.5 text-center font-mono bg-teal-50/20 dark:bg-teal-950/10 text-teal-600 dark:text-teal-400 font-extrabold border-r border-slate-150 dark:border-slate-800">
                                {computed.weightedPT}
                              </td>
                            </>
                          )}

                          {/* QE Score Cells */}
                          {qeAssessments.map((ass, aIdx) => {
                            const score = scores[ass.id];
                            const isMissing = score === undefined;
                            const isCellSelected = selectedCell?.studentId === st.id && selectedCell?.assessmentId === ass.id;
                            const isEditing = editingScore?.studentId === st.id && editingScore?.assessmentId === ass.id;

                            return (
                              <td 
                                key={ass.id} 
                                onClick={() => {
                                  setSelectedCell({ studentId: st.id, assessmentId: ass.id });
                                  if (!isEditing) {
                                    setEditingScore({ studentId: st.id, assessmentId: ass.id, tempValue: score !== undefined ? score.toString() : '' });
                                  }
                                }}
                                onKeyDown={(e) => handleTableKeyDown(e, st.id, ass.id, sIdx, sortedAssessments.findIndex(x => x.id === ass.id))}
                                tabIndex={0}
                                className="p-1.5 text-center font-mono transition-all outline-hidden cursor-pointer relative"
                                title="Click to edit score"
                              >
                                <div className={`w-14 mx-auto py-1 px-1 rounded-lg border-2 text-center transition-all flex items-center justify-center min-h-[32px] font-mono text-xs font-bold shadow-2xs ${
                                  isEditing
                                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/80 ring-2 ring-emerald-500/30 text-emerald-950 dark:text-emerald-100'
                                    : isCellSelected
                                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-950 dark:text-emerald-100 ring-2 ring-emerald-500/30'
                                      : isMissing
                                        ? 'border-slate-300 dark:border-slate-700 bg-emerald-50/20 dark:bg-emerald-950/10 text-slate-400 dark:text-slate-500 hover:border-emerald-500 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/30'
                                        : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 hover:border-emerald-500 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20'
                                }`}>
                                  {isEditing ? (
                                    <input
                                      ref={inputRef}
                                      type="number"
                                      min={0}
                                      max={ass.perfectScore}
                                      value={editingScore.tempValue}
                                      onBlur={handleCellBlur}
                                      onClick={(e) => e.stopPropagation()}
                                      onChange={(e) => setEditingScore(prev => prev ? { ...prev, tempValue: e.target.value } : null)}
                                      placeholder={`0-${ass.perfectScore}`}
                                      className="w-full text-center bg-transparent text-emerald-950 dark:text-emerald-100 font-mono text-xs font-black focus:outline-hidden"
                                    />
                                  ) : (
                                    score !== undefined ? (
                                      <span className="font-extrabold">{score}</span>
                                    ) : (
                                      <span className="text-slate-400 dark:text-slate-500 font-medium text-[10px]">—</span>
                                    )
                                  )}
                                </div>
                              </td>
                            );
                          })}
                          {qeAssessments.length > 0 && (
                            <>
                              <td className="py-3 px-1.5 text-center font-mono bg-emerald-50/10 dark:bg-emerald-950/5 text-slate-600 dark:text-slate-400 font-bold">
                                {computed.qePercentage}%
                              </td>
                              <td className="py-3 px-1.5 text-center font-mono bg-emerald-50/20 dark:bg-emerald-950/10 text-emerald-600 dark:text-emerald-450 font-extrabold border-r border-slate-150 dark:border-slate-800">
                                {computed.weightedQA}
                              </td>
                            </>
                          )}

                          {/* Calculated card grades */}
                          <td className="py-3 px-2 text-center font-mono bg-slate-50/35 dark:bg-slate-950/10 text-slate-500 dark:text-slate-450 font-medium">
                            {computed.initialGrade}%
                          </td>
                          <td className="py-3 px-2 text-center font-mono bg-indigo-50/10 dark:bg-indigo-950/5 text-indigo-700 dark:text-indigo-400 font-extrabold text-[12px]">
                            <span className="inline-block font-black text-xs text-indigo-750 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 px-2 py-0.5 rounded-lg border border-indigo-100/40 dark:border-indigo-900/10 min-w-[32px] text-center">
                              {computed.finalGrade}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            {computed.isPassing ? (
                              <span className="inline-flex items-center gap-1 text-[9px] font-sans font-black uppercase px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/10">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                PASSED
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[9px] font-sans font-black uppercase px-2 py-1 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-100 dark:border-rose-900/10 animate-pulse">
                                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                                INTERVENTION
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Instructions footer */}
              <div className="p-4 bg-slate-50/70 dark:bg-slate-950/40 text-[10px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-850/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-2.5 font-medium">
                  <HelpCircle className="h-4 w-4 text-indigo-500 shrink-0 animate-pulse" />
                  <span>Click any score cell or press <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-sm font-sans text-[9px] shadow-4xs font-bold">Enter</kbd> to edit scores in real-time. Blank cells indicate missing scores.</span>
                </div>
                
                {/* Keyboard Shortcuts Legend */}
                <div className="flex flex-wrap items-center gap-3 text-[9px] font-sans font-bold text-slate-450 dark:text-slate-500 self-start md:self-auto shrink-0">
                  <span className="text-[10px] uppercase tracking-wider text-slate-450 dark:text-slate-500">Shortcuts:</span>
                  <div className="flex items-center gap-1 bg-slate-100/50 dark:bg-slate-900/40 px-2 py-1 rounded-md border border-slate-200/20">
                    <kbd className="px-1 bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded shadow-4xs">↑</kbd>
                    <kbd className="px-1 bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded shadow-4xs">↓</kbd>
                    <kbd className="px-1 bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded shadow-4xs">←</kbd>
                    <kbd className="px-1 bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded shadow-4xs">→</kbd>
                    <span>Move</span>
                  </div>
                  <div className="flex items-center gap-1 bg-slate-100/50 dark:bg-slate-900/40 px-2 py-1 rounded-md border border-slate-200/20">
                    <kbd className="px-1.5 bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded shadow-4xs">Tab</kbd>
                    <span>Next</span>
                  </div>
                  <div className="flex items-center gap-1 bg-slate-100/50 dark:bg-slate-900/40 px-2 py-1 rounded-md border border-slate-200/20">
                    <kbd className="px-1.5 bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded shadow-4xs">Esc</kbd>
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
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-2xl p-6 md:p-8 shadow-3xs space-y-4">
            <h3 className="font-sans font-black text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              Active Assessment List ({activeProject.assessments.length})
            </h3>

            {activeProject.assessments.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs font-semibold">
                No custom assessments defined. Use the creation board on the right to install grading categories.
              </div>
            ) : (
              <div className="space-y-3.5 max-h-[500px] overflow-y-auto pr-1">
                {sortedAssessments.map((ass, index) => (
                  <div 
                    key={ass.id} 
                    className="p-4 rounded-xl border border-slate-150 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-950/10 hover:border-slate-200 dark:hover:border-slate-700 transition-all flex justify-between items-center"
                  >
                    <div className="space-y-1 max-w-[70%]">
                      <div className="flex items-center gap-2">
                        <span className={`text-[8px] font-mono font-black uppercase px-1.5 py-0.5 rounded-sm ${
                          ass.category === 'WW' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/20' : ass.category === 'PT' ? 'bg-teal-50 text-teal-600 dark:bg-teal-950/20' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20'
                        }`}>
                          {ass.category === 'WW' ? 'Written Works' : ass.category === 'PT' ? 'Performance Tasks' : 'Quarterly Exam'}
                        </span>
                        {ass.date && (
                          <span className="text-[9px] font-mono text-slate-400">
                            {new Date(ass.date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-black text-slate-800 dark:text-slate-200">{ass.name}</h4>
                      {ass.description && (
                        <p className="text-[10px] text-slate-400 leading-normal truncate">{ass.description}</p>
                      )}
                      <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">
                        Perfect Score: {ass.perfectScore} raw points
                      </div>
                    </div>

                    {/* Reordering & Deleting triggers */}
                    <div className="flex items-center gap-1">
                      <button
                        disabled={index === 0}
                        onClick={() => {
                          const cpy = [...sortedAssessments];
                          const temp = cpy[index];
                          cpy[index] = cpy[index - 1];
                          cpy[index - 1] = temp;
                          reorderAssessmentsInActive(cpy);
                        }}
                        className="p-1.5 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-md hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                        title="Move Up"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </button>
                      <button
                        disabled={index === sortedAssessments.length - 1}
                        onClick={() => {
                          const cpy = [...sortedAssessments];
                          const temp = cpy[index];
                          cpy[index] = cpy[index + 1];
                          cpy[index + 1] = temp;
                          reorderAssessmentsInActive(cpy);
                        }}
                        className="p-1.5 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-md hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                        title="Move Down"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          showCustomConfirm(
                            `Are you sure you want to permanently delete the assessment [${ass.name}]? All student score cells registered under this category will be purged. This action cannot be undone.`,
                            () => deleteAssessmentFromActive(ass.id),
                            "Delete Assessment"
                          );
                        }}
                        className="p-1.5 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-450 rounded-md hover:bg-rose-100 transition-colors cursor-pointer"
                        title="Delete Assessment"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Create Assessment Form */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-2xl p-6 md:p-8 shadow-3xs space-y-4 h-fit">
            <h3 className="font-sans font-black text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Plus className="h-5 w-5 text-indigo-600 animate-pulse" />
              Build Assessment
            </h3>

            <form onSubmit={handleAddAssessment} className="space-y-4">
              <div>
                <label className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Assessment Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. WW3: Lab report rubric"
                  value={assName}
                  onChange={(e) => setAssName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-150 dark:border-slate-800 rounded-xl py-2.5 px-3 text-xs focus:outline-hidden mt-1.5 font-bold"
                />
              </div>

              <div>
                <label className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Grading Category</label>
                <select
                  value={assCategory}
                  onChange={(e) => setAssCategory(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-150 dark:border-slate-800 rounded-xl py-2.5 px-3 text-xs focus:outline-hidden mt-1.5 font-bold"
                >
                  <option value="WW">Written Works (WW)</option>
                  <option value="PT">Performance Tasks (PT)</option>
                  <option value="QE">Quarterly Examination (QE)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Perfect Score</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={1000}
                    value={assPerfectScore}
                    onChange={(e) => setAssPerfectScore(parseInt(e.target.value) || 20)}
                    className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-150 dark:border-slate-800 rounded-xl py-2.5 px-3 text-xs focus:outline-hidden mt-1.5 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Date (Optional)</label>
                  <input
                    type="date"
                    value={assDate}
                    onChange={(e) => setAssDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-150 dark:border-slate-800 rounded-xl py-2 px-3 text-xs focus:outline-hidden mt-1.5 font-mono font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Description (Optional)</label>
                <textarea
                  placeholder="Notes on assessment scope, rubrics..."
                  value={assDescription}
                  onChange={(e) => setAssDescription(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-150 dark:border-slate-800 rounded-xl py-2.5 px-3 text-xs focus:outline-hidden mt-1.5 font-medium h-20 resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl transition-colors cursor-pointer"
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
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-2xl p-6 md:p-8 shadow-3xs space-y-5">
            
            {/* Search and Sort controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3.5 pb-2 border-b border-slate-100 dark:border-slate-850">
              <h3 className="font-sans font-black text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                Learners Roster Directory ({activeProject.students.length})
              </h3>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-none">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search LRN / Name..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-150 dark:border-slate-800 rounded-lg text-xs font-semibold focus:outline-hidden w-full sm:w-44"
                  />
                </div>

                <select
                  value={studentSort}
                  onChange={(e) => setStudentSort(e.target.value as any)}
                  className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-150 dark:border-slate-800 rounded-lg py-1.5 px-2 text-xs font-bold focus:outline-hidden"
                >
                  <option value="name-asc">Alphabetical A-Z</option>
                  <option value="name-desc">Alphabetical Z-A</option>
                  <option value="lrn">Sort by LRN</option>
                  <option value="sex">Sort by Sex</option>
                </select>
              </div>
            </div>

            {activeProject.students.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs font-semibold">
                Roster empty. Register students manually on the right or use batch import.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-850 max-h-[500px] overflow-y-auto pr-1">
                {activeStudents.map((st) => (
                  <div key={st.id} className="py-3.5 flex justify-between items-center hover:bg-slate-55/30 dark:hover:bg-slate-850/10 px-2 rounded-xl transition-colors">
                    <div className="space-y-1">
                      <h4 className="text-xs font-black text-slate-800 dark:text-slate-200">{st.name}</h4>
                      <p className="text-[10px] font-mono text-slate-450 dark:text-slate-500 font-bold">
                        LRN: {st.lrn} | Sex: {st.sex} {st.studentNumber ? `| No: ${st.studentNumber}` : ''}
                      </p>
                      <span className={`text-[8px] font-mono font-black uppercase px-1.5 py-0.5 rounded-sm ${
                        st.status === 'Active' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20' : st.status === 'Dropped' ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/20' : 'bg-slate-50 text-slate-500 dark:bg-slate-950/20'
                      }`}>
                        {st.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setEditingStudent(st)}
                        className="p-1.5 bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md text-slate-650 dark:text-slate-350 cursor-pointer transition-colors"
                        title="Edit Student details"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          showCustomConfirm(
                            `Are you sure you want to permanently delete learner [${st.name}]? All registered grade cards and scores for this student will be completely purged.`,
                            () => deleteStudentFromActive(st.id),
                            "Purge Learner Profile"
                          );
                        }}
                        className="p-1.5 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-450 rounded-md hover:bg-rose-100 transition-colors cursor-pointer"
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
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-2xl p-6 md:p-8 shadow-3xs space-y-4 h-fit">
              <h3 className="font-sans font-black text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-indigo-600" />
                Register Student
              </h3>

              <form onSubmit={handleAddStudent} className="space-y-3.5">
                <div>
                  <label className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Learner Ref. Number (LRN)</label>
                  <input
                    type="text"
                    required
                    maxLength={12}
                    placeholder="12-digit number (e.g. 102938475612)"
                    value={newStudentLrn}
                    onChange={(e) => setNewStudentLrn(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-150 dark:border-slate-800 rounded-xl py-2.5 px-3 text-xs focus:outline-hidden mt-1.5 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Student Name</label>
                  <input
                    type="text"
                    required
                    placeholder="LASTNAME, FIRSTNAME MIDDLE_I."
                    value={newStudentName}
                    onChange={(e) => setNewStudentName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-150 dark:border-slate-800 rounded-xl py-2.5 px-3 text-xs focus:outline-hidden mt-1.5 font-bold uppercase"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Gender (Sex)</label>
                    <select
                      value={newStudentSex}
                      onChange={(e) => setNewStudentSex(e.target.value as any)}
                      className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-150 dark:border-slate-800 rounded-xl py-2.5 px-3 text-xs focus:outline-hidden mt-1.5 font-bold"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Student No. (Opt.)</label>
                    <input
                      type="text"
                      placeholder="e.g. 2026-004"
                      value={newStudentNumber}
                      onChange={(e) => setNewStudentNumber(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-150 dark:border-slate-800 rounded-xl py-2.5 px-3 text-xs focus:outline-hidden mt-1.5 font-mono font-semibold"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl transition-colors cursor-pointer"
                >
                  Register Learner Account
                </button>
              </form>
            </div>

            {/* Quick Import from another Class/Project */}
            {projects.length > 1 && (
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-2xl p-6 md:p-8 shadow-3xs space-y-4 h-fit">
                <h3 className="font-sans font-black text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <FolderSync className="h-5 w-5 text-indigo-600 animate-pulse" />
                  Clone/Import Class Roster
                </h3>
                <p className="text-[10.5px] text-slate-400 leading-normal font-semibold">
                  Instantly copy the complete learner roster from any other existing class with one click to avoid manual encoding.
                </p>
                
                <div className="space-y-3">
                  <label className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 block">Roster Source Class</label>
                  <select
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
                            importRosterToActive(studentsToImport);
                            showCustomAlert(`Successfully imported ${studentsToImport.length} students!`, "Import Successful", "success");
                          },
                          "Clone Class Roster"
                        );
                      } else {
                        showCustomAlert("The selected class has no students in its roster.", "Empty Class Roster", "error");
                      }
                      e.target.value = "";
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-150 dark:border-slate-800 rounded-xl py-2.5 px-3 text-xs focus:outline-hidden font-bold"
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
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-2xl p-6 md:p-8 shadow-3xs space-y-4 h-fit">
              <h3 className="font-sans font-black text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Upload className="h-5 w-5 text-emerald-600" />
                Batch Paste CSV / Excel Import
              </h3>
              <p className="text-[10px] text-slate-400 leading-normal font-semibold">
                Paste student lists directly from CSV or Excel/Google Sheets. Supports names with quotes &amp; commas e.g. <span className="font-mono text-emerald-600 dark:text-emerald-400">117563820451,"Dela Cruz, John Reyes",M</span>
              </p>

              {!csvPasteMode ? (
                <button
                  type="button"
                  onClick={() => setCsvPasteMode(true)}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-black rounded-xl cursor-pointer"
                >
                  Open Paste Portal
                </button>
              ) : (
                <div className="space-y-3">
                  <textarea
                    placeholder={'117563820451,"Dela Cruz, John Reyes",M\n109827364512,"Santos, Maria B.",F,2026-101\n102938475610,"Reyes, Juan A.",M,2026-102'}
                    value={csvInput}
                    onChange={(e) => setCsvInput(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-150 dark:border-slate-800 rounded-xl p-2.5 text-xs focus:outline-hidden font-mono h-28 resize-none leading-normal"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleCsvImport}
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl cursor-pointer"
                    >
                      Import Batch
                    </button>
                    <button
                      type="button"
                      onClick={() => { setCsvInput(''); setCsvPasteMode(false); }}
                      className="py-2 px-3 bg-slate-100 dark:bg-slate-800 text-xs font-black rounded-xl cursor-pointer"
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
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-6 md:p-8 rounded-2xl shadow-3xs space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 dark:border-slate-850 pb-4">
              <div>
                <h3 className="font-sans font-black text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <Printer className="h-5 w-5 text-indigo-600 animate-pulse" />
                  Printable Report Suite (Phase 8)
                </h3>
                <p className="text-xs text-slate-400 mt-1 font-semibold">Generate structured report sheets completely matching DepEd output standards.</p>
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
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition-colors cursor-pointer shadow-3xs disabled:opacity-50"
                >
                  <FileDown className="h-4 w-4" />
                  <span>{isExportingPDF ? 'Generating PDF...' : 'Download PDF (All Pages)'}</span>
                </button>
                <button
                  onClick={handlePrint}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-black rounded-xl transition-colors cursor-pointer shadow-3xs"
                >
                  <Printer className="h-4 w-4" /> Direct Print
                </button>
                <button
                  onClick={handleExportCSVReport}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl transition-colors cursor-pointer shadow-3xs"
                >
                  <FileSpreadsheet className="h-4 w-4" /> Export CSV
                </button>
              </div>
            </div>

            {/* Individual report options view selector */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              
              {/* Report 1: Learner Summary Card Selector */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-150 dark:border-slate-850 space-y-3">
                <div className="flex items-center gap-2 text-indigo-650 dark:text-indigo-400 font-black text-xs uppercase tracking-wider">
                  <FileText className="h-4.5 w-4.5" /> Learner Individual Progress Card
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">
                  Generates an individual student progress slip detailing WW/PT percentages, examination marks, final grades, and official comments.
                </p>
                <div className="flex gap-2">
                  <select
                    value={reportStudentId}
                    onChange={(e) => setReportStudentId(e.target.value)}
                    className="flex-1 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-150 dark:border-slate-800 rounded-lg py-1.5 px-2.5 text-xs font-bold focus:outline-hidden"
                  >
                    <option value="">-- Choose Learner --</option>
                    {activeProject.students.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Report 2: Class assessment statistics summary */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-150 dark:border-slate-850 space-y-3">
                <div className="flex items-center gap-2 text-indigo-650 dark:text-indigo-400 font-black text-xs uppercase tracking-wider">
                  <BarChart4 className="h-4.5 w-4.5" /> Assessment Difficulty & Passing Ratios
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">
                  Reviews assessment-wise parameters: high grades, low scores, class averages, and percentage passes.
                </p>
                <div className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                  ✓ Ready for review. Scroll down to see full sheets.
                </div>
              </div>

            </div>
          </div>

          {/* Printable Layout Canvas */}
          <div id="printable-report-card" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl p-8 shadow-xs max-w-4xl mx-auto space-y-8 font-sans print:border-0 print:shadow-none print:p-0">
            
            {/* Report Header */}
            <div className="text-center space-y-1.5 border-b-2 border-slate-900 dark:border-slate-100 pb-5">
              <span className="text-[10px] font-mono font-black tracking-widest text-slate-400 uppercase">OFFICIAL ACADEMIC GRADED DOCUMENT</span>
              <h1 className="text-lg font-black tracking-tight text-slate-900 dark:text-white uppercase">{activeProject.schoolName}</h1>
              <p className="text-xs text-slate-450 dark:text-slate-400 font-bold">
                DepEd Region Grade report • S.Y. {activeProject.schoolYear} • {activeProject.quarter}
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
                            <span className="font-mono">{g.wwPercentage}% score &rarr; {g.weightedWW}% weighted</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Performance Tasks Ratio:</span>
                            <span className="font-mono">{g.ptPercentage}% score &rarr; {g.weightedPT}% weighted</span>
                          </div>
                          <div className="flex justify-between pb-1.5 border-b border-slate-200 dark:border-slate-800">
                            <span>Quarterly Periodic Exam:</span>
                            <span className="font-mono">{g.qePercentage}% score &rarr; {g.weightedQA}% weighted</span>
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
                  {activeProject.students.filter(s => s.status === 'Active').sort((a,b) => a.name.localeCompare(b.name)).map((s, idx) => {
                    const g = computeProjectStudentGrade(activeProject, s.id, globalSettings.subjects);
                    return (
                      <tr key={s.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 font-mono">{idx + 1}</td>
                        <td className="py-2.5 uppercase text-slate-950">{s.name}</td>
                        <td className="py-2.5 text-center font-mono">{s.lrn}</td>
                        <td className="py-2.5 text-center">{s.sex[0]}</td>
                        <td className="py-2.5 text-center font-mono">{g.weightedWW}%</td>
                        <td className="py-2.5 text-center font-mono">{g.weightedPT}%</td>
                        <td className="py-2.5 text-center font-mono">{g.weightedQA}%</td>
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
                  Prof. Clara Santos
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Modify Student Profile</h3>
              <button onClick={() => setEditingStudent(null)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-400">Learner Ref. Number (LRN)</label>
                <input
                  type="text"
                  maxLength={12}
                  value={editingStudent.lrn}
                  onChange={(e) => setEditingStudent({ ...editingStudent, lrn: e.target.value.replace(/\D/g, '') })}
                  className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-150 dark:border-slate-800 rounded-xl py-2 px-3 mt-1 font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-400">Student Name</label>
                <input
                  type="text"
                  value={editingStudent.name}
                  onChange={(e) => setEditingStudent({ ...editingStudent, name: e.target.value.toUpperCase() })}
                  className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-150 dark:border-slate-800 rounded-xl py-2 px-3 mt-1 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-400">Sex (Gender)</label>
                  <select
                    value={editingStudent.sex}
                    onChange={(e) => setEditingStudent({ ...editingStudent, sex: e.target.value as any })}
                    className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-150 dark:border-slate-800 rounded-xl py-2 px-3 mt-1 font-bold"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-400">Registration Status</label>
                  <select
                    value={editingStudent.status}
                    onChange={(e) => setEditingStudent({ ...editingStudent, status: e.target.value as any })}
                    className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-150 dark:border-slate-800 rounded-xl py-2 px-3 mt-1 font-bold"
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
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl cursor-pointer"
                >
                  Save Profile Changes
                </button>
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="py-2 px-4 bg-slate-100 text-slate-800 font-bold rounded-xl cursor-pointer"
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-7 max-w-lg w-full space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <Plus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    Add Assessment Column
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold">
                    Create WW, PT, or QE entry for {activeProject.subject} (Grade {activeProject.gradeLevel}-{activeProject.section})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddAssessmentModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleModalSubmitAssessment} className="space-y-4">
              {/* Category Selector Cards */}
              <div>
                <label className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1.5 block">
                  Select Grading Component Category
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleModalCategoryChange('WW')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      modalAssCategory === 'WW'
                        ? 'bg-emerald-50/80 dark:bg-emerald-950/50 border-emerald-500 text-emerald-900 dark:text-emerald-100 ring-2 ring-emerald-500/30'
                        : 'bg-slate-50/50 dark:bg-slate-950/30 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100/50'
                    }`}
                  >
                    <div className="text-[11px] font-black flex items-center justify-between">
                      <span>Written Work</span>
                      <span className="text-[9px] font-mono font-extrabold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded">WW</span>
                    </div>
                    <div className="text-[9px] text-slate-500 dark:text-slate-400 mt-1 font-semibold">
                      Quizzes & Written Tests
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleModalCategoryChange('PT')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      modalAssCategory === 'PT'
                        ? 'bg-teal-50/80 dark:bg-teal-950/50 border-teal-500 text-teal-900 dark:text-teal-100 ring-2 ring-teal-500/30'
                        : 'bg-slate-50/50 dark:bg-slate-950/30 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100/50'
                    }`}
                  >
                    <div className="text-[11px] font-black flex items-center justify-between">
                      <span>Performance Task</span>
                      <span className="text-[9px] font-mono font-extrabold bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300 px-1.5 py-0.5 rounded">PT</span>
                    </div>
                    <div className="text-[9px] text-slate-500 dark:text-slate-400 mt-1 font-semibold">
                      Projects & Performance Tasks
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleModalCategoryChange('QE')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      modalAssCategory === 'QE'
                        ? 'bg-emerald-50/80 dark:bg-emerald-950/50 border-emerald-500 text-emerald-900 dark:text-emerald-100 ring-2 ring-emerald-500/30'
                        : 'bg-slate-50/50 dark:bg-slate-950/30 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100/50'
                    }`}
                  >
                    <div className="text-[11px] font-black flex items-center justify-between">
                      <span>Quarterly Exam</span>
                      <span className="text-[9px] font-mono font-extrabold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded">QE</span>
                    </div>
                    <div className="text-[9px] text-slate-500 dark:text-slate-400 mt-1 font-semibold">
                      Periodic Quarterly Exam
                    </div>
                  </button>
                </div>
              </div>

              {/* Quick Preset Title Templates */}
              <div>
                <label className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1 block">
                  Quick Naming Presets
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {modalAssCategory === 'WW' && [
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
                      className="text-[10px] bg-slate-100 dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-950 text-slate-700 dark:text-slate-300 hover:text-emerald-700 font-bold py-1 px-2.5 rounded-lg transition-colors cursor-pointer"
                    >
                      {preset}
                    </button>
                  ))}

                  {modalAssCategory === 'PT' && [
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
                      className="text-[10px] bg-slate-100 dark:bg-slate-800 hover:bg-teal-100 dark:hover:bg-teal-950 text-slate-700 dark:text-slate-300 hover:text-teal-700 font-bold py-1 px-2.5 rounded-lg transition-colors cursor-pointer"
                    >
                      {preset}
                    </button>
                  ))}

                  {modalAssCategory === 'QE' && [
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
                      className="text-[10px] bg-slate-100 dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-950 text-slate-700 dark:text-slate-300 hover:text-emerald-700 font-bold py-1 px-2.5 rounded-lg transition-colors cursor-pointer"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title & Perfect Score */}
              <div>
                <label className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  Assessment Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Quiz 1 or PT2: Lab experiment"
                  value={modalAssName}
                  onChange={(e) => setModalAssName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 px-3 text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-emerald-500 mt-1"
                />
              </div>

              {/* Perfect Score (HPS) with quick score chips */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    Highest Possible Score (HPS / Max)
                  </label>
                  <div className="flex items-center gap-1">
                    {[10, 15, 20, 30, 50, 100].map(pts => (
                      <button
                        key={pts}
                        type="button"
                        onClick={() => setModalAssPerfectScore(pts)}
                        className={`text-[9px] font-mono font-extrabold px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                          modalAssPerfectScore === pts
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                        }`}
                      >
                        {pts} pts
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  type="number"
                  required
                  min={1}
                  max={1000}
                  value={modalAssPerfectScore}
                  onChange={(e) => setModalAssPerfectScore(parseInt(e.target.value) || 20)}
                  className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 px-3 text-xs font-mono font-bold focus:outline-hidden focus:ring-2 focus:ring-emerald-500 mt-1"
                />
              </div>

              {/* Date & Optional Description */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    Conduct Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={modalAssDate}
                    onChange={(e) => setModalAssDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs font-mono font-semibold focus:outline-hidden mt-1"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    Notes / Rubric (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Brief scope notes..."
                    value={modalAssDescription}
                    onChange={(e) => setModalAssDescription(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs font-medium focus:outline-hidden mt-1"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition-colors cursor-pointer shadow-3xs flex items-center justify-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Column to Gradebook</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddAssessmentModalOpen(false)}
                  className="py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
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
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850">
              {customAlert.type === 'success' ? (
                <Sparkles className="h-6 w-6 text-emerald-500 animate-pulse" />
              ) : customAlert.type === 'error' ? (
                <AlertCircle className="h-6 w-6 text-rose-500 animate-bounce" />
              ) : (
                <HelpCircle className="h-6 w-6 text-indigo-500" />
              )}
            </div>
            
            <div className="space-y-1.5">
              <h3 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest">{customAlert.title}</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold leading-relaxed whitespace-pre-line">{customAlert.message}</p>
            </div>

            <button
              type="button"
              onClick={() => setCustomAlert(null)}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl cursor-pointer shadow-4xs"
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
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850">
              <AlertCircle className="h-6 w-6 text-indigo-500 animate-pulse" />
            </div>
            
            <div className="space-y-1.5">
              <h3 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest">{customConfirm.title}</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">{customConfirm.message}</p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  customConfirm.onConfirm();
                  setCustomConfirm(null);
                }}
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl cursor-pointer shadow-4xs"
              >
                Yes, Execute
              </button>
              <button
                type="button"
                onClick={() => setCustomConfirm(null)}
                className="py-2 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 text-xs font-black rounded-xl cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
