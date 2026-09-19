import { useLayoutEffect, useRef, useState, type RefObject } from 'react';

export interface ElementSize {
  width: number;
  height: number;
}

/**
 * Measures an element's content box and stays in sync via ResizeObserver.
 *
 * Guards the two failure modes that make ResizeObserver awkward inside a
 * layout that must never grow to fit its content - this app's whole
 * "zero scroll" premise:
 *
 * - An oscillating 1px loop between the observer and layout, and the
 *   "ResizeObserver loop completed with undelivered notifications" warning
 *   it triggers in dev: guarded by rounding the observed size, bailing when
 *   it hasn't actually changed, and coalescing through rAF.
 * - A 0x0 initial size, which would ask layout.ts to lay out an empty box
 *   and (before StrictMode's double-invoke settles) briefly attach the
 *   observer twice: guarded by measuring synchronously before first paint.
 */
export const useElementSize = <T extends Element>(): [RefObject<T>, ElementSize | null] => {
  const ref = useRef<T>(null);
  const [size, setSize] = useState<ElementSize | null>(null);
  const frame = useRef<number | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const apply = (width: number, height: number) => {
      const w = Math.round(width);
      const h = Math.round(height);
      setSize((prev) => (prev && prev.width === w && prev.height === h ? prev : { width: w, height: h }));
    };

    const rect = el.getBoundingClientRect();
    apply(rect.width, rect.height);

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => apply(width, height));
    });
    observer.observe(el);

    return () => {
      observer.disconnect();
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, []);

  return [ref, size];
};
