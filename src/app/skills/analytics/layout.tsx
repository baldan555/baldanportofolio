import { AnalyticsNav } from "@/components/analytics/subnav";

// Data Analytics & BI is a hub with its own sub-pages (overview, data models, tools, chart library), so it has a
// static folder here; static segments are matched before the dynamic /skills/[skill] route.
export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AnalyticsNav />
      {children}
    </>
  );
}
