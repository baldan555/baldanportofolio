"use client";

import type { WebTool } from "@/data/web-tools";
import type { Logo } from "../logos";
import { HeadToHead, StackBuilder } from "./compare-build";
import { NpmLive } from "./npm-live";
import { SameTask } from "./same-task";
import { useNpmDownloads } from "./shared";
import { ToolMap } from "./tool-map";

/** The Tools page body: one live npm fetch shared by the map and the popularity chart. */
export function ToolsSections({ tools, logos }: { tools: WebTool[]; logos: Record<string, Logo> }) {
  const downloads = useNpmDownloads(tools);
  return (
    <>
      <ToolMap tools={tools} logos={logos} downloads={downloads} />
      <SameTask tools={tools} logos={logos} />
      <NpmLive tools={tools} logos={logos} downloads={downloads} />
      <HeadToHead tools={tools} logos={logos} />
      <StackBuilder tools={tools} logos={logos} />
    </>
  );
}
