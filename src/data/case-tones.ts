/* Colours for each "how it works" page, the same ones its Works card uses (sampled from each app's own UI). */

export type Tone = {
  hero: string; // hero background
  kicker: string; // small uppercase labels
  rule: string; // hairlines
  highlight: string; // the coloured words in the title
  chip: string; // hero chips
  cta: string; // the main button
  step: string; // numbered step badges
  soft: string; // a tinted architecture box
};

export const TONES = {
  ioh: {
    hero: "bg-gradient-to-br from-[#fafbfc] via-[#fdf0f3] to-[#fde9da]",
    kicker: "text-[#b8002a]",
    rule: "border-[#E4002B]/20",
    highlight: "text-[#E4002B]",
    chip: "border-[#E4002B]/25 text-[#b8002a]",
    cta: "bg-[#E4002B] text-white shadow-[0_10px_24px_-10px_rgba(228,0,43,0.7)] hover:bg-[#c80026]",
    step: "bg-gradient-to-br from-[#E4002B] via-[#D50057] to-[#F7941D] text-white",
    soft: "bg-gradient-to-br from-[#fdeef1] to-[#fff3e6]",
  },
  ticket: {
    hero: "bg-gradient-to-br from-[#f8fafc] via-[#eef3fb] to-[#e2e8f0]",
    kicker: "text-[#1447e6]",
    rule: "border-[#155dfc]/20",
    highlight: "text-[#155dfc]",
    chip: "border-[#155dfc]/25 text-[#1447e6]",
    cta: "bg-[#155dfc] text-white shadow-[0_10px_24px_-10px_rgba(21,93,252,0.7)] hover:bg-[#1447e6]",
    step: "bg-[#155dfc] text-white",
    soft: "bg-[#eef3fb]",
  },
  graphite: {
    hero: "bg-gradient-to-br from-[#f8f8f9] via-[#eef0f8] to-[#e4e6f3]",
    kicker: "text-[#1d4ed8]",
    rule: "border-[#111113]/15",
    highlight: "bg-gradient-to-r from-[#3b82f6] to-[#6366f1] bg-clip-text text-transparent",
    chip: "border-[#2563eb]/25 text-[#1d4ed8]",
    cta: "bg-[#111113] text-white hover:bg-black",
    step: "bg-gradient-to-br from-[#3b82f6] to-[#6366f1] text-white",
    soft: "bg-gradient-to-br from-[#eef2ff] to-[#f1f1f3]",
  },
  navy: {
    hero: "bg-gradient-to-br from-[#f5f7fb] via-[#eaf0f8] to-[#dde5f0]",
    kicker: "text-[#0b4a8a]",
    rule: "border-[#0b5cad]/20",
    highlight: "text-[#0b5cad]",
    chip: "border-[#0b5cad]/25 text-[#0b4a8a]",
    cta: "bg-[#0b5cad] text-white shadow-[0_10px_24px_-10px_rgba(11,92,173,0.7)] hover:bg-[#0a4f96]",
    step: "bg-[#0b5cad] text-white",
    soft: "bg-[#e4ebf5]",
  },
  tower: {
    hero: "bg-gradient-to-br from-[#fafafa] via-[#f0f1fb] to-[#e9e9f3]",
    kicker: "text-[#3d3090]",
    rule: "border-[#4a3aa7]/18",
    highlight: "bg-gradient-to-r from-[#2a63d6] to-[#4a3aa7] bg-clip-text text-transparent",
    chip: "border-[#4a3aa7]/25 text-[#3d3090]",
    cta: "bg-gradient-to-br from-[#2a63d6] to-[#4a3aa7] text-white shadow-[0_10px_24px_-10px_rgba(74,58,167,0.7)] hover:brightness-110",
    step: "bg-gradient-to-br from-[#2a63d6] to-[#4a3aa7] text-white",
    soft: "bg-[#eeeef9]",
  },
  receipt: {
    hero: "bg-gradient-to-br from-[#f8fafc] via-[#f1f4f8] to-[#e8ecf1]",
    kicker: "text-[#334155]",
    rule: "border-[#0f172b]/15",
    highlight: "text-[#009966]",
    chip: "border-[#0f172b]/20 text-[#334155]",
    cta: "bg-[#0f172b] text-white hover:bg-black",
    step: "bg-[#0f172b] text-white",
    soft: "bg-[#f1f5f9]",
  },
  lavender: {
    hero: "bg-gradient-to-br from-[#fbf7fd] via-[#f4eefc] to-[#ebe8fb]",
    kicker: "text-[#5b4bd6]",
    rule: "border-[#7c6cf0]/20",
    highlight: "bg-gradient-to-r from-[#8b7cf6] to-[#e56bb5] bg-clip-text text-transparent",
    chip: "border-[#7c6cf0]/30 text-[#5b4bd6]",
    cta: "bg-gradient-to-br from-[#8b7cf6] to-[#e56bb5] text-white shadow-[0_10px_24px_-10px_rgba(124,108,240,0.75)] hover:brightness-105",
    step: "bg-gradient-to-br from-[#8b7cf6] to-[#e56bb5] text-white",
    soft: "bg-gradient-to-br from-[#fde7f2] to-[#eeeaff]",
  },
  gold: {
    hero: "bg-gradient-to-br from-[#f8f5ec] via-[#f3ecd9] to-[#ebe3cf]",
    kicker: "text-[#7a5a08]",
    rule: "border-[#94700a]/20",
    highlight: "text-[#a07a10]",
    chip: "border-[#94700a]/30 text-[#7a5a08]",
    cta: "bg-[#7a5a08] text-white shadow-[0_10px_24px_-10px_rgba(107,78,5,0.7)] hover:bg-[#6b4e05]",
    step: "bg-gradient-to-br from-[#6b4e05] to-[#a07a10] text-white",
    soft: "bg-[#f1ede2]",
  },
  cream: {
    hero: "bg-gradient-to-br from-[#fbfbf9] via-[#f3ede1] to-[#ebe3d3]",
    kicker: "text-ink/60",
    rule: "border-ink/15",
    highlight: "font-serif font-normal italic",
    chip: "border-ink/20 text-ink/70",
    cta: "bg-ink text-white hover:bg-ink-2",
    step: "bg-ink text-white",
    soft: "bg-cream",
  },
} satisfies Record<string, Tone>;
