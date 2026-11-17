import { DOWN_FOR, DUP_N, LATE_BY, LATE_FOR, type Kind } from "./incident-engine";

/** Names, one-line descriptions and colours of the four incidents (shared by the simulator and the guardrail cards). */
export const KINDS: Record<Kind, { label: string; line: string; color: string }> = {
  down: { label: "API down", line: `The source answers HTTP 503 for ${DOWN_FOR} hours.`, color: "#c8413f" },
  schema: { label: "Schema change", line: 'Upstream renames the field "pm2_5" to "pm25".', color: "#6250d6" },
  dups: { label: "Duplicates", line: `The source sends the last ${DUP_N} hours a second time.`, color: "#eb6834" },
  late: { label: "Late data", line: `${LATE_FOR} hours arrive ${LATE_BY} hours late.`, color: "#c29a00" },
};
