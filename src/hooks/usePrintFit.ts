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
const MIN_ZOOM = 0.75;

/**
 * Shrinks a printable `.w-a4` sheet just enough to fit on one A4 page when its
 * natural height slightly overflows, using `zoom` (which reflows layout, unlike
 * `transform: scale`, so page-break math stays correct and nothing gets clipped
 * even if the content is too tall to fit at the floor zoom).
 */
export function usePrintFit(ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    function fit() {
      const el = ref.current;
      if (!el) return;
      el.style.removeProperty('zoom');
      const contentHeightPx = el.scrollHeight;
      if (contentHeightPx > PRINTABLE_HEIGHT_PX) {
        const factor = Math.max(MIN_ZOOM, PRINTABLE_HEIGHT_PX / contentHeightPx);
        el.style.setProperty('zoom', String(factor));
      }
    }

    function reset() {
      ref.current?.style.removeProperty('zoom');
    }

    window.addEventListener('beforeprint', fit);
    window.addEventListener('afterprint', reset);
    return () => {
      window.removeEventListener('beforeprint', fit);
      window.removeEventListener('afterprint', reset);
    };
  }, [ref]);
}
