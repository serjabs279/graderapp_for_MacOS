import html2pdf from 'html2pdf.js';

function parseAndConvertOklch(colorExpr: string): string {
  if (!colorExpr || !colorExpr.toLowerCase().includes('oklch')) return colorExpr;

  const match = colorExpr.match(/oklch\(\s*([+-]?[0-9]*\.?[0-9]+%?)\s+([+-]?[0-9]*\.?[0-9]+%?)\s+([+-]?[0-9]*\.?[0-9]+%?)(?:\s*(?:\/|,)\s*([+-]?[0-9]*\.?[0-9]+%?))?\s*\)/i);
  if (!match) return 'rgb(100, 116, 139)';

  try {
    const [, lStr, cStr, hStr, aStr] = match;
    let l = parseFloat(lStr);
    if (lStr.includes('%')) l /= 100;
    const c = parseFloat(cStr);
    const h = parseFloat(hStr);

    let alpha = 1;
    if (aStr) {
      alpha = parseFloat(aStr);
      if (aStr.includes('%')) alpha /= 100;
    }

    if (isNaN(l) || isNaN(c) || isNaN(h)) return 'rgb(100, 116, 139)';

    const hRad = (h * Math.PI) / 180;
    const a = c * Math.cos(hRad);
    const b = c * Math.sin(hRad);

    const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
    const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
    const s_ = l - 0.0894841775 * a - 1.2914855480 * b;

    const l3 = l_ * l_ * l_;
    const m3 = m_ * m_ * m_;
    const s3 = s_ * s_ * s_;

    const rLin = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
    const gLin = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
    const bLin = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3;

    const toSRGB = (val: number) => {
      const clamped = Math.max(0, Math.min(1, val));
      const srgb = clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
      return Math.round(srgb * 255);
    };

    const r = toSRGB(rLin);
    const g = toSRGB(gLin);
    const bVal = toSRGB(bLin);

    if (alpha < 1) {
      return `rgba(${r}, ${g}, ${bVal}, ${alpha})`;
    }
    return `rgb(${r}, ${g}, ${bVal})`;
  } catch {
    return 'rgb(100, 116, 139)';
  }
}

function parseAndConvertOklab(colorExpr: string): string {
  if (!colorExpr || !colorExpr.toLowerCase().includes('oklab')) return colorExpr;

  const match = colorExpr.match(/oklab\(\s*([+-]?[0-9]*\.?[0-9]+%?)\s+([+-]?[0-9]*\.?[0-9]+%?)\s+([+-]?[0-9]*\.?[0-9]+%?)(?:\s*(?:\/|,)\s*([+-]?[0-9]*\.?[0-9]+%?))?\s*\)/i);
  if (!match) return 'rgb(100, 116, 139)';

  try {
    const [, lStr, aStr, bStr, alphaStr] = match;
    let l = parseFloat(lStr);
    if (lStr.includes('%')) l /= 100;
    const a = parseFloat(aStr);
    const b = parseFloat(bStr);

    let alpha = 1;
    if (alphaStr) {
      alpha = parseFloat(alphaStr);
      if (alphaStr.includes('%')) alpha /= 100;
    }

    if (isNaN(l) || isNaN(a) || isNaN(b)) return 'rgb(100, 116, 139)';

    const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
    const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
    const s_ = l - 0.0894841775 * a - 1.2914855480 * b;

    const l3 = l_ * l_ * l_;
    const m3 = m_ * m_ * m_;
    const s3 = s_ * s_ * s_;

    const rLin = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
    const gLin = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
    const bLin = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3;

    const toSRGB = (val: number) => {
      const clamped = Math.max(0, Math.min(1, val));
      const srgb = clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
      return Math.round(srgb * 255);
    };

    const r = toSRGB(rLin);
    const g = toSRGB(gLin);
    const bVal = toSRGB(bLin);

    if (alpha < 1) {
      return `rgba(${r}, ${g}, ${bVal}, ${alpha})`;
    }
    return `rgb(${r}, ${g}, ${bVal})`;
  } catch {
    return 'rgb(100, 116, 139)';
  }
}

