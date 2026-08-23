const fs = require('fs');

// ── Fix DashboardView.tsx ─────────────────────────────────────────────────────
let dash = fs.readFileSync('src/components/DashboardView.tsx', 'utf8');

// Fix all p.quarter / proj.quarter / activeProject.quarter
dash = dash.replace(/\bp\.quarter\b/g, "(p.lastActiveQuarter || '')");
dash = dash.replace(/\bproj\.quarter\b/g, "(proj.lastActiveQuarter || '')");
dash = dash.replace(/\bactiveProject\.quarter\b/g, "(activeProject.lastActiveQuarter || '')");

// Fix const showQ* that get re-assigned later (change const → let)
dash = dash.replace(/(\s+)const showQ1 = true;\r?\n(\s+)const showQ2 = true;\r?\n(\s+)const showQ3 = true;\r?\n(\s+)const showQ4 = true;/g,
  '$1let showQ1 = true;\n$2let showQ2 = true;\n$3let showQ3 = true;\n$4let showQ4 = true;');

// Fix category comparisons 'WW' / 'PT' in DashboardView
dash = dash.replace(/ass\.category === 'WW'/g, "ass.category === 'WOW'");
dash = dash.replace(/ass\.category === 'PT'/g, "ass.category === 'PPT'");
dash = dash.replace(/ass\.category !== 'QE'/g, "ass.category !== 'QSTE'");
dash = dash.replace(/ass\.category === 'QE'/g, "ass.category === 'QSTE'");
dash = dash.replace(/category === 'WW'/g, "category === 'WOW'");
dash = dash.replace(/category === 'PT'/g, "category === 'PPT'");
dash = dash.replace(/category === 'QE'/g, "category === 'QSTE'");

fs.writeFileSync('src/components/DashboardView.tsx', dash, 'utf8');
console.log('DashboardView.tsx fixed');

// ── Fix ClassManagerView.tsx ──────────────────────────────────────────────────
let cm = fs.readFileSync('src/components/ClassManagerView.tsx', 'utf8');

// Fix raw sum property names
cm = cm.replace(/\bwwRawSum\b/g, 'wowRawSum');
cm = cm.replace(/\bwwMaxSum\b/g, 'wowMaxSum');
cm = cm.replace(/\bptRawSum\b/g, 'pptRawSum');
cm = cm.replace(/\bptMaxSum\b/g, 'pptMaxSum');
cm = cm.replace(/\bqeRawSum\b/g, 'qsteRawSum');
cm = cm.replace(/\bqeMaxSum\b/g, 'qsteMaxSum');

// Fix category string literals still using old names
cm = cm.replace(/'WW'/g, "'WOW'");
cm = cm.replace(/'PT'/g, "'PPT'");
cm = cm.replace(/'QE'/g, "'QSTE'");

// Fix remaining category comparisons
cm = cm.replace(/category === "WW"/g, 'category === "WOW"');
cm = cm.replace(/category === "PT"/g, 'category === "PPT"');
cm = cm.replace(/category === "QE"/g, 'category === "QSTE"');

fs.writeFileSync('src/components/ClassManagerView.tsx', cm, 'utf8');
console.log('ClassManagerView.tsx fixed');
console.log('All done.');
