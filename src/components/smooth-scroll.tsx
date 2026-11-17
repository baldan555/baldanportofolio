"use client";

import { ReactLenis } from "lenis/react";
import { useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

// Inertia-based smooth scrolling (Lenis). The page still scrolls the native
// window, so framer-motion's useScroll / whileInView keep working unchanged.
export function SmoothScroll({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  if (reduce) return <>{children}</>;

  return (
    <ReactLenis
      root
      options={{
        lerp: 0.085, // lower = floatier glide
        wheelMultiplier: 1,
        smoothWheel: true,
        anchors: { offset: -88, duration: 1.4 },
      }}
    >
      {children}
    </ReactLenis>
  );
}
