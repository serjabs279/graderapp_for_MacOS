const fs = require('fs');
let content = fs.readFileSync('src/components/DashboardView.tsx', 'utf8');

// Replace remaining p.quarter accesses with p.lastActiveQuarter || ''
content = content.replace(/p\.quarter/g, (p.lastActiveQuarter || ''));
content = content.replace(/proj\.quarter/g, (proj.lastActiveQuarter || ''));
content = content.replace(/activeProject\.quarter/g, (activeProject.lastActiveQuarter || ''));

fs.writeFileSync('src/components/DashboardView.tsx', content, 'utf8');
console.log('DashboardView quarters fixed');
