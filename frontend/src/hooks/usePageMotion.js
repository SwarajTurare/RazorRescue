import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';

export function usePageMotion() {
  const rootRef = useRef(null);
  useLayoutEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const root = rootRef.current;
    if (!root) return;
    const ctx = gsap.context(() => {
      gsap.from(root.querySelectorAll('[data-motion="fade"]'), {opacity:0,y:14,duration:.5,stagger:.06,ease:'power2.out'});
    }, root);
    return () => ctx.revert();
  }, []);
  return rootRef;
}
