import Image, { type StaticImageData } from "next/image";

/** A real screenshot in a quiet browser frame, for the case pages. */
export function BrowserShot({ src, alt, label, className = "", priority = false }: { src: StaticImageData; alt: string; label: string; className?: string; priority?: boolean }) {
  return (
    <figure className={`overflow-hidden rounded-[18px] border border-ink/10 bg-white shadow-[0_30px_70px_-35px_rgba(0,0,0,0.45)] ${className}`}>
      <div className="flex items-center gap-1.5 border-b border-ink/8 bg-[#f7f7f5] px-3.5 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-ink/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-ink/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-ink/15" />
        <span className="ml-3 truncate rounded-md bg-white px-2.5 py-0.5 font-mono text-[11px] text-ink/50">{label}</span>
      </div>
      <Image src={src} alt={alt} placeholder="blur" sizes="(min-width: 1024px) 640px, 100vw" className="h-auto w-full" priority={priority} />
    </figure>
  );
}
