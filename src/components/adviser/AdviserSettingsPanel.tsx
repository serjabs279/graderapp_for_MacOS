import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { AdviserClass, HonorsCriteria } from '../../types';
import { Settings2, Save, Trash2, ShieldAlert, CheckCircle2, AlertTriangle, Calendar, Upload, Image as ImageIcon, ArrowUp, ArrowDown, ListOrdered, RotateCcw, Plus, GraduationCap, X, Sparkles } from 'lucide-react';
import { DEFAULT_SHS_TRACKS_STRANDS } from '../../utils/adviserUtils';

interface Props {
  adviserClass: AdviserClass;
}

export default function AdviserSettingsPanel({ adviserClass }: Props) {
  const { updateAdviserClass, deleteAdviserClass, setActiveAdviserClass } = useApp();

  const defaultStandardSubjects = adviserClass.workspace === 'JHS'
    ? ['English', 'Filipino', 'Mathematics', 'Science', 'AP', 'MAPEH', 'Values Education', 'TLE']
    : [];

  // Initial subjects list: merge existing subjectOrder or default with imported subject names
  const getInitialSubjectList = () => {
    const existingOrder = adviserClass.subjectOrder && adviserClass.subjectOrder.length > 0
      ? adviserClass.subjectOrder
      : defaultStandardSubjects;

    const importedSubjectNames = Array.from(new Set(adviserClass.importedGrades.map(g => g.subjectName)));
    const langLabels = adviserClass.languageGroups.map(lg => lg.label);

    const merged = [
      ...existingOrder,
      ...importedSubjectNames.filter(s => !existingOrder.includes(s)),
      ...langLabels.filter(s => !existingOrder.includes(s))
    ];
    return Array.from(new Set(merged));
  };

  const [subjectOrderList, setSubjectOrderList] = useState<string[]>(getInitialSubjectList());
  const [adviserName, setAdviserName] = useState(adviserClass.adviserName);
  const [principalName, setPrincipalName] = useState(adviserClass.principalName || '');
  const [passingGrade, setPassingGrade] = useState(adviserClass.promotionPassingGrade.toString());
  const [trackStrand, setTrackStrand] = useState(adviserClass.trackStrand || '');
  const [availableTracks, setAvailableTracks] = useState<string[]>(() => {
    if (adviserClass.availableTracksStrands && adviserClass.availableTracksStrands.length > 0) {
      return adviserClass.availableTracksStrands;
    }
    return [...DEFAULT_SHS_TRACKS_STRANDS];
  });
  const [newTrackInput, setNewTrackInput] = useState('');
  const [schoolId, setSchoolId] = useState(adviserClass.schoolId || '');
  const [division, setDivision] = useState(adviserClass.division || '');
  const [region, setRegion] = useState(adviserClass.region || '');
  const [district, setDistrict] = useState(adviserClass.district || '');

  // Sync subject order list when adviserClass changes externally (e.g. after a subject rename)
  useEffect(() => {
    setSubjectOrderList(getInitialSubjectList());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adviserClass.subjectOrder, adviserClass.importedGrades, adviserClass.languageGroups]);
  
  const [honors, setHonors] = useState<HonorsCriteria>(adviserClass.honorsCriteria);
  const [monthsStr, setMonthsStr] = useState(adviserClass.attendanceConfig.months.join(', '));
  const [schoolDays, setSchoolDays] = useState(adviserClass.attendanceConfig.schoolDaysPerMonth);

  // Logo uploads local state
  const [depedLogo, setDepedLogo] = useState(adviserClass.depedLogoBase64 || '');
  const [schoolLogo, setSchoolLogo] = useState(adviserClass.schoolLogoBase64 || '');

  const [isSaved, setIsSaved] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'deped' | 'school') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (type === 'deped') {
        setDepedLogo(base64);
      } else {
        setSchoolLogo(base64);
      }
    };
    reader.readAsDataURL(file);
  };

  const moveSubject = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === subjectOrderList.length - 1) return;
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const nextList = [...subjectOrderList];
    const temp = nextList[index];
    nextList[index] = nextList[targetIdx];
    nextList[targetIdx] = temp;
    setSubjectOrderList(nextList);
  };

  const handleAddTrack = () => {
    const trimmed = newTrackInput.trim();
    if (!trimmed) return;
    if (!availableTracks.some(t => t.toLowerCase() === trimmed.toLowerCase())) {
      setAvailableTracks(prev => [...prev, trimmed]);
      if (!trackStrand) setTrackStrand(trimmed);
    }
    setNewTrackInput('');
  };

  const handleRemoveTrack = (trackToRemove: string) => {
    setAvailableTracks(prev => prev.filter(t => t !== trackToRemove));
    if (trackStrand === trackToRemove) {
      setTrackStrand('');
    }
  };

  const handleResetTracks = () => {
    setAvailableTracks([...DEFAULT_SHS_TRACKS_STRANDS]);
  };

  const handleSave = () => {
    updateAdviserClass(adviserClass.id, cls => {
      const updatedMonths = monthsStr.split(',').map(m => m.trim()).filter(Boolean);
      const updatedSchoolDays = { ...schoolDays };
      
      // cleanup removed months
      Object.keys(updatedSchoolDays).forEach(k => {
        if (!updatedMonths.includes(k)) delete updatedSchoolDays[k];
      });
      // add missing months
      updatedMonths.forEach(m => {
        if (!(m in updatedSchoolDays)) updatedSchoolDays[m] = 20;
      });

      return {
        ...cls,
        subjectOrder: subjectOrderList,
        adviserName,
        principalName,
        promotionPassingGrade: Number(passingGrade) || 75,
        honorsCriteria: honors,
        attendanceConfig: {
          months: updatedMonths,
          schoolDaysPerMonth: updatedSchoolDays
        },
        depedLogoBase64: depedLogo,
        schoolLogoBase64: schoolLogo,
        trackStrand: trackStrand.trim() || undefined,
        availableTracksStrands: availableTracks.length > 0 ? availableTracks : undefined,
        schoolId: schoolId.trim() || undefined,
        division: division.trim() || undefined,
        region: region.trim() || undefined,
        district: district.trim() || undefined
      };
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleSchoolDayChange = (month: string, val: string) => {
    setSchoolDays(prev => ({ ...prev, [month]: Number(val) || 0 }));
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    deleteAdviserClass(adviserClass.id);
    setActiveAdviserClass(null);
    setShowDeleteConfirm(false);
  };

  const renderHonorsRow = (title: string, key: keyof HonorsCriteria) => (
    <div className="flex flex-col gap-3 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
      <div className="font-extrabold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider">{title}</div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-[9px] uppercase font-black text-slate-450 dark:text-slate-500 tracking-wider">Min Average</label>
          <input
            type="number"
            value={honors[key].minAverage}
            onChange={e => setHonors(prev => ({ ...prev, [key]: { ...prev[key], minAverage: Number(e.target.value) } }))}
            className="w-full px-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-black focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[9px] uppercase font-black text-slate-450 dark:text-slate-500 tracking-wider">Min Any Subject</label>
          <input
            type="number"
            value={honors[key].minAnySubject}
            onChange={e => setHonors(prev => ({ ...prev, [key]: { ...prev[key], minAnySubject: Number(e.target.value) } }))}
            className="w-full px-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-black focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 pb-32">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-amber-500" /> Adviser Configuration
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Configure class details, academic thresholds, official logos, and attendance days.</p>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all cursor-pointer shadow-sm"
        >
          {isSaved ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {isSaved ? 'Saved!' : 'Save Settings'}
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-6">
          {/* General Information */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
            <h3 className="font-black text-slate-800 dark:text-slate-100 text-lg border-b border-slate-100 dark:border-slate-800 pb-3">Signatories</h3>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Adviser Name</label>
              <input
                type="text"
                value={adviserName}
                onChange={e => setAdviserName(e.target.value)}
                placeholder="e.g. Juan Dela Cruz"
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Principal / Head Teacher Name</label>
              <input
                type="text"
                value={principalName}
                onChange={e => setPrincipalName(e.target.value)}
                placeholder="e.g. Maria Clara"
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-500">School ID</label>
                <input
                  type="text"
                  value={schoolId}
                  onChange={e => setSchoolId(e.target.value)}
                  placeholder="e.g. 301234"
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-500">District</label>
                <input
                  type="text"
                  value={district}
                  onChange={e => setDistrict(e.target.value)}
                  placeholder="e.g. Talibon II"
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-500">Division</label>
                <input
                  type="text"
                  value={division}
                  onChange={e => setDivision(e.target.value)}
                  placeholder="e.g. Division of Bohol"
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-500">Region</label>
                <input
                  type="text"
                  value={region}
                  onChange={e => setRegion(e.target.value)}
                  placeholder="e.g. Region VII - Central Visayas"
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          {/* SHS Track / Strand Configuration */}
          {adviserClass.workspace === 'SHS' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-amber-500" />
                  <h3 className="font-black text-slate-800 dark:text-slate-100 text-lg">SHS Tracks &amp; Strands</h3>
                </div>
                <button
                  type="button"
                  onClick={handleResetTracks}
                  className="text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                  title="Reset to official DepEd standard tracks & strands"
                >
                  <RotateCcw className="h-3 w-3" /> Reset Defaults
                </button>
              </div>

              {/* Section Default Strand */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  Default Track / Strand for Section
                </label>
                <div className="flex gap-2">
                  <select
                    value={trackStrand}
                    onChange={e => setTrackStrand(e.target.value)}
                    className="flex-1 px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="">— None (Set individually per student in SF9) —</option>
                    {availableTracks.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <p className="text-[10px] text-slate-400">
                  Serves as the section fallback. Students can override this individually in their SF-9 assessment card.
                </p>
              </div>

              {/* Available Tracks & Strands Manager */}
              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Available Track &amp; Strand Options ({availableTracks.length})
                  </label>
                  <span className="text-[10px] text-slate-400">Populates the SF-9 dropdown</span>
                </div>

                {/* Add new track input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTrackInput}
                    onChange={e => setNewTrackInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTrack();
                      }
                    }}
                    placeholder="Enter track/strand (e.g. Academic - STEM)"
                    className="flex-1 px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddTrack}
                    disabled={!newTrackInput.trim()}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-xs"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add
                  </button>
                </div>

                {/* Quick Add Presets */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] font-bold text-slate-400 mr-1 flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-amber-500" /> Presets:
                  </span>
                  {[
                    'Academic - STEM',
                    'Academic - HUMSS',
                    'Academic - ABM',
                    'Academic - GAS',
                    'TVL - ICT',
                    'TVL - Home Economics'
                  ].map(preset => {
                    const alreadyExists = availableTracks.some(t => t.toLowerCase() === preset.toLowerCase());
                    if (alreadyExists) return null;
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          setAvailableTracks(prev => [...prev, preset]);
                          if (!trackStrand) setTrackStrand(preset);
                        }}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-amber-50 dark:bg-slate-800 dark:hover:bg-amber-950/30 text-slate-600 hover:text-amber-700 dark:text-slate-300 dark:hover:text-amber-300 border border-slate-200/60 dark:border-slate-700 transition-colors cursor-pointer"
                      >
                        + {preset}
                      </button>
                    );
                  })}
                </div>

                {/* Current Tracks List / Pills */}
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-2 bg-slate-50/70 dark:bg-slate-950/40 rounded-xl border border-slate-200/80 dark:border-slate-800">
                  {availableTracks.length === 0 ? (
                    <div className="text-xs text-slate-400 p-2 italic w-full text-center">
                      No tracks configured. Click "Reset Defaults" or type one above.
                    </div>
                  ) : (
                    availableTracks.map(track => (
                      <span
                        key={track}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow-2xs"
                      >
                        <span className="truncate max-w-[220px]">{track}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTrack(track)}
                          className="text-slate-400 hover:text-red-500 p-0.5 rounded transition-colors cursor-pointer"
                          title="Remove option"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Official Logos upload */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
            <h3 className="font-black text-slate-800 dark:text-slate-100 text-lg border-b border-slate-100 dark:border-slate-800 pb-3">Report Card Logos (SF9)</h3>
            
            <div className="grid grid-cols-2 gap-4">
              {/* DepEd Logo */}
              <div className="flex flex-col items-center justify-between p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl gap-3 text-center">
                <span className="text-[10px] font-black uppercase text-slate-400">DepEd Logo</span>
                <div className="w-16 h-16 rounded-2xl bg-slate-200/50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 flex items-center justify-center overflow-hidden">
                  {depedLogo ? (
                    <img src={depedLogo} alt="DepEd Logo" className="w-full h-full object-contain" />
                  ) : (
                    <ImageIcon className="h-6 w-6 text-slate-400" />
                  )}
                </div>
                <label className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 text-[10px] font-black rounded-lg border border-amber-250 dark:border-amber-900/40 cursor-pointer transition-all flex items-center gap-1">
                  <Upload className="h-3 w-3" /> Upload
                  <input type="file" accept="image/*" className="hidden" onChange={e => handleLogoUpload(e, 'deped')} />
                </label>
              </div>

              {/* School Logo */}
              <div className="flex flex-col items-center justify-between p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl gap-3 text-center">
                <span className="text-[10px] font-black uppercase text-slate-400">School Logo</span>
                <div className="w-16 h-16 rounded-2xl bg-slate-200/50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 flex items-center justify-center overflow-hidden">
                  {schoolLogo ? (
                    <img src={schoolLogo} alt="School Logo" className="w-full h-full object-contain" />
                  ) : (
                    <ImageIcon className="h-6 w-6 text-slate-400" />
                  )}
                </div>
                <label className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 text-[10px] font-black rounded-lg border border-amber-250 dark:border-amber-900/40 cursor-pointer transition-all flex items-center gap-1">
                  <Upload className="h-3 w-3" /> Upload
                  <input type="file" accept="image/*" className="hidden" onChange={e => handleLogoUpload(e, 'school')} />
                </label>
              </div>
            </div>
          </div>

          {/* Subject Display & SF9 Order */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ListOrdered className="h-5 w-5 text-amber-500" />
                <h3 className="font-black text-slate-800 dark:text-slate-100 text-lg">Subject Arrangement (SF9 & Matrix)</h3>
              </div>
              <button
                type="button"
                onClick={() => setSubjectOrderList(getInitialSubjectList())}
                className="text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                title="Reset to default subject sequence"
              >
                <RotateCcw className="h-3 w-3" /> Reset Order
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Customize the vertical sequence of learning areas printed on the generated SF9 Report Cards and shown on the Class Matrix.
            </p>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {subjectOrderList.map((subject, idx) => (
                <div
                  key={subject}
                  className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 flex items-center justify-center rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 text-[10px] font-black">
                      {idx + 1}
                    </span>
                    <span>{subject}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveSubject(idx, 'up')}
                      className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      title="Move Up"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === subjectOrderList.length - 1}
                      onClick={() => moveSubject(idx, 'down')}
                      className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      title="Move Down"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleSave}
                className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                {isSaved ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
                {isSaved ? 'Arrangement Saved!' : 'Save Subject Order'}
              </button>
            </div>
          </div>

          {/* Academic Policy */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <ShieldAlert className="h-5 w-5 text-amber-500" />
              <h3 className="font-black text-slate-800 dark:text-slate-100 text-lg">Academic Policy</h3>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Minimum Passing Grade</label>
              <input
                type="number"
                value={passingGrade}
                onChange={e => setPassingGrade(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <p className="text-[10px] text-slate-400">Any final subject grade below this value will mark the student as 'Retained'.</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Honors Criteria */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="font-black text-slate-800 dark:text-slate-100 text-lg border-b border-slate-100 dark:border-slate-800 pb-3">Honors Criteria (DepEd Standard)</h3>
            <div className="space-y-3">
              {renderHonorsRow("With Highest Honors", "highestHonors")}
              {renderHonorsRow("With High Honors", "highHonors")}
              {renderHonorsRow("With Honors", "honors")}
            </div>
          </div>

          {/* Attendance Configuration */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <Calendar className="h-5 w-5 text-amber-500" />
              <h3 className="font-black text-slate-800 dark:text-slate-100 text-lg">Attendance Calendar</h3>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Active Months (Comma separated)</label>
              <input
                type="text"
                value={monthsStr}
                onChange={e => setMonthsStr(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <p className="text-[10px] text-slate-400">Changing this will update the school days table below upon saving.</p>
            </div>

            <div className="space-y-2 mt-4">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400">School Days per Month</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.keys(schoolDays).map(month => (
                  <div key={month} className="flex flex-col gap-1 bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">{month}</span>
                    <input
                      type="number"
                      value={schoolDays[month]}
                      onChange={e => handleSchoolDayChange(month, e.target.value)}
                      className="w-full px-2 py-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded text-sm text-center font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="mt-12 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-500" />
          <h3 className="font-black text-red-800 dark:text-red-400 text-lg">Danger Zone</h3>
        </div>
        <p className="text-sm text-red-700 dark:text-red-300 mb-6">
          Deleting this configuration will remove all imported grades, manual overrides, attendance records, and observed values. This action is irreversible. The original gradebooks of subject teachers will not be affected.
        </p>
        <button
          onClick={handleDelete}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all cursor-pointer shadow-sm"
        >
          <Trash2 className="h-4 w-4" /> Delete Adviser Configuration
        </button>
      </div>

      {/* Inline Delete Confirm Modal (macOS Tauri-safe) */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/50 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-red-50 dark:bg-red-950/30 text-red-600 rounded-xl shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-black text-red-800 dark:text-red-300 text-sm">Delete Adviser Configuration?</h3>
                <p className="text-xs text-slate-500 mt-0.5">All imported grades, overrides, and attendance records will be permanently lost. This cannot be undone.</p>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={confirmDelete}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-black rounded-xl transition-colors cursor-pointer"
              >
                Yes, Delete Permanently
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="py-2 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
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
