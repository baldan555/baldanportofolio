import { WebNav } from "@/components/web/subnav";

// Web, SaaS & Mobile is a hub with its own sub-pages, so it has a static folder here;
// static segments are matched before the dynamic /skills/[skill] route.
export default function WebLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <WebNav />
      {children}
    </>
  );
}
