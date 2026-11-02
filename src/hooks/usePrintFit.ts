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

// Ceiling for the opposite case: a sheet that's naturally shorter than one
// page grows a little to use more of it instead of leaving blank paper below
// the content. Kept modest (not the 1.3 used on the new Almyar Fleet system)
// because several of this app's work tables (WorkTable.tsx,
// EquipmentWorkTable.tsx, VehicalWorkTable.tsx) give their input cells a
// fixed Tailwind `h-[13px] leading-[13px]` that doesn't scale with
// font-size — grown too far, 12px text starts feeling cramped inside that
// fixed 13px line box.
const MAX_SCALE = 1.1;

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
 * Scales a printable `.w-a4` sheet to fill one A4 page as closely as
 * possible — shrinking it if its natural height overflows, growing it a
 * little if the sheet is naturally shorter than the page. The growth
 * ceiling is deliberately modest (MAX_SCALE) rather than matching the new
 * Almyar Fleet system's 1.3x: see that constant's comment for why.
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

      const target = PRINTABLE_HEIGHT_PX * SAFETY;

      // Binary-search the largest scale (between the floor and ceiling)
      // that still keeps the sheet at or under the target height — runs
      // both when content overflows (shrinks toward MIN_SCALE) and when
      // it's naturally shorter than one page (grows toward MAX_SCALE).
      let lo = MIN_SCALE;
      let hi = MAX_SCALE;
      let best = MIN_SCALE;
      for (let i = 0; i < 10; i++) {
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
