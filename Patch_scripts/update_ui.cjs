const fs = require('fs');
const path = require('path');

const targetFiles = [
  'src/components/ClassManagerView.tsx',
  'src/utils.ts'
];

targetFiles.forEach(file => {
  const fullPath = path.join(process.cwd(), file);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');

    // UI Replacements in ClassManagerView & utils
    content = content.replace(/\+ Add WW/g, '+ Add WOW');
    content = content.replace(/\+ Add PT/g, '+ Add PPT');
    content = content.replace(/\+ Add QE/g, '+ Add QSTE');

    content = content.replace(/<span>\+ WW<\/span>/g, '<span>+ WOW</span>');
    content = content.replace(/<span>\+ PT<\/span>/g, '<span>+ PPT</span>');
    content = content.replace(/<span>\+ QE<\/span>/g, '<span>+ QSTE</span>');

    content = content.replace(/WW Weighted/g, 'WOW Weighted');
    content = content.replace(/PT Weighted/g, 'PPT Weighted');
    content = content.replace(/QE Weighted/g, 'QSTE Weighted');

    content = content.replace(/WW Total/g, 'WOW Total');
    content = content.replace(/PT Total/g, 'PPT Total');
    content = content.replace(/QE Total/g, 'QSTE Total');

    content = content.replace(/WW\/PT percentages/g, 'WOW/PPT percentages');
    
    content = content.replace(/\(WW\)/g, '(WOW)');
    content = content.replace(/\(PT\)/g, '(PPT)');
    content = content.replace(/\(QE\)/g, '(QSTE)');
    
    content = content.replace(/WW: /g, 'WOW: ');
    content = content.replace(/PT: /g, 'PPT: ');

    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`Updated UI labels in ${file}`);
  }
});
