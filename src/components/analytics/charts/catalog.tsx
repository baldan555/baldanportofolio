import { BarH, Bullet, Column, DotPlot, Dumbbell, Grouped, Lollipop, Slope, Stacked, Stacked100 } from "./comparison";
import { Donut, Marimekko, Pie, Sunburst, Treemap, Waffle, Waterfall } from "./composition";
import { BoxPlot, Beeswarm, Density, Ecdf, Histogram, Ridgeline, Violin } from "./distribution";
import { Funnel, Gantt, Sankey } from "./flow";
import { Gauge, HeatTable, KpiCards, TileMap } from "./geo-kpi";
import { Bubble, ConnectedScatter, CorrHeatmap, Scatter } from "./relationship";
import { AreaChart, Calendar, LineChart, MultiLine, Sparklines, StackedArea, StepLine } from "./trend";

import { type ChartDef, FAMILIES, GROUPS } from "./types";
import { COLUMN_VARIANTS } from "./variants/columns";
import { HBAR_VARIANTS } from "./variants/hbars";
import { LINE_VARIANTS } from "./variants/lines";
import { PART_VARIANTS } from "./variants/parts";
import { DIST_VARIANTS } from "./variants/dist";
import { REL_VARIANTS } from "./variants/rel";
import { FLOW_VARIANTS } from "./variants/flows";
import { MAP_VARIANTS } from "./variants/maps";
import { WORD_VARIANTS } from "./variants/words";
import { EXTRA_VARIANTS } from "./variants/extras";

export { FAMILIES, GROUPS, type ChartDef, type Group } from "./types";

/** The family each of the original charts belongs to. */
const FAMILY_OF: Record<string, string> = {
  bar: "Horizontal bars",
  column: "Columns",
  grouped: "Stacked & grouped",
  stacked: "Stacked & grouped",
  stacked100: "Stacked & grouped",
  lollipop: "Dots & lollipops",
  dot: "Dots & lollipops",
  dumbbell: "Dots & lollipops",
  slope: "Dots & lollipops",
  bullet: "Horizontal bars",
  line: "Lines",
  multiline: "Lines",
  area: "Areas",
  stackedarea: "Areas",
  spark: "Lines",
  step: "Lines",
  calendar: "Calendar & cycles",
  histogram: "Histograms",
  box: "Box & violin",
  violin: "Box & violin",
  beeswarm: "Points",
  density: "Curves",
  ecdf: "Curves",
  ridgeline: "Curves",
  pie: "Pies & donuts",
  donut: "Pies & donuts",
  treemap: "Hierarchies",
  sunburst: "Hierarchies",
  waterfall: "Bridges",
  waffle: "Squares & units",
  marimekko: "Squares & units",
  scatter: "Scatter",
  bubble: "Scatter",
  corr: "Matrices",
  connected: "Scatter",
  funnel: "Funnels",
  sankey: "Flows",
  gantt: "Timelines",
  tilemap: "Tile maps",
  kpi: "Cards & gauges",
  gauge: "Cards & gauges",
  heattable: "Tables",
};

