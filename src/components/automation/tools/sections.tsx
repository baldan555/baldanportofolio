"use client";

import { useEffect, useState } from "react";
import type { AutoTool } from "@/data/auto-tools";
import type { Logo } from "../../web/logos";
import { useNpmDownloads } from "../../web/tools/shared";
import { AutoHeadToHead, AutoStackPicker } from "./compare-stack";
import { AutoToolMap, type Pypi } from "./map";
import { AutoPopular } from "./popular";
import { AutoSameTask } from "./same-task";

/** PyPI weekly downloads through this site's cached route (pypistats.org sends no CORS header). */
function usePypi(): Pypi {
  const [d, setD] = useState<Pypi>(null);
  useEffect(() => {
    const ctl = new AbortController();
    fetch("/api/pypi", { signal: ctl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j: { counts: Record<string, number> }) => setD(j.counts))
      .catch((e: Error) => e.name !== "AbortError" && setD("error"));
    return () => ctl.abort();
  }, []);
  return d;
}

/** The Automation tools page body: one npm fetch and one PyPI fetch shared by the map and the popularity chart. */
export function AutoToolsSections({ tools, logos }: { tools: AutoTool[]; logos: Record<string, Logo> }) {
  const npm = useNpmDownloads(tools);
  const pypi = usePypi();
  return (
    <>
      <AutoToolMap tools={tools} logos={logos} npm={npm} pypi={pypi} />
      <AutoSameTask tools={tools} logos={logos} />
      <AutoPopular tools={tools} logos={logos} npm={npm} pypi={pypi} />
      <AutoHeadToHead tools={tools} logos={logos} />
      <AutoStackPicker tools={tools} logos={logos} />
    </>
  );
}
