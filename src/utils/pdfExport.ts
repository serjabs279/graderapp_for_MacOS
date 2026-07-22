import html2pdf from 'html2pdf.js';

function parseAndConvertOklch(str: string): string {
  if (!str || !str.includes('oklch')) return str;

  return str.replace(/oklch\(\s*([0-9.%]+)\s+([0-9.-]+)\s+([0-9.-]+)(?:\s*(?:\/|,)\s*([0-9.%]+))?\s*\)/gi, (match, lStr, cStr, hStr, aStr) => {
    try {
      let l = parseFloat(lStr);
      if (lStr.includes('%')) l /= 100;
      const c = parseFloat(cStr);
      const h = parseFloat(hStr);

      let alpha = 1;
      if (aStr) {
        alpha = parseFloat(aStr);
        if (aStr.includes('%')) alpha /= 100;
      }

      if (isNaN(l) || isNaN(c) || isNaN(h)) return '#64748b';

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
      return '#64748b';
    }
  });
}

function parseAndConvertOklab(str: string): string {
  if (!str || !str.includes('oklab')) return str;

  return str.replace(/oklab\(\s*([0-9.%]+)\s+([0-9.-]+)\s+([0-9.-]+)(?:\s*(?:\/|,)\s*([0-9.%]+))?\s*\)/gi, (match, lStr, aStr, bStr, alphaStr) => {
    try {
      let l = parseFloat(lStr);
      if (lStr.includes('%')) l /= 100;
      const a = parseFloat(aStr);
      const b = parseFloat(bStr);

      let alpha = 1;
      if (alphaStr) {
        alpha = parseFloat(alphaStr);
        if (alphaStr.includes('%')) alpha /= 100;
      }

      if (isNaN(l) || isNaN(a) || isNaN(b)) return '#64748b';

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
      return '#64748b';
    }
  });
}

function sanitizeModernColors(str: string): string {
  if (!str) return str;
  let res = parseAndConvertOklch(str);
  res = parseAndConvertOklab(res);
  // Fallback catch-all for any remaining unsupported color functions (e.g. lab, lch, color(...))
  res = res.replace(/(?:oklch|oklab|lab|lch|color)\([^)]+\)/gi, '#64748b');
  return res;
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
        // 1. Sanitize document head (all stylesheets & embedded tags)
        if (clonedDoc.head) {
          clonedDoc.head.innerHTML = sanitizeModernColors(clonedDoc.head.innerHTML);
        }

        // 2. Sanitize all <style> elements directly
        const styles = clonedDoc.querySelectorAll('style');
        styles.forEach((styleTag) => {
          if (styleTag.textContent) {
            styleTag.textContent = sanitizeModernColors(styleTag.textContent);
          }
        });

        // 3. Sanitize target element innerHTML and style attributes
        const targetEl = clonedDoc.getElementById(elementId);
        if (targetEl) {
          if (targetEl.innerHTML) {
            targetEl.innerHTML = sanitizeModernColors(targetEl.innerHTML);
          }

          const allEls = [targetEl, ...Array.from(targetEl.querySelectorAll('*'))] as HTMLElement[];
          allEls.forEach((el) => {
            if (el.style && el.style.cssText) {
              el.style.cssText = sanitizeModernColors(el.style.cssText);
            }
          });
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