const BASE: Omit<ChartDef, "family">[] = [
  // comparison
  { id: "bar", name: "Bar (horizontal)", group: "Comparison", use: "Ranking categories, especially with long names.", avoid: "Time: use a line or columns.", C: BarH },
  { id: "column", name: "Column", group: "Comparison", use: "Comparing a handful of categories or periods.", avoid: "More than ~12 bars, or long labels.", C: Column },
  { id: "grouped", name: "Grouped columns", group: "Comparison", use: "Two or three series side by side per category.", avoid: "Many series: it turns into a picket fence.", C: Grouped },
  { id: "stacked", name: "Stacked columns", group: "Comparison", use: "Totals and their rough make-up.", avoid: "Comparing middle segments: they don't share a baseline.", C: Stacked },
  { id: "stacked100", name: "100% stacked", group: "Comparison", use: "Comparing mix (shares) across categories.", avoid: "When the totals matter: they're hidden.", C: Stacked100 },
  { id: "lollipop", name: "Lollipop", group: "Comparison", use: "A lighter bar chart when values are similar.", avoid: "Values far from zero on a cut axis.", C: Lollipop },
  { id: "dot", name: "Dot plot", group: "Comparison", use: "Two values per category without heavy bars.", avoid: "Readers who expect bars and totals.", C: DotPlot },
  { id: "dumbbell", name: "Dumbbell", group: "Comparison", use: "Before → after per category, showing the gap.", avoid: "More than two time points.", C: Dumbbell },
  { id: "slope", name: "Slope chart", group: "Comparison", use: "Change between two points and rank swaps.", avoid: "Many crossing lines with similar values.", C: Slope },
  { id: "bullet", name: "Bullet chart", group: "Comparison", use: "Actual vs target with good/poor bands.", avoid: "Audiences unfamiliar with it, without a legend.", C: Bullet },
  // trend
  { id: "line", name: "Line", group: "Trend", use: "A value over time: the default for trends.", avoid: "Unordered categories.", C: LineChart },
  { id: "multiline", name: "Multi-line", group: "Trend", use: "A few series over time, labelled at the end.", avoid: "More than ~5 lines: highlight one instead.", C: MultiLine },
  { id: "area", name: "Area", group: "Trend", use: "One total over time, emphasising volume.", avoid: "Several overlapping series.", C: AreaChart },
  { id: "stackedarea", name: "Stacked area", group: "Trend", use: "How parts build a total over time.", avoid: "Reading the upper layers precisely.", C: StackedArea },
  { id: "spark", name: "Sparklines", group: "Trend", use: "A trend next to each number in a table or card.", avoid: "When exact values on the line matter.", C: Sparklines },
  { id: "step", name: "Step line", group: "Trend", use: "Values that change at a moment and then hold (prices, rates).", avoid: "Smoothly changing measurements.", C: StepLine },
  { id: "calendar", name: "Calendar heatmap", group: "Trend", use: "Daily patterns: weekdays, seasons, gaps.", avoid: "Precise comparisons between days.", C: Calendar },
  // distribution
  { id: "histogram", name: "Histogram", group: "Distribution", use: "The shape of one numeric variable.", avoid: "Very few data points; pick bin widths with care.", C: Histogram },
  { id: "box", name: "Box plot", group: "Distribution", use: "Comparing medians, spread and outliers across groups.", avoid: "Hiding two-peaked shapes: check a histogram.", C: BoxPlot },
  { id: "violin", name: "Violin", group: "Distribution", use: "Group comparison with the full shape visible.", avoid: "Non-technical audiences, small samples.", C: Violin },
  { id: "beeswarm", name: "Beeswarm", group: "Distribution", use: "Every data point visible, a few hundred at most.", avoid: "Thousands of points.", C: Beeswarm },
  { id: "density", name: "Density curve", group: "Distribution", use: "Smooth shapes of a few groups on one axis.", avoid: "Small samples: the smoothing invents detail.", C: Density },
  { id: "ecdf", name: "Cumulative (ECDF)", group: "Distribution", use: "“What share is below X?” for each group.", avoid: "Audiences new to cumulative charts.", C: Ecdf },
  { id: "ridgeline", name: "Ridgeline", group: "Distribution", use: "Many distributions stacked, e.g. by month.", avoid: "When exact heights matter.", C: Ridgeline },
  // composition
  { id: "pie", name: "Pie", group: "Composition", use: "Parts of a whole with 2–4 slices.", avoid: "Many slices or close values: use a sorted bar.", C: Pie },
  { id: "donut", name: "Donut", group: "Composition", use: "Like a pie, with the total in the middle.", avoid: "Same limits as a pie.", C: Donut },
  { id: "treemap", name: "Treemap", group: "Composition", use: "Many parts and a hierarchy in a small space.", avoid: "Precise comparisons between similar areas.", C: Treemap },
  { id: "sunburst", name: "Sunburst", group: "Composition", use: "Hierarchies with two or three levels.", avoid: "Deep trees and precise reading.", C: Sunburst },
  { id: "waterfall", name: "Waterfall", group: "Composition", use: "How a start value becomes an end value, step by step.", avoid: "Many tiny steps.", C: Waterfall },
  { id: "waffle", name: "Waffle", group: "Composition", use: "Shares as countable squares (each 1%).", avoid: "Values below 1% or many categories.", C: Waffle },
  { id: "marimekko", name: "Marimekko", group: "Composition", use: "Two shares at once: segment size and mix.", avoid: "Anything needing exact values.", C: Marimekko },
  // relationship
  { id: "scatter", name: "Scatter", group: "Relationship", use: "Whether two numbers move together.", avoid: "Thousands of overlapping points: use density or hexbins.", C: Scatter },
  { id: "bubble", name: "Bubble", group: "Relationship", use: "A third number as bubble area.", avoid: "Reading the third number precisely.", C: Bubble },
  { id: "corr", name: "Correlation heatmap", group: "Relationship", use: "Scanning many pairwise relationships.", avoid: "Forgetting correlation isn't causation.", C: CorrHeatmap },
  { id: "connected", name: "Connected scatter", group: "Relationship", use: "Two measures evolving together over time.", avoid: "Audiences new to it, without labels.", C: ConnectedScatter },
  // flow
  { id: "funnel", name: "Funnel", group: "Flow & process", use: "Drop-off between ordered steps.", avoid: "Steps that aren't sequential.", C: Funnel },
  { id: "sankey", name: "Sankey", group: "Flow & process", use: "How quantities split and flow between stages.", avoid: "Too many nodes: it becomes spaghetti.", C: Sankey },
  { id: "gantt", name: "Gantt", group: "Flow & process", use: "Tasks over time with overlaps.", avoid: "Showing quantities.", C: Gantt },
  // geography
  { id: "tilemap", name: "Tile map", group: "Geography", use: "Equal-size regions, so small provinces aren't lost.", avoid: "When real shapes or distances matter.", C: TileMap },
  // kpis
  { id: "kpi", name: "KPI cards", group: "KPIs & tables", use: "The handful of numbers a dashboard opens with.", avoid: "Without context: always add change or target.", C: KpiCards },
  { id: "gauge", name: "Gauge", group: "KPIs & tables", use: "One progress-to-goal number on a status screen.", avoid: "Several at once: bullets fit better.", C: Gauge },
  { id: "heattable", name: "Heat table", group: "KPIs & tables", use: "Exact numbers with shading for quick scanning.", avoid: "Too many colours in one table.", C: HeatTable },
];

const ALL: ChartDef[] = [
  ...BASE.map((c) => ({ ...c, family: FAMILY_OF[c.id] })),
  ...COLUMN_VARIANTS,
  ...HBAR_VARIANTS,
  ...LINE_VARIANTS,
  ...PART_VARIANTS,
  ...DIST_VARIANTS,
  ...REL_VARIANTS,
  ...FLOW_VARIANTS,
  ...MAP_VARIANTS,
  ...WORD_VARIANTS,
  ...EXTRA_VARIANTS,
];

/** Every chart, ordered by group, then family, keeping the original order inside a family. */
export const CHARTS: ChartDef[] = GROUPS.flatMap((g) => FAMILIES[g].flatMap((f) => ALL.filter((c) => c.group === g && c.family === f)));
