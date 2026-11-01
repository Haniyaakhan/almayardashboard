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

/**
 * Shrinks a printable `.w-a4` sheet just enough to fit on one A4 page when its
 * natural height slightly overflows.
 *
 * `zoom` was tried first since it reflows layout (unlike `transform: scale`, a
 * paint-only effect that page-break math ignores) — but Chromium's print/PDF
 * pipeline doesn't honor `zoom` at all, so it had no effect on the actual
 * printed output. Instead this scales the sheet with `transform` and, since
 * that alone wouldn't shrink the box pagination measures, also sets an
 * explicit (scaled) height + `overflow: hidden` on its wrapper — a box size
 * print DOES respect — so the page break lands where the shrunk content
 * visually ends.
 */
export function usePrintFit(
  wrapRef: React.RefObject<HTMLElement | null>,
  sheetRef: React.RefObject<HTMLElement | null>
) {
  useEffect(() => {
    function fit() {
      const wrap = wrapRef.current;
      const sheet = sheetRef.current;
      if (!wrap || !sheet) return;

      sheet.style.removeProperty('transform');
      sheet.style.removeProperty('transform-origin');
      sheet.style.removeProperty('width');
      wrap.style.removeProperty('height');
      wrap.style.removeProperty('overflow');

      const naturalHeightPx = sheet.scrollHeight;
      if (naturalHeightPx <= PRINTABLE_HEIGHT_PX) return;

      const scale = Math.max(MIN_SCALE, PRINTABLE_HEIGHT_PX / naturalHeightPx);
      sheet.style.setProperty('transform', `scale(${scale})`, 'important');
      sheet.style.setProperty('transform-origin', 'top left', 'important');
      sheet.style.setProperty('width', `${100 / scale}%`, 'important');
      wrap.style.setProperty('height', `${naturalHeightPx * scale}px`, 'important');
      wrap.style.setProperty('overflow', 'hidden', 'important');
    }

    function reset() {
      const wrap = wrapRef.current;
      const sheet = sheetRef.current;
      sheet?.style.removeProperty('transform');
      sheet?.style.removeProperty('transform-origin');
      sheet?.style.removeProperty('width');
      wrap?.style.removeProperty('height');
      wrap?.style.removeProperty('overflow');
    }

    window.addEventListener('beforeprint', fit);
    window.addEventListener('afterprint', reset);
    return () => {
      window.removeEventListener('beforeprint', fit);
      window.removeEventListener('afterprint', reset);
    };
  }, [wrapRef, sheetRef]);
}
