import type { ComponentType } from "react";

export const GROUPS = ["Comparison", "Trend", "Distribution", "Composition", "Relationship", "Flow & process", "Geography", "Text & words", "KPIs & tables"] as const;
export type Group = (typeof GROUPS)[number];

/** Families inside each group, in display order: the "models" of a chart type (every kind of bar, every kind of line…). */
export const FAMILIES: Record<Group, string[]> = {
  Comparison: ["Columns", "Horizontal bars", "Stacked & grouped", "Dots & lollipops", "Radial bars"],
  Trend: ["Lines", "Areas", "Financial", "Calendar & cycles"],
  Distribution: ["Histograms", "Box & violin", "Points", "Curves"],
  Composition: ["Pies & donuts", "Squares & units", "Hierarchies", "Bridges"],
  Relationship: ["Scatter", "Matrices", "Multivariate", "Networks", "Sets", "Model evaluation"],
  "Flow & process": ["Funnels", "Flows", "Timelines"],
  Geography: ["Province maps", "World maps", "Tile maps", "Symbol maps"],
  "Text & words": ["Word clouds", "Word charts"],
  "KPIs & tables": ["Cards & gauges", "Tables"],
};

export type ChartDef = { id: string; name: string; group: Group; family: string; use: string; avoid: string; C: ComponentType };
/** Shorthand used by the variant files: [id, name, use, avoid, Component]. */
export type Row = [string, string, string, string, ComponentType];
export const defs = (group: Group, family: string, rows: Row[]): ChartDef[] => rows.map(([id, name, use, avoid, C]) => ({ id, name, group, family, use, avoid, C }));
