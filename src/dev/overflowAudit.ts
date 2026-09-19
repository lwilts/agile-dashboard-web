/**
 * Proves the "zero scroll at any format" requirement, and catches the
 * failure mode `overflow: hidden` creates as a side effect: overflow no
 * longer produces a scrollbar, it produces silent clipping, so the
 * browser's usual feedback signal is gone. This walks the DOM looking for
 * anything that clips or escapes #root's bounds, and is what
 * `?audit=1` (wired up in main.tsx) and the Playwright viewport matrix in
 * `e2e/layout.spec.ts` both read.
 */

export interface OverflowFinding {
  selector: string;
  reason: string;
}

declare global {
  interface Window {
    __overflowAudit?: OverflowFinding[];
  }
}

const describe = (el: Element): string => {
  // `el.className` is an SVGAnimatedString (not a string) on SVG elements -
  // the class attribute works uniformly for both.
  const id = el.id ? `#${el.id}` : '';
  const classAttr = el.getAttribute('class')?.trim();
  const cls = classAttr ? `.${classAttr.split(/\s+/).join('.')}` : '';
  return `${el.tagName.toLowerCase()}${id}${cls}`;
};

export const runOverflowAudit = (): OverflowFinding[] => {
  const root = document.getElementById('root');
  if (!root) return [];

  // The viewport, not #root's own box, is the real bound to check against:
  // #root's only child (.dashboard) is `position: fixed`, so it is removed
  // from #root's normal flow and #root itself collapses to near-zero size -
  // comparing against it would flag everything on the page as escaping.
  const viewport = { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight };
  const findings: OverflowFinding[] = [];

  const walk = (el: Element) => {
    if (el instanceof HTMLElement) {
      if (el.scrollWidth > el.clientWidth + 1) {
        findings.push({ selector: describe(el), reason: `scrollWidth ${el.scrollWidth} > clientWidth ${el.clientWidth}` });
      }
      if (el.scrollHeight > el.clientHeight + 1) {
        findings.push({ selector: describe(el), reason: `scrollHeight ${el.scrollHeight} > clientHeight ${el.clientHeight}` });
      }
    }

    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      const escapes =
        rect.left < viewport.left - 1 ||
        rect.top < viewport.top - 1 ||
        rect.right > viewport.right + 1 ||
        rect.bottom > viewport.bottom + 1;
      if (escapes) {
        findings.push({ selector: describe(el), reason: 'escapes the viewport' });
      }
    }

    for (const child of Array.from(el.children)) walk(child);
  };

  walk(root);

  const docEl = document.documentElement;
  if (docEl.scrollWidth > docEl.clientWidth + 1 || docEl.scrollHeight > docEl.clientHeight + 1) {
    findings.push({
      selector: 'html',
      reason: `document scroll ${docEl.scrollWidth}x${docEl.scrollHeight} > viewport ${docEl.clientWidth}x${docEl.clientHeight}`,
    });
  }

  return findings;
};

/** Best-effort visual outline for manual debugging - the audit array itself is the real result. */
export const outlineOverflowFindings = (findings: OverflowFinding[]): void => {
  for (const { selector } of findings) {
    try {
      document.querySelectorAll(selector).forEach((el) => {
        if (el instanceof HTMLElement) el.style.outline = '2px solid magenta';
      });
    } catch {
      // A generated selector can be malformed or non-unique; the array result still stands.
    }
  }
};
