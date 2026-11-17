"use client";

import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";

/** Honour the visitor's "reduce motion" setting everywhere: framer keeps fades but drops movement and scaling. */
export function MotionPrefs({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
