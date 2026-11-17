import type { Metadata, Viewport } from "next";
import { SITE_DESCRIPTION, SITE_TITLE, SITE_URL } from "@/lib/site";
import { Caveat, Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { AnalyticsTag } from "@/components/analytics-tag";
import { MotionPrefs } from "@/components/motion-prefs";
import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const instrument = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});
const caveat = Caveat({ variable: "--font-caveat", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  applicationName: "Baldanullah",
  authors: [{ name: "N.I.S. Baldanullah", url: SITE_URL }],
  creator: "N.I.S. Baldanullah",
  keywords: ["Baldanullah", "data scientist", "full stack developer", "machine learning", "data engineering", "dashboard", "SaaS", "automation", "AI agents", "Makassar", "Indonesia"],
  // no title, description or url here: every page's own title and description are used when it's shared
  openGraph: { type: "website", siteName: "Baldanullah", locale: "en_US" },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = { themeColor: "#fbfbf9" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geist.variable} ${geistMono.variable} ${instrument.variable} ${caveat.variable} antialiased`}
    >
      <body className="min-h-screen">
        <MotionPrefs>{children}</MotionPrefs>
        <AnalyticsTag />
      </body>
    </html>
  );
}