export function replaceModernColorFunctions(cssText: string): string {
  if (!cssText) return cssText;

  let result = cssText;
  const colorFuncRegex = /(?:oklab|oklch|lab|lch|color)\s*\(/gi;

  let match;
  while ((match = colorFuncRegex.exec(result)) !== null) {
    const startIdx = match.index;
    let openParens = 0;
    let endIdx = -1;

    for (let i = startIdx; i < result.length; i++) {
      if (result[i] === '(') {
        openParens++;
      } else if (result[i] === ')') {
        openParens--;
        if (openParens === 0) {
          endIdx = i;
          break;
        }
      }
    }

    if (endIdx !== -1) {
      const colorExpr = result.substring(startIdx, endIdx + 1);
      let converted = colorExpr;

      if (colorExpr.toLowerCase().startsWith('oklch')) {
        converted = parseAndConvertOklch(colorExpr);
      } else if (colorExpr.toLowerCase().startsWith('oklab')) {
        converted = parseAndConvertOklab(colorExpr);
      } else {
        converted = 'rgb(100, 116, 139)';
      }

      if (converted === colorExpr) {
        converted = 'rgb(100, 116, 139)';
      }

      result = result.substring(0, startIdx) + converted + result.substring(endIdx + 1);
      colorFuncRegex.lastIndex = startIdx + converted.length;
    } else {
      break;
    }
  }

  return result;
}

export async function exportElementToPDF(elementId: string, filename: string): Promise<boolean> {
  const element = document.getElementById(elementId);
  if (!element) {
    alert('Document element not found for PDF export.');
    return false;
  }

  const opt = {
    margin: [10, 10, 10, 10] as [number, number, number, number],
    filename: filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`,
    image: { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      logging: false,
      scrollY: 0,
      windowWidth: 1024,
      onclone: (clonedDoc: Document) => {
        // 1. Force compute and inline explicit RGB styles from live DOM to cloned DOM
        const origContainer = document.getElementById(elementId);
        const clonedContainer = clonedDoc.getElementById(elementId);

        if (origContainer && clonedContainer) {
          const origEls = [origContainer, ...Array.from(origContainer.querySelectorAll('*'))] as HTMLElement[];
          const clonedEls = [clonedContainer, ...Array.from(clonedContainer.querySelectorAll('*'))] as HTMLElement[];

          for (let i = 0; i < origEls.length; i++) {
            const origEl = origEls[i];
            const clonedEl = clonedEls[i];
            if (!origEl || !clonedEl) continue;

            try {
              const cs = window.getComputedStyle(origEl);

              if (cs.color) clonedEl.style.color = replaceModernColorFunctions(cs.color);
              if (cs.backgroundColor) clonedEl.style.backgroundColor = replaceModernColorFunctions(cs.backgroundColor);
              if (cs.borderColor) clonedEl.style.borderColor = replaceModernColorFunctions(cs.borderColor);
              if (cs.borderTopColor) clonedEl.style.borderTopColor = replaceModernColorFunctions(cs.borderTopColor);
              if (cs.borderBottomColor) clonedEl.style.borderBottomColor = replaceModernColorFunctions(cs.borderBottomColor);
              if (cs.borderLeftColor) clonedEl.style.borderLeftColor = replaceModernColorFunctions(cs.borderLeftColor);
              if (cs.borderRightColor) clonedEl.style.borderRightColor = replaceModernColorFunctions(cs.borderRightColor);
              if (cs.fill) clonedEl.style.fill = replaceModernColorFunctions(cs.fill);
              if (cs.stroke) clonedEl.style.stroke = replaceModernColorFunctions(cs.stroke);
              if (cs.outlineColor) clonedEl.style.outlineColor = replaceModernColorFunctions(cs.outlineColor);
            } catch {
              // Ignore computed style read errors
            }
          }
        }

        // 2. Sanitize document head and all style tags completely
        if (clonedDoc.head) {
          clonedDoc.head.innerHTML = replaceModernColorFunctions(clonedDoc.head.innerHTML);
        }

        const styles = clonedDoc.querySelectorAll('style');
        styles.forEach((styleTag) => {
          if (styleTag.textContent) {
            styleTag.textContent = replaceModernColorFunctions(styleTag.textContent);
          }
        });

        // 3. Inspect document stylesheets and sanitize or disable ones containing modern color functions
        try {
          const sheets = Array.from(clonedDoc.styleSheets);
          for (const sheet of sheets) {
            try {
              if (sheet.ownerNode && sheet.ownerNode.textContent) {
                sheet.ownerNode.textContent = replaceModernColorFunctions(sheet.ownerNode.textContent);
              }
            } catch {
              try {
                sheet.disabled = true;
              } catch {
                // ignore
              }
            }
          }
        } catch {
          // ignore stylesheet traversal errors
        }
      },
    },
    jsPDF: {
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait' as const,
      compress: true,
    },
    pagebreak: {
      mode: ['css', 'legacy'],
      avoid: ['tr', '.avoid-break'],
    },
  };

  try {
    await html2pdf().set(opt).from(element).save();
    return true;
  } catch (err) {
    console.error('PDF Export error:', err);
    alert('Could not generate PDF directly. Opening browser print dialog as fallback.');
    window.print();
    return false;
  }
}


