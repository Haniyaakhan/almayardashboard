import { useEffect } from 'react';

// Keep this in sync with the `@page { margin: ... }` print rule in globals.css.
const PAGE_MARGIN_MM = 6;
const A4_HEIGHT_MM = 297;
const MM_TO_PX = 96 / 25.4;
const PRINTABLE_HEIGHT_PX = (A4_HEIGHT_MM - 2 * PAGE_MARGIN_MM) * MM_TO_PX;

// Floor so very long sheets (e.g. a 31-day month with every optional row filled)
// still shrink to fit a single printed page, but never become illegibly small —
// past this point it's safer to let the sheet spill onto a second page than to
// squeeze it unreadable.
const MIN_SCALE = 0.75;

// Small headroom so the result sits a little under the page edge rather than
// exactly on it.
const SAFETY = 0.97;

const PADDING_PROPS = ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'] as const;

interface SavedStyle {
  fontSize: string;
  paddingTop: string;
  paddingRight: string;
  paddingBottom: string;
  paddingLeft: string;
}

/**
 * Shrinks a printable `.w-a4` sheet just enough to fit on one A4 page when its
 * natural height overflows — shrink-only (never grows), since this app's
 * sheets mix inline-styled components with Tailwind-arbitrary-value ones
 * (fixed `h-[13px]`-style input heights in WorkTable.tsx) where growing text
 * risks clipping inside a height that doesn't scale with it. Overflow is the
 * safer direction here: shrinking just leaves a little more breathing room
 * inside those fixed heights rather than less.
 *
 * Scales every element's *computed* font-size/padding via a binary search for
 * the largest scale that still fits, restoring the originals after printing.
 */
export function usePrintFit(sheetRef: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const original = new WeakMap<HTMLElement, SavedStyle>();

    function elementsOf(root: HTMLElement): HTMLElement[] {
      return [root, ...Array.from(root.querySelectorAll<HTMLElement>('*'))];
    }

    function restore(root: HTMLElement) {
      for (const el of elementsOf(root)) {
        const saved = original.get(el);
        if (!saved) continue;
        el.style.fontSize = saved.fontSize;
        el.style.paddingTop = saved.paddingTop;
        el.style.paddingRight = saved.paddingRight;
        el.style.paddingBottom = saved.paddingBottom;
        el.style.paddingLeft = saved.paddingLeft;
        original.delete(el);
      }
    }

    function scaleBy(root: HTMLElement, factor: number) {
      for (const el of elementsOf(root)) {
        const cs = getComputedStyle(el);
        if (!original.has(el)) {
          original.set(el, {
            fontSize: el.style.fontSize,
            paddingTop: el.style.paddingTop,
            paddingRight: el.style.paddingRight,
            paddingBottom: el.style.paddingBottom,
            paddingLeft: el.style.paddingLeft,
          });
        }
        const fontSize = parseFloat(cs.fontSize);
        if (fontSize) el.style.fontSize = `${fontSize * factor}px`;
        for (const prop of PADDING_PROPS) {
          const value = parseFloat(cs[prop]);
          if (value) el.style[prop] = `${value * factor}px`;
        }
      }
    }

    function fit() {
      const sheet = sheetRef.current;
      if (!sheet) return;
      restore(sheet);

      const naturalHeightPx = sheet.scrollHeight;
      const target = PRINTABLE_HEIGHT_PX * SAFETY;
      if (naturalHeightPx <= target) return;

      // Binary-search the largest scale (least shrink) that still fits.
      let lo = MIN_SCALE;
      let hi = 1;
      let best = MIN_SCALE;
      for (let i = 0; i < 8; i++) {
        const mid = (lo + hi) / 2;
        restore(sheet);
        scaleBy(sheet, mid);
        if (sheet.scrollHeight <= target) {
          best = mid;
          lo = mid;
        } else {
          hi = mid;
        }
      }
      restore(sheet);
      scaleBy(sheet, best);
    }

    function reset() {
      const sheet = sheetRef.current;
      if (sheet) restore(sheet);
    }

    window.addEventListener('beforeprint', fit);
    window.addEventListener('afterprint', reset);
    return () => {
      window.removeEventListener('beforeprint', fit);
      window.removeEventListener('afterprint', reset);
      reset();
    };
  }, [sheetRef]);
}
