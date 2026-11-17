/** Send a custom event to Google Analytics, if the tag has loaded (it doesn't in development or with blockers). */
export function track(name: string, params: Record<string, string | number> = {}) {
  if (typeof window === "undefined") return;
  const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
  gtag?.("event", name, params);
}
