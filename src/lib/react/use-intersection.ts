"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Single-observer intersection helper — lazy-load & infinite scroll.
 * Returns `[ref, inView]`. Attach `ref` to the element to observe.
 *
 * @example
 *   const [ref, inView] = useInView({ rootMargin: "200px" });
 *   return <div ref={ref}>{inView ? <HeavyThing/> : null}</div>
 */
export function useInView(options: IntersectionObserverInit = {}): [((node: Element | null) => void), boolean] {
  const [inView, setInView] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const observedNode = useRef<Element | null>(null);

  const ref = (node: Element | null) => {
    // Tear down old observer if options change or node changes
    observerRef.current?.disconnect();

    if (!node) {
      observedNode.current = null;
      return;
    }

    observedNode.current = node;

    observerRef.current = new IntersectionObserver(([entry]) => {
      setInView(!!entry?.isIntersecting);
      // Once seen, stop observing (one-shot default behaviour)
      if (entry?.isIntersecting && observerRef.current && observedNode.current) {
        observerRef.current.unobserve(observedNode.current);
      }
    }, options);

    observerRef.current.observe(node);
  };

  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  return [ref, inView];
}
