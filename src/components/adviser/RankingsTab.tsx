import React, { useState, useMemo } from 'react';
import { AdviserClass } from '../../types';
import { GradeMatrix } from '../../utils/adviserUtils';
import { Trophy, Medal, Award, Search, Users, AlertCircle, ArrowUpDown } from 'lucide-react';

interface Props {
  adviserClass: AdviserClass;
  gradeMatrix: GradeMatrix;
}

export default function RankingsTab({ adviserClass, gradeMatrix }: Props) {
  const [filterSex, setFilterSex] = useState<'All' | 'Male' | 'Female'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Process rankings & statistics
  const studentsWithGrades = useMemo(() => {
    return gradeMatrix
      .filter(s => s.generalAverage !== null)
      .sort((a, b) => (b.generalAverage ?? 0) - (a.generalAverage ?? 0));
  }, [gradeMatrix]);

  // Compute key stats
  const stats = useMemo(() => {
    if (studentsWithGrades.length === 0) {
      return { classAverage: 0, highest: 0, lowest: 0, honorsCount: 0 };
    }
    const averages = studentsWithGrades.map(s => s.generalAverage as number);
    const sum = averages.reduce((a, b) => a + b, 0);
    const classAverage = Math.round((sum / averages.length) * 100) / 100;
    const highest = Math.max(...averages);
    const lowest = Math.min(...averages);
    const honorsCount = studentsWithGrades.filter(s => s.honorsLabel !== null).length;

    return { classAverage, highest, lowest, honorsCount };
  }, [studentsWithGrades]);

  // Filtered leaderboard
  const filteredLeaderboard = useMemo(() => {
    return studentsWithGrades.filter(s => {
      const matchSex = filterSex === 'All' || s.sex === filterSex;
      const matchQuery = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.lrn.includes(searchQuery);
      return matchSex && matchQuery;
    });
  }, [studentsWithGrades, filterSex, searchQuery]);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-200">
      
      {/* Header */}
      <div>
        <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Trophy className="h-5.5 w-5.5 text-amber-500" /> Class Ranking & Honors Board
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Official list of student rankings based on General Average and honors classification.</p>
      </div>

      {/* Stats Summary Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Class Average */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-xl text-amber-600 dark:text-amber-400">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Class Average</div>
            <div className="text-lg font-black text-slate-800 dark:text-slate-100 font-mono">
              {stats.classAverage ? stats.classAverage.toFixed(2) : '—'}
            </div>
          </div>
        </div>

        {/* Top Performer */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl text-emerald-600 dark:text-emerald-450">
            <Trophy className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Highest G.A.</div>
            <div className="text-lg font-black text-slate-800 dark:text-slate-100 font-mono">
              {stats.highest ? stats.highest.toFixed(2) : '—'}
            </div>
          </div>
        </div>

        {/* Lowest Performer */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-xl text-red-650 dark:text-red-400">
            <ArrowUpDown className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Lowest G.A.</div>
            <div className="text-lg font-black text-slate-800 dark:text-slate-100 font-mono">
              {stats.lowest ? stats.lowest.toFixed(2) : '—'}
            </div>
          </div>
        </div>

        {/* Honors Candidates */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-xl text-blue-650 dark:text-blue-400">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Honors Candidates</div>
            <div className="text-lg font-black text-slate-800 dark:text-slate-100 font-mono">
              {stats.honorsCount} students
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search LRN or Student Name..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 w-full"
          />
        </div>

        <div className="flex gap-2">
          {['All', 'Male', 'Female'].map(gender => (
            <button
              key={gender}
              onClick={() => setFilterSex(gender as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterSex === gender
                  ? 'bg-slate-800 dark:bg-slate-700 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-650 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-750'
              }`}
            >
              {gender}
            </button>
          ))}
        </div>
      </div>

      {/* Rankings Leaderboard Grid */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800">
                <th className="px-5 py-4 font-black text-slate-500 text-center w-16">Rank</th>
                <th className="px-5 py-4 font-bold text-slate-500">Learner Name</th>
                <th className="px-5 py-4 font-bold text-slate-500 w-24 text-center">Sex</th>
                <th className="px-5 py-4 font-bold text-slate-500 w-32 text-center">Gen. Average</th>
                <th className="px-5 py-4 font-bold text-slate-500">Honors Classification</th>
                <th className="px-5 py-4 font-bold text-slate-500 w-32 text-center font-mono">Promotion Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 dark:divide-slate-800/60">
              {filteredLeaderboard.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-semibold space-y-2">
                    <AlertCircle className="h-8 w-8 mx-auto text-slate-350" />
                    <div>No students meet the search/filter criteria.</div>
                  </td>
                </tr>
              ) : null}

              {filteredLeaderboard.map((student) => {
                const isTop3 = student.rank && student.rank <= 3;
                const honorsClass = student.honorsLabel;
                
                return (
                  <tr key={student.lrn} className="hover:bg-slate-50/40 dark:hover:bg-slate-850/15 transition-colors">
                    <td className="px-5 py-3.5 text-center font-mono font-black">
                      {isTop3 ? (
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-black ${
                          student.rank === 1 ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' :
                          student.rank === 2 ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400' :
                          'bg-amber-50 text-amber-800/80 dark:bg-amber-900/10'
                        }`}>
                          {student.rank}
                        </span>
                      ) : (
                        <span className="text-slate-400">{student.rank}</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        {student.name}
                        {student.rank === 1 && <Medal className="h-4 w-4 text-amber-500 animate-bounce" />}
                      </div>
                      <div className="text-[10px] text-slate-450 dark:text-slate-500 font-mono mt-0.5">LRN: {student.lrn}</div>
                    </td>
                    <td className="px-5 py-3.5 text-center font-bold text-slate-500 dark:text-slate-400">
                      {student.sex}
                    </td>
                    <td className="px-5 py-3.5 text-center font-mono font-black text-slate-900 dark:text-slate-100 text-sm">
                      {student.generalAverage?.toFixed(2)}%
                    </td>
                    <td className="px-5 py-3.5">
                      {honorsClass ? (
                        <span className="inline-flex items-center gap-1 text-[9.5px] font-black uppercase tracking-wider px-2.5 py-1 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 rounded-full border border-amber-200/50">
                          <Award className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                          {honorsClass}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-black uppercase ${
                        student.promotionStatus === 'Promoted' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' :
                        student.promotionStatus === 'Retained' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' :
                        'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-450'
                      }`}>
                        {student.promotionStatus}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
