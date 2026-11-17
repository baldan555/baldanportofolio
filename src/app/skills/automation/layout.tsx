import { AutoNav } from "@/components/automation/subnav";

// Automation & AI Agents is a hub with its own sub-pages, so it has a static folder here;
// static segments are matched before the dynamic /skills/[skill] route.
export default function AutomationLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AutoNav />
      {children}
    </>
  );
}
