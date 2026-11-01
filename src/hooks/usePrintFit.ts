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
 * natural height slightly overflows.
 *
 * Two approaches were tried and rejected first: `zoom` reflows on-screen
 * layout but Chromium's print/PDF pipeline ignores it outright; `transform:
 * scale()` has the same problem — confirmed by testing against the live site,
 * where it had literally zero effect on the printed output even at extreme
 * values. Both are paint-time tricks print doesn't go through.
 *
 * What print DOES respect is genuinely smaller content, so this walks every
 * element in the sheet and scales its actual `font-size` and padding down by
 * a measured factor (restoring the originals afterwards), then re-measures
 * and nudges the scale down a little further if it's still not quite under
 * the page height — border widths and browser-minimum control heights don't
 * shrink proportionally, so one pass isn't always exact.
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
      if (naturalHeightPx <= PRINTABLE_HEIGHT_PX) return;

      let scale = Math.max(MIN_SCALE, (PRINTABLE_HEIGHT_PX * SAFETY) / naturalHeightPx);
      for (let attempt = 0; attempt < 4; attempt++) {
        restore(sheet);
        scaleBy(sheet, scale);
        const heightPx = sheet.scrollHeight;
        if (heightPx <= PRINTABLE_HEIGHT_PX || scale <= MIN_SCALE) break;
        scale = Math.max(MIN_SCALE, scale * ((PRINTABLE_HEIGHT_PX * SAFETY) / heightPx));
      }
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
