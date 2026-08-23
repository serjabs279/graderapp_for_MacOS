const fs = require('fs');
const path = require('path');

const replaceInFile = (relPath, replacements) => {
  const filePath = path.join(__dirname, relPath);
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  for (const [from, to] of replacements) {
    content = content.replace(from, to);
  }
  fs.writeFileSync(filePath, content, 'utf8');
};

// 1. types.ts
replaceInFile('src/types.ts', [
  [/wow: number; \/\/ e\.g\. 0\.30\n  pt: number; \/\/ e\.g\. 0\.50\n  qa: number; \/\/ e\.g\. 0\.20/, 'wow: number; // e.g. 0.30\n  ppt: number; // e.g. 0.50\n  qste: number; // e.g. 0.20'],
  [/'WOW' \| 'PPT' \| 'QE'/g, "'WOW' | 'PPT' | 'QSTE'"]
]);

// 2. data/seedData.ts
replaceInFile('src/data/seedData.ts', [
  [/ww: /g, 'wow: '],
  [/pt: /g, 'ppt: '],
  [/qa: /g, 'qste: '],
  [/category: "WW"/g, 'category: "WOW"'],
  [/category: "PT"/g, 'category: "PPT"'],
  [/category: "QE"/g, 'category: "QSTE"']
]);

// 3. context/AppContext.tsx
replaceInFile('src/context/AppContext.tsx', [
  [/category: "WW"/g, 'category: "WOW"'],
  [/category: "PT"/g, 'category: "PPT"'],
  [/category: "QE"/g, 'category: "QSTE"']
]);

// 4. utils.ts
replaceInFile('src/utils.ts', [
  [/{ ww: number; pt: number; qa: number }/g, '{ wow: number; ppt: number; qste: number }'],
  [/w\.ww/g, 'w.wow'],
  [/w\.pt/g, 'w.ppt'],
  [/w\.qa/g, 'w.qste']
]);

// 5. utils/pdfExport.ts
replaceInFile('src/utils/pdfExport.ts', [
  [/weightedWW/g, 'weightedWOW'],
  [/weightedPT/g, 'weightedPPT'],
  [/weightedQA/g, 'weightedQSTE']
]);

// 6. components/SettingsView.tsx
replaceInFile('src/components/SettingsView.tsx', [
  [/\.ww/g, '.wow'],
  [/\.pt/g, '.ppt'],
  [/\.qa/g, '.qste']
]);

// 7. components/DashboardView.tsx
replaceInFile('src/components/DashboardView.tsx', [
  [/{ ww: number; pt: number; qa: number }/g, '{ wow: number; ppt: number; qste: number }']
]);

// 8. components/ClassManagerView.tsx
replaceInFile('src/components/ClassManagerView.tsx', [
  [/{ ww: number; pt: number; qa: number }/g, '{ wow: number; ppt: number; qste: number }'],
  [/'W\)W'/g, "'WOW'"],
  [/'QE' \| 'WOW' \| 'PPT'/g, "'QSTE' | 'WOW' | 'PPT'"],
  [/'QE' \| 'PPT' \| 'WOW'/g, "'QSTE' | 'PPT' | 'WOW'"],
  [/ModalAssCategory\('QE'\)/g, "ModalAssCategory('QSTE')"],
  [/category === 'QE'/g, "category === 'QSTE'"],
  [/setModalAssCategory\('QE'\)/g, "setModalAssCategory('QSTE')"],
  [/modalAssCategory === 'QE'/g, "modalAssCategory === 'QSTE'"],
  [/category: 'QE'/g, "category: 'QSTE'"],
  [/\.ww/g, '.wow'],
  [/\.pt/g, '.ppt'],
  [/\.qa/g, '.qste']
]);

// 9. components/adviser/AwardeesTab.tsx
replaceInFile('src/components/adviser/AwardeesTab.tsx', [
  [/type HonorsLabel = 'With Highest Honors' \| 'With High Honors' \| 'With Honors';/g, "type HonorsLabel = 'With Highest Honors' | 'With High Honors' | 'With Honors' | undefined;"]
]);

console.log('Fixed typos');
