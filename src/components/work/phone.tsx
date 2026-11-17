import Image, { type StaticImageData } from "next/image";

/** A phone-sized screenshot in a dark bezel. */
export function Phone({ src, alt, className = "", priority = false }: { src: StaticImageData; alt: string; className?: string; priority?: boolean }) {
  return (
    <div className={`overflow-hidden rounded-[30px] border-[6px] border-[#211a24] bg-[#211a24] shadow-[0_30px_60px_-30px_rgba(120,0,60,0.55)] ${className}`}>
      <Image src={src} alt={alt} placeholder="blur" priority={priority} sizes="(min-width: 1024px) 300px, (min-width: 640px) 34vw, 72vw" className="block h-auto w-full rounded-[24px]" />
    </div>
  );
}
