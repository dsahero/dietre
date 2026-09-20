import { useEffect } from 'react';

// Several popups (or a popup over the fullscreen map) can be open at once, so
// the lock is reference-counted: the page only scrolls again when the last
// one closes.
let lockCount = 0;
let previous: {
  bodyOverflow: string;
  bodyPaddingRight: string;
  htmlOverflow: string;
  htmlOverscroll: string;
} | null = null;

function lock() {
  if (lockCount === 0) {
    const body = document.body;
    const html = document.documentElement;
    previous = {
      bodyOverflow: body.style.overflow,
      bodyPaddingRight: body.style.paddingRight,
      htmlOverflow: html.style.overflow,
      htmlOverscroll: html.style.overscrollBehavior,
    };
    // Losing the scrollbar would shift the page sideways; pad by its width.
    const scrollbar = window.innerWidth - html.clientWidth;
    if (scrollbar > 0) {
      const current = parseFloat(getComputedStyle(body).paddingRight) || 0;
      body.style.paddingRight = `${current + scrollbar}px`;
    }
    // The app sets its own overflow on <html> (overflow-x: clip), which stops
    // <body>'s overflow from reaching the viewport — so lock both.
    html.style.overflow = 'hidden';
    html.style.overscrollBehavior = 'none';
    body.style.overflow = 'hidden';
  }
  lockCount++;
}

function unlock() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0 && previous) {
    document.body.style.overflow = previous.bodyOverflow;
    document.body.style.paddingRight = previous.bodyPaddingRight;
    document.documentElement.style.overflow = previous.htmlOverflow;
    document.documentElement.style.overscrollBehavior = previous.htmlOverscroll;
    previous = null;
  }
}

/** Stops the page behind a popup from scrolling while `active` is true. */
export function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    lock();
    return unlock;
  }, [active]);
}
