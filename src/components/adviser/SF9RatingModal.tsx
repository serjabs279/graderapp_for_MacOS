import React, { useState } from 'react';
import { getCalendar, getFirstPeriod } from '../../calendar/academicCalendar';
import { useApp } from '../../context/AppContext';
import { AdviserClass, ObservedValueRating } from '../../types';
import { StudentGradeRow, DEFAULT_SHS_TRACKS_STRANDS } from '../../utils/adviserUtils';
import { X, Check, ClipboardList, CalendarDays, Award, GraduationCap, Sparkles } from 'lucide-react';

interface Props {
  adviserClass: AdviserClass;
  studentRow: StudentGradeRow;
  onClose: () => void;
}

export default function SF9RatingModal({ adviserClass, studentRow, onClose }: Props) {
  const { setObservedValue, setAttendance, updateAdviserClass } = useApp();
  const [activeTab, setActiveTab] = useState<'observed' | 'attendance' | 'trackStrand'>('observed');
  const [localAge, setLocalAge] = useState<string>(studentRow.age !== undefined ? String(studentRow.age) : '');

  const studentObj = adviserClass.students.find(s => s.lrn === studentRow.lrn);
  const [localTrackStrand, setLocalTrackStrand] = useState<string>(
    studentRow.trackStrand ?? studentObj?.trackStrand ?? ''
  );
  const [customTrackInput, setCustomTrackInput] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);

  // Available tracks from adviserClass settings or standard defaults
  const availableTracks = (adviserClass.availableTracksStrands && adviserClass.availableTracksStrands.length > 0)
    ? adviserClass.availableTracksStrands
    : DEFAULT_SHS_TRACKS_STRANDS;
  
  // Quarters
  const quartersList = getCalendar().periods.map(p => p.id);

  // Current values
  const studentObserved = adviserClass.observedValues.find(v => v.studentLRN === studentRow.lrn);
  const studentAttendance = adviserClass.attendance.find(a => a.studentLRN === studentRow.lrn);

  // Core Value Fields
  const coreValues = [
    { field: 'responsible' as const, label: '1. Responsible', sub: 'Demonstrates reliability and accountability in tasks and duties' },
    { field: 'obedient' as const, label: '2. Obedient', sub: 'Follows rules, regulations, and instructions of authority' },
    { field: 'compassionate' as const, label: '3. Compassionate', sub: 'Shows empathy, care, and understanding towards others' },
    { field: 'kind' as const, label: '4. Kind', sub: 'Exhibits helpfulness, friendliness, and politeness to all' },
    { field: 'serviceOriented' as const, label: '5. Service Oriented', sub: 'Actively participates in classroom, school, and community activities' }
  ];

  // Ratings Scale
  const ratings: { value: ObservedValueRating; label: string }[] = [
    { value: 'AO', label: 'AO (Always Observed)' },
    { value: 'SO', label: 'SO (Sometimes Observed)' },
    { value: 'RO', label: 'RO (Rarely Observed)' },
    { value: 'NO', label: 'NO (Not Observed)' },
    { value: '', label: 'None' }
  ];

  // Local state to keep updates before saving
  const [localObserved, setLocalObserved] = useState<Record<string, Record<string, ObservedValueRating>>>(() => {
    const initial: Record<string, Record<string, ObservedValueRating>> = {};
    quartersList.forEach(q => {
      initial[q] = {
        responsible: studentObserved?.quarters[q]?.responsible ?? '',
        obedient: studentObserved?.quarters[q]?.obedient ?? '',
        compassionate: studentObserved?.quarters[q]?.compassionate ?? '',
        kind: studentObserved?.quarters[q]?.kind ?? '',
        serviceOriented: studentObserved?.quarters[q]?.serviceOriented ?? ''
      };
    });
    return initial;
  });

  const [localAttendance, setLocalAttendance] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    adviserClass.attendanceConfig.months.forEach(m => {
      const entry = studentAttendance?.months[m];
      initial[m] = entry ? entry.daysAbsent : 0;
    });
    return initial;
  });

  const handleRatingChange = (quarter: string, field: 'responsible' | 'obedient' | 'compassionate' | 'kind' | 'serviceOriented', val: ObservedValueRating) => {
    setLocalObserved(prev => ({
      ...prev,
      [quarter]: {
        ...prev[quarter],
        [field]: val
      }
    }));
  };

  const handleAbsentChange = (month: string, val: string) => {
    const num = Math.max(0, parseInt(val) || 0);
    const maxDays = adviserClass.attendanceConfig.schoolDaysPerMonth[month] || 0;
    const finalVal = Math.min(num, maxDays);
    setLocalAttendance(prev => ({
      ...prev,
      [month]: finalVal
    }));
  };

  const handleSave = () => {
    // 1. Save Observed Values
    quartersList.forEach(q => {
      const qObs = localObserved[q];
      setObservedValue(adviserClass.id, studentRow.lrn, q, 'responsible', qObs.responsible);
      setObservedValue(adviserClass.id, studentRow.lrn, q, 'obedient', qObs.obedient);
      setObservedValue(adviserClass.id, studentRow.lrn, q, 'compassionate', qObs.compassionate);
      setObservedValue(adviserClass.id, studentRow.lrn, q, 'kind', qObs.kind);
      setObservedValue(adviserClass.id, studentRow.lrn, q, 'serviceOriented', qObs.serviceOriented);
    });

    // 2. Save Attendance
    adviserClass.attendanceConfig.months.forEach(m => {
      const daysAbsent = localAttendance[m] ?? 0;
      setAttendance(adviserClass.id, studentRow.lrn, m, daysAbsent);
    });

    // 3. Save Age and Track & Strand
    const parsedAge = localAge ? parseInt(localAge, 10) : undefined;
    updateAdviserClass(adviserClass.id, cls => ({
      ...cls,
      students: cls.students.map(s => s.lrn === studentRow.lrn ? {
        ...s,
        age: parsedAge,
        trackStrand: localTrackStrand.trim() || undefined
      } : s)
    }));

    onClose();
  };

  return (
    <div className="ui-dialog-overlay">
      <div role="dialog" aria-modal="true" aria-label={`SF9 details for ${studentRow.name}`} className="ui-dialog max-w-4xl">
        
        {/* Header */}
        <div className="ui-dialog-header flex-wrap">
          <div className="min-w-0 flex-1 space-y-1">
            <h3 className="ui-section-title">
              Student Assessment Card (SF9 Details)
            </h3>
            <p className="text-sm tabular-nums font-medium text-slate-500 truncate text-pretty">
              {studentRow.name} • LRN: {studentRow.lrn}
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-sm font-semibold text-slate-500">Age:</span>
              <input
                type="number"
                value={localAge}
                onChange={e => setLocalAge(e.target.value)}
                placeholder="Auto"
                className="ui-field w-12 text-center tabular-nums"
              />
            </div>
            <button onClick={onClose} className="adviser-button">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="ui-dialog-body flex-1 space-y-5">
        {/* Quick SHS Track & Strand Banner / Selector Bar */}
        {adviserClass.workspace === 'SHS' && (
          <div className="px-6 py-2.5 bg-amber-50/70 dark:bg-amber-950/20 border-b border-amber-200/50 dark:border-amber-900/30 flex flex-wrap items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="font-medium text-slate-700 dark:text-slate-300">SHS Track &amp; Strand:</span>
            </div>
            <div className="flex items-center gap-2 flex-1 max-w-md justify-end">
              <select
                value={localTrackStrand}
                onChange={e => setLocalTrackStrand(e.target.value)}
                className="ui-field"
              >
                <option value="">Default ({adviserClass.trackStrand || 'Section Default'})</option>
                {availableTracks.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
                {localTrackStrand && !availableTracks.includes(localTrackStrand) && (
                  <option value={localTrackStrand}>{localTrackStrand} (Custom)</option>
                )}
              </select>
            </div>
          </div>
        )}

        {/* Tab Controls */}
        <div className="px-6 py-2 bg-slate-50/50 dark:bg-slate-950/20 border-b border-slate-100 dark:border-slate-800/60 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('observed')}
            className={`px-3.5 py-1.5 rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === "observed"
                ? "bg-amber-600 text-white"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
            } `}
          >
            <Award className="h-3.5 w-3.5" /> Learner Observed Values
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            className={`px-3.5 py-1.5 rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === "attendance"
                ? "bg-amber-600 text-white"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
            } `}
          >
            <CalendarDays className="h-3.5 w-3.5" /> Attendance Record
          </button>
          {adviserClass.workspace === 'SHS' && (
            <button
              onClick={() => setActiveTab('trackStrand')}
              className={`px-3.5 py-1.5 rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === "trackStrand"
                  ? "bg-amber-600 text-white"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
              } `}
            >
              <GraduationCap className="h-3.5 w-3.5" /> Track &amp; Strand
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="min-w-0">
          
          {/* TAB 1: Observed Values Rating Grid */}
          {activeTab === 'observed' && (
            <div className="space-y-6">
              <div className="bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200/40 dark:border-amber-900/10 rounded-xl p-4 text-sm text-amber-800 dark:text-amber-300 leading-relaxed font-semibold">
                Rate the behavior statements using the official non-numerical scale:
                <div className="flex flex-wrap gap-x-6 gap-y-2 mt-2 tabular-nums">
                  <span><strong>AO</strong> - Always Observed</span>
                  <span><strong>SO</strong> - Sometimes Observed</span>
                  <span><strong>RO</strong> - Rarely Observed</span>
                  <span><strong>NO</strong> - Not Observed</span>
                </div>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse text-sm tabular-nums">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800">
                      <th className="p-3 font-medium text-slate-500">Core Values & Statements</th>
                      {quartersList.map(q => (
                        <th key={q} className="p-3 text-center font-medium text-slate-500 w-24">
                          {q.replace(' Quarter', '')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {coreValues.map(({ field, label, sub }) => (
                      <tr key={field} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/15 transition-colors">
                        <td className="p-3.5 space-y-0.5">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">{label}</div>
                          <div className="text-sm text-slate-500 font-semibold">{sub}</div>
                        </td>
                        {quartersList.map(q => {
                          const currentVal = localObserved[q]?.[field] ?? '';
                          return (
                            <td key={q} className="p-3 text-center">
                              <select
                                value={currentVal}
                                onChange={e => handleRatingChange(q, field, e.target.value as ObservedValueRating)}
                                className="ui-field w-20 text-center"
                              >
                                {ratings.map(r => (
                                  <option key={r.value} value={r.value}>{r.value || '—'}</option>
                                ))}
                              </select>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: Attendance Input Grid */}
          {activeTab === 'attendance' && (
            <div className="space-y-6">
              <div className="bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200/40 dark:border-amber-900/10 rounded-xl p-4 text-sm text-amber-800 dark:text-amber-300 leading-relaxed font-semibold">
                Input the number of days the student was absent for each month. The number of days present will automatically be calculated based on the total school days configured.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {adviserClass.attendanceConfig.months.map(m => {
                  const maxDays = adviserClass.attendanceConfig.schoolDaysPerMonth[m] || 0;
                  const absent = localAttendance[m] ?? 0;
                  const present = Math.max(0, maxDays - absent);
                  
                  return (
                    <div key={m} className="p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col justify-between gap-3">
                      <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800/60 pb-2">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{m}</span>
                        <span className="text-sm tabular-nums font-medium text-slate-500">
                          {maxDays} Days
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="ui-label">Absent</label>
                          <input
                            type="number"
                            min={0}
                            max={maxDays}
                            value={absent}
                            onChange={e => handleAbsentChange(m, e.target.value)}
                            className="ui-field tabular-nums"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="ui-label">Present</label>
                          <div className="w-full bg-slate-100 dark:bg-slate-800 border border-transparent rounded-xl px-3 py-1.5 text-sm tabular-nums font-semibold text-slate-600 dark:text-slate-500 select-none">
                            {present}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: SHS Track & Strand Selector */}
          {activeTab === 'trackStrand' && adviserClass.workspace === 'SHS' && (
            <div className="space-y-6 max-w-2xl mx-auto">
              <div className="bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/30 rounded-xl p-4 text-sm text-amber-800 dark:text-amber-300 leading-relaxed font-medium">
                Set the official Senior High School Track and Strand for <strong>{studentRow.name}</strong>. This will be printed on their official SF-9 Learner Progress Report Card and SF-9 HTML preview.
              </div>

              {/* Effective Preview Card */}
              <div className="bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-2">
                <span className="text-sm font-semibold text-slate-500">
                  Effective Track &amp; Strand on SF-9:
                </span>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-amber-500 shrink-0" />
                    <span>{localTrackStrand || adviserClass.trackStrand || 'Senior High School (Not set)'}</span>
                  </div>
                  <span className={`text-sm font-semibold px-2.5 py-1 rounded-lg shrink-0 ${
                    localTrackStrand
                      ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                      : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                  } `}>
                    {localTrackStrand ? 'Student Specific' : 'Section Default'}
                  </span>
                </div>
              </div>

              {/* Dropdown Selection */}
              <div className="space-y-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
                <label className="ui-label">
                  Select Track &amp; Strand from Section Settings
                </label>
                <select
                  value={localTrackStrand}
                  onChange={e => {
                    setLocalTrackStrand(e.target.value);
                    if (e.target.value) setIsCustomMode(false);
                  }}
                  className="ui-field"
                >
                  <option value="">— Use Section Default ({adviserClass.trackStrand || 'None'}) —</option>
                  {availableTracks.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                  {localTrackStrand && !availableTracks.includes(localTrackStrand) && (
                    <option value={localTrackStrand}>{localTrackStrand} (Custom)</option>
                  )}
                </select>
                <p className="text-sm text-slate-500 text-pretty">
                  Options are configured globally in <span className="font-semibold text-slate-600 dark:text-slate-300">Adviser Settings → SHS Tracks &amp; Strands</span>.
                </p>

                {/* Custom Track/Strand Option */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      Need a custom or unlisted strand for this learner?
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsCustomMode(!isCustomMode)}
                      className="adviser-button"
                    >
                      {isCustomMode ? 'Hide Custom Input' : '+ Enter Custom Strand'}
                    </button>
                  </div>

                  {isCustomMode && (
                    <div className="flex gap-2 pt-2">
                      <input
                        type="text"
                        value={customTrackInput}
                        onChange={e => setCustomTrackInput(e.target.value)}
                        placeholder="e.g. Arts and Design - Visual Arts"
                        className="ui-field"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (customTrackInput.trim()) {
                            setLocalTrackStrand(customTrackInput.trim());
                            setCustomTrackInput('');
                          }
                        }}
                        disabled={!customTrackInput.trim()}
                        className="adviser-button-primary"
                      >
                        Apply
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>

        </div>
        {/* Footer Actions */}
        <div className="ui-dialog-footer">
          <button
            type="button"
            onClick={onClose}
            className="adviser-button"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="adviser-button-primary"
          >
            <Check className="h-4 w-4" /> Save changes
          </button>
        </div>

      </div>
    </div>
  );
}
