import Link from "next/link";
import { profile } from "@/data/profile";

// Case pages for the "Selected work" cards: normal scrolling, same header language as the skill pages.
export default function WorkLayout({ children }: LayoutProps<"/work">) {
  return (
    <>
      <header className="sticky top-0 z-50 border-b border-line bg-bg/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between px-5 md:px-10">
          <Link href="/" className="group flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-ink font-mono text-[11px] font-semibold text-white transition group-hover:-translate-x-0.5">
              ←
            </span>
            <span className="text-[14px] font-semibold tracking-tight">{profile.firstName}</span>
          </Link>
          <Link href="/#work" className="font-mono text-[12px] tracking-[0.16em] text-muted uppercase hover:text-ink">
            All works
          </Link>
          <a href={`mailto:${profile.email}`} className="rounded-full bg-ink px-4 py-2 text-[13px] font-medium text-white transition hover:bg-ink-2">
            Let&apos;s talk
          </a>
        </div>
      </header>
      <main>{children}</main>
      <footer className="mx-auto mt-24 flex max-w-[1240px] flex-col justify-between gap-2 border-t border-line px-5 py-10 font-mono text-[12px] text-muted sm:flex-row md:px-10">
        <span>© 2026 {profile.name}</span>
        <span>Screens are the real apps running on demo data</span>
      </footer>
    </>
  );
}
