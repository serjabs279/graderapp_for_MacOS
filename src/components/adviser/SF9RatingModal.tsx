import React, { useState } from 'react';
import { getCalendar, getFirstPeriod } from '../../calendar/academicCalendar';
import { useApp } from '../../context/AppContext';
import { AdviserClass, ObservedValueRating } from '../../types';
import { StudentGradeRow } from '../../utils/adviserUtils';
import { X, Check, ClipboardList, CalendarDays, Award } from 'lucide-react';

interface Props {
  adviserClass: AdviserClass;
  studentRow: StudentGradeRow;
  onClose: () => void;
}

export default function SF9RatingModal({ adviserClass, studentRow, onClose }: Props) {
  const { setObservedValue, setAttendance, updateAdviserClass } = useApp();
  const [activeTab, setActiveTab] = useState<'observed' | 'attendance'>('observed');
  const [localAge, setLocalAge] = useState<string>(studentRow.age !== undefined ? String(studentRow.age) : '');
  
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

    // 3. Save Age if updated
    const parsedAge = localAge ? parseInt(localAge, 10) : undefined;
    if (parsedAge !== studentRow.age) {
      updateAdviserClass(adviserClass.id, cls => ({
        ...cls,
        students: cls.students.map(s => s.lrn === studentRow.lrn ? { ...s, age: parsedAge } : s)
      }));
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="font-sans font-black text-sm text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Student Assessment Card (SF9 Details)
            </h3>
            <p className="text-xs font-mono font-bold text-slate-500">
              {studentRow.name} • LRN: {studentRow.lrn}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-black uppercase text-slate-400">Age:</span>
              <input
                type="number"
                value={localAge}
                onChange={e => setLocalAge(e.target.value)}
                placeholder="Auto"
                className="w-14 px-1 py-0.5 text-xs font-bold font-mono text-slate-800 dark:text-slate-200 bg-transparent text-center focus:outline-none"
              />
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-450 transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="px-6 py-2 bg-slate-50/50 dark:bg-slate-950/20 border-b border-slate-100 dark:border-slate-800/60 flex gap-2">
          <button
            onClick={() => setActiveTab('observed')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'observed'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Award className="h-4 w-4" /> Learner Observed Values
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'attendance'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <CalendarDays className="h-4 w-4" /> Attendance Record
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 min-h-[400px]">
          
          {/* TAB 1: Observed Values Rating Grid */}
          {activeTab === 'observed' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200/40 dark:border-amber-900/10 rounded-2xl p-4 text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed font-semibold">
                Rate the behavior statements using the official non-numerical scale:
                <div className="flex flex-wrap gap-x-6 gap-y-2 mt-2 font-mono">
                  <span><strong>AO</strong> - Always Observed</span>
                  <span><strong>SO</strong> - Sometimes Observed</span>
                  <span><strong>RO</strong> - Rarely Observed</span>
                  <span><strong>NO</strong> - Not Observed</span>
                </div>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-850">
                      <th className="p-3 font-bold text-slate-500">Core Values & Statements</th>
                      {quartersList.map(q => (
                        <th key={q} className="p-3 text-center font-bold text-slate-500 w-24">
                          {q.replace(' Quarter', '')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {coreValues.map(({ field, label, sub }) => (
                      <tr key={field} className="hover:bg-slate-50/30 dark:hover:bg-slate-850/15 transition-colors">
                        <td className="p-3.5 space-y-0.5">
                          <div className="font-extrabold text-slate-800 dark:text-slate-200">{label}</div>
                          <div className="text-[10px] text-slate-400 font-semibold">{sub}</div>
                        </td>
                        {quartersList.map(q => {
                          const currentVal = localObserved[q]?.[field] ?? '';
                          return (
                            <td key={q} className="p-3 text-center">
                              <select
                                value={currentVal}
                                onChange={e => handleRatingChange(q, field, e.target.value as ObservedValueRating)}
                                className="w-20 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg py-1 px-2 text-center text-xs font-mono font-black text-slate-850 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
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
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200/40 dark:border-amber-900/10 rounded-2xl p-4 text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed font-semibold">
                Input the number of days the student was absent for each month. The number of days present will automatically be calculated based on the total school days configured.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {adviserClass.attendanceConfig.months.map(m => {
                  const maxDays = adviserClass.attendanceConfig.schoolDaysPerMonth[m] || 0;
                  const absent = localAttendance[m] ?? 0;
                  const present = Math.max(0, maxDays - absent);
                  
                  return (
                    <div key={m} className="p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col justify-between gap-3 shadow-sm">
                      <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800/60 pb-2">
                        <span className="font-extrabold text-slate-800 dark:text-slate-250">{m}</span>
                        <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">
                          {maxDays} Days
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Absent</label>
                          <input
                            type="number"
                            min={0}
                            max={maxDays}
                            value={absent}
                            onChange={e => handleAbsentChange(m, e.target.value)}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-350 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-mono font-black focus:outline-none focus:ring-1 focus:ring-amber-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Present</label>
                          <div className="w-full bg-slate-100 dark:bg-slate-800 border border-transparent rounded-xl px-3 py-1.5 text-xs font-mono font-black text-emerald-600 dark:text-emerald-450 select-none">
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

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-805 dark:text-slate-200 text-xs font-black rounded-xl cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-xl cursor-pointer shadow-sm transition-colors flex items-center gap-1.5"
          >
            <Check className="h-4 w-4" /> Save changes
          </button>
        </div>

      </div>
    </div>
  );
}
