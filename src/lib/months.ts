/**
 * Month names from a fixed list, never from the runtime's locale data: Node, Chrome and Safari disagree on details
 * like "Sep" vs "Sept", which would make server and browser render different text.
 */
export const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const MONTH_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "2011-11" → "Nov" / "November". */
export const monthOf = (ym: string, style: "short" | "long" = "short") => (style === "long" ? MONTH_LONG : MONTH_SHORT)[Number(ym.slice(5, 7)) - 1];
/** "2011-11" → "November 2011" / "Nov 2011". */
export const monthYearOf = (ym: string, style: "short" | "long" = "long") => `${monthOf(ym, style)} ${ym.slice(0, 4)}`;
/** "2011-12-09" → "9 Dec 2011". */
export const dayOf = (ymd: string) => `${Number(ymd.slice(8, 10))} ${MONTH_SHORT[Number(ymd.slice(5, 7)) - 1]} ${ymd.slice(0, 4)}`;
