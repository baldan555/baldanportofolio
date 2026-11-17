import * as icons from "simple-icons";

/** Logos from simple-icons (CC0), resolved on the server so a page only ships the few paths it needs. */
export type Logo = { path: string; hex: string };
type Icon = { path: string; hex: string };
export function logosFor(slugs: string[]): Record<string, Logo> {
  const all = icons as unknown as Record<string, Icon>;
  const out: Record<string, Logo> = {};
  for (const s of slugs) {
    const icon = all[`si${s.charAt(0).toUpperCase()}${s.slice(1)}`];
    if (icon) out[s] = { path: icon.path, hex: icon.hex };
  }
  return out;
}
