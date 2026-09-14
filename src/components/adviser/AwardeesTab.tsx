import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { AdviserClass, HonorsLabel } from '../../types';
import { GradeMatrix } from '../../utils/adviserUtils';
import { generateAcademicAchieverCertificates, getDefaultCertificateDate } from '../../utils/adviser/certificateGenerator';
import { globalToast } from '../../context/ToastContext';
import { Star, Printer, Medal, Award, Eye } from 'lucide-react';
import CertificatePreviewModal from './CertificatePreviewModal';

interface Props {
  adviserClass: AdviserClass;
  gradeMatrix: GradeMatrix;
}

export default function AwardeesTab({ adviserClass, gradeMatrix }: Props) {
  const { globalSettings } = useApp();
  const [periodLabel, setPeriodLabel] = useState<string>('1st Quarter');
  const [givenDate, setGivenDate] = useState<string>(() => {
    return getDefaultCertificateDate(globalSettings.schoolName || (adviserClass as any).schoolName || 'SAN ROQUE PARISH HIGH SCHOOL, INC.');
  });
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);

  const awardees = useMemo(() => {
    return gradeMatrix
      .filter((s: import('../../utils/adviserUtils').StudentGradeRow) => s.honorsLabel !== null)
      .sort((a: import('../../utils/adviserUtils').StudentGradeRow, b: import('../../utils/adviserUtils').StudentGradeRow) => {
        const honorWeight = (h: HonorsLabel | null | undefined) => {
          if (h === 'With Highest Honors') return 3;
          if (h === 'With High Honors') return 2;
          if (h === 'With Honors') return 1;
          return 0;
        };
        const wA = honorWeight(a.honorsLabel);
        const wB = honorWeight(b.honorsLabel);
        if (wA !== wB) return wB - wA;
        return (b.generalAverage ?? 0) - (a.generalAverage ?? 0);
      });
  }, [gradeMatrix]);

  const highestHonors = awardees.filter(a => a.honorsLabel === 'With Highest Honors');
  const highHonors = awardees.filter(a => a.honorsLabel === 'With High Honors');
  const honors = awardees.filter(a => a.honorsLabel === 'With Honors');

  const handleGenerateCertificates = () => {
    if (awardees.length === 0) {
      globalToast.error('No academic achievers found to generate certificates for.', 'No Achievers');
      return;
    }
    try {
      const doc = generateAcademicAchieverCertificates(adviserClass, awardees, globalSettings, {
        periodLabel,
        givenDate
      });
      const filename = `Certificates_${adviserClass.gradeLevel}_${adviserClass.section}_${periodLabel.replace(/\s+/g, '_')}.pdf`;
      doc.save(filename);
      globalToast.success(`Generated ${awardees.length} Academic Excellence Certificate(s) (A4 Portrait, 2 per page) saved as "${filename}".`, 'Certificates Generated');
    } catch (err: any) {
      console.error('Certificate generation error:', err);
      globalToast.error('Failed to generate certificates: ' + (err.message || String(err)), 'Generation Error');
    }
  };

  const Section = ({ title, data, iconColor, bgHeader }: { title: string; data: typeof awardees; iconColor: string; bgHeader: string }) => {
    if (data.length === 0) return null;
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden mb-8">
        <div className={`px-6 py-4 ${bgHeader} border-b border-slate-200 dark:border-slate-800 flex items-center gap-3`}>
          <Medal className={`h-6 w-6 ${iconColor}`} />
          <h3 className="font-black text-slate-800 dark:text-slate-100 text-lg">{title}</h3>
          <span className="ml-auto bg-white/50 dark:bg-black/20 text-slate-700 dark:text-slate-300 px-3 py-1 rounded-full text-xs font-bold">
            {data.length} Learner(s)
          </span>
        </div>
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800">
              <th className="px-6 py-4 font-bold text-slate-500 w-16 text-center">No.</th>
              <th className="px-6 py-4 font-bold text-slate-500">Learner Name</th>
              <th className="px-6 py-4 font-bold text-slate-500 text-right w-32">Final Average</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.map((row, idx) => (
              <tr key={row.lrn} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                <td className="px-6 py-4 text-center font-mono text-slate-400 border-r border-slate-100 dark:border-slate-800">{idx + 1}</td>
                <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-200">
                  {row.name}
                  <div className="text-[10px] font-mono font-normal text-slate-400 mt-0.5">{row.lrn}</div>
                </td>
                <td className="px-6 py-4 text-right font-mono font-black text-slate-700 dark:text-slate-200">
                  {row.generalAverage?.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 mb-8">
        <div>
          <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-500 fill-amber-500" /> Academic Excellence Awardees
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">End of school year honors and recognition.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
           <button 
             onClick={() => setShowPreviewModal(true)}
             disabled={awardees.length === 0}
             className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 hover:bg-amber-100 disabled:opacity-50 rounded-xl shadow-sm cursor-pointer transition-all"
           >
              <Eye className="h-4 w-4 text-amber-600 dark:text-amber-400" /> Preview & Edit Settings
           </button>
           <button 
             onClick={handleGenerateCertificates}
             disabled={awardees.length === 0}
             className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl shadow-sm cursor-pointer transition-all"
           >
              <Award className="h-4 w-4 text-amber-200" /> Generate Certificates (A4)
           </button>
           <button 
             onClick={() => window.print()}
             className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 cursor-pointer"
           >
              <Printer className="h-4 w-4 text-slate-500" /> Print List
           </button>
        </div>
      </div>

      {awardees.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
          <Star className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
          <h3 className="text-lg font-bold text-slate-600 dark:text-slate-400">No Awardees Yet</h3>
          <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">
            Honors are calculated based on the final general average and the minimum grade requirement in any subject.
          </p>
        </div>
      ) : (
        <>
          <Section title="With Highest Honors" data={highestHonors} iconColor="text-yellow-500" bgHeader="bg-yellow-50 dark:bg-yellow-900/20" />
          <Section title="With High Honors" data={highHonors} iconColor="text-slate-400" bgHeader="bg-slate-100 dark:bg-slate-800/50" />
          <Section title="With Honors" data={honors} iconColor="text-amber-700" bgHeader="bg-amber-50 dark:bg-amber-900/10" />
        </>
      )}

      {/* Certificate HTML Preview & Settings Modal */}
      {showPreviewModal && (
        <CertificatePreviewModal
          isOpen={showPreviewModal}
          onClose={() => setShowPreviewModal(false)}
          adviserClass={adviserClass}
          awardees={awardees}
          globalSettings={globalSettings}
          periodLabel={periodLabel}
          onPeriodChange={setPeriodLabel}
          givenDate={givenDate}
          onGivenDateChange={setGivenDate}
        />
      )}
    </div>
  );
}
