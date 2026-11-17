import { DataEngNav } from "@/components/data-eng/subnav";

// Data Engineering is a hub with its own sub-pages (overview, pipeline lab, …), so it has a static folder here;
// static segments are matched before the dynamic /skills/[skill] route.
export default function DataEngLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DataEngNav />
      {children}
    </>
  );
}
