import Script from "next/script";

/**
 * Google Analytics 4 (property "Portofolio", web stream for portofolio.baldanproject.my.id).
 * Loaded after the page is interactive and only in production builds, so local development doesn't count as visits.
 * Enhanced measurement (set in GA) already records page views, scrolls, outbound clicks and PDF downloads;
 * custom events (CV picker, contact) go through track() in lib/track.ts.
 */
export const GA_ID = process.env.NEXT_PUBLIC_GA_ID || "G-2FSG9JC5FB";

export function AnalyticsTag() {
  if (process.env.NODE_ENV !== "production") return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
      <Script id="ga4-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_ID}');`}
      </Script>
    </>
  );
}
