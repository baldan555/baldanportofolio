/**
 * Tools for the Web, SaaS & Mobile hub: the wider landscape, layer by layer, with my own stack marked (from the stack
 * graph in profile.ts). Ratings are rule-of-thumb judgements (1–5), not benchmarks, and are labelled as such on the
 * page. `npm` names the package whose weekly downloads the page fetches live (JavaScript tools only).
 */
export type Layer = "Frontend" | "Meta-framework" | "Styling & UI" | "Backend" | "Data" | "Auth & payments" | "Mobile" | "Hosting & DevOps";
export const LAYERS: { id: Layer; what: string }[] = [
  { id: "Frontend", what: "what people see and click: components and state" },
  { id: "Meta-framework", what: "routing, rendering on the server, the whole app around the UI" },
  { id: "Styling & UI", what: "how it looks: CSS systems and ready-made components" },
  { id: "Backend", what: "APIs, rules and jobs that run on a server" },
  { id: "Data", what: "databases, caches and the code that talks to them" },
  { id: "Auth & payments", what: "logins, roles, subscriptions and checkout" },
  { id: "Mobile", what: "apps installed from the App Store and Google Play" },
  { id: "Hosting & DevOps", what: "where it runs, how it ships, how you know it broke" },
];
export type Ratings = { ease: number; speed: number; ecosystem: number; flexibility: number; scale: number };
export const RATING_LABELS: [keyof Ratings, string][] = [
  ["ease", "Easy to start"],
  ["speed", "Fast for users"],
  ["ecosystem", "Ecosystem"],
  ["flexibility", "Flexibility"],
  ["scale", "Grows with you"],
];
export type WebTool = {
  id: string;
  name: string;
  layer: Layer;
  icon?: string;
  mono?: string;
  color: string;
  mine: boolean;
  lang: string;
  what: string;
  strong: string;
  weak: string;
  when: string;
  npm?: string;
  ratings: Ratings;
};
const r = (ease: number, speed: number, ecosystem: number, flexibility: number, scale: number): Ratings => ({ ease, speed, ecosystem, flexibility, scale });

export const WEB_TOOLS: WebTool[] = [
  // Frontend
  { id: "react", name: "React", layer: "Frontend", icon: "react", color: "#149eca", mine: true, lang: "JavaScript", npm: "react", what: "Components and state for building interfaces; the most used UI library.", strong: "Huge ecosystem and hiring pool; runs on the web and, through React Native, on phones.", weak: "Only the UI layer: routing, data and build need other tools.", when: "Most web apps, especially when a mobile app may follow.", ratings: r(3, 4, 5, 5, 5) },
  { id: "vue", name: "Vue", layer: "Frontend", icon: "vuedotjs", color: "#42b883", mine: true, lang: "JavaScript", npm: "vue", what: "An approachable UI framework with templates and reactive state.", strong: "Gentle learning curve, clear official tooling, great for dashboards and portals.", weak: "Smaller ecosystem than React outside Asia and Europe.", when: "Internal tools and teams that want conventions out of the box.", ratings: r(5, 4, 4, 4, 4) },
  { id: "svelte", name: "Svelte", layer: "Frontend", icon: "svelte", color: "#ff3e00", mine: false, lang: "JavaScript", npm: "svelte", what: "A compiler that turns components into small, fast JavaScript.", strong: "Little code, tiny bundles, very readable components.", weak: "Fewer ready-made libraries and fewer developers to hire.", when: "Fast, lightweight sites and interactive widgets.", ratings: r(5, 5, 3, 4, 4) },
  { id: "angular", name: "Angular", layer: "Frontend", icon: "angular", color: "#dd0031", mine: false, lang: "TypeScript", npm: "@angular/core", what: "A full framework with routing, forms and dependency injection built in.", strong: "Strong conventions for big teams; everything comes in the box.", weak: "Heavier to learn and more ceremony for small apps.", when: "Large enterprise apps with many developers.", ratings: r(2, 4, 4, 3, 5) },
  { id: "solid", name: "SolidJS", layer: "Frontend", icon: "solid", color: "#2c4f7c", mine: false, lang: "JavaScript", npm: "solid-js", what: "React-like syntax with fine-grained reactivity and no virtual DOM.", strong: "Among the fastest UI libraries in benchmarks; familiar JSX.", weak: "Young ecosystem.", when: "Performance-critical interfaces.", ratings: r(3, 5, 2, 4, 3) },
  { id: "htmx", name: "htmx", layer: "Frontend", icon: "htmx", color: "#3366cc", mine: false, lang: "HTML", npm: "htmx.org", what: "Adds interactivity with HTML attributes; the server returns HTML pieces.", strong: "Almost no JavaScript; pairs well with Django, Laravel or Go.", weak: "Not built for very app-like, offline or highly interactive UIs.", when: "Server-rendered apps that need a little interactivity.", ratings: r(5, 4, 2, 3, 3) },
  // Meta-frameworks
  { id: "next", name: "Next.js", layer: "Meta-framework", icon: "nextdotjs", color: "#000000", mine: true, lang: "TypeScript", npm: "next", what: "React with routing, server rendering, static pages and API routes in one app.", strong: "One codebase for pages and APIs; static, server and streaming rendering per route.", weak: "Many concepts to learn; some features shine most on Vercel.", when: "SaaS products, marketing sites and dashboards built with React. This site runs on it.", ratings: r(3, 5, 5, 5, 5) },
  { id: "nuxt", name: "Nuxt", layer: "Meta-framework", icon: "nuxt", color: "#00dc82", mine: false, lang: "TypeScript", npm: "nuxt", what: "The Next.js of Vue: routing, server rendering and modules.", strong: "Vue's simplicity with a full app framework around it.", weak: "Smaller module ecosystem than Next.js.", when: "Vue teams building full sites or SaaS.", ratings: r(4, 5, 4, 4, 4) },
  { id: "sveltekit", name: "SvelteKit", layer: "Meta-framework", icon: "svelte", color: "#ff3e00", mine: false, lang: "TypeScript", npm: "@sveltejs/kit", what: "Svelte's app framework: routing, server rendering, endpoints.", strong: "Small, fast apps with very little code.", weak: "Fewer integrations and examples than Next.js.", when: "Fast apps by small teams that like Svelte.", ratings: r(4, 5, 3, 4, 4) },
  { id: "astro", name: "Astro", layer: "Meta-framework", icon: "astro", color: "#bc52ee", mine: false, lang: "TypeScript", npm: "astro", what: "Content-first sites that ship zero JavaScript unless a part needs it.", strong: "Very fast blogs, docs and landing pages; use React, Vue or Svelte inside.", weak: "Not meant for heavy app-like products.", when: "Marketing sites, blogs and documentation.", ratings: r(5, 5, 4, 4, 3) },
  // Styling & UI
  { id: "tailwind", name: "Tailwind CSS", layer: "Styling & UI", icon: "tailwindcss", color: "#06b6d4", mine: true, lang: "CSS", npm: "tailwindcss", what: "Utility classes for styling directly in the markup.", strong: "Fast to build consistent designs; no naming or dead CSS. This site uses it.", weak: "Busy class lists until you get used to it.", when: "Nearly any modern web UI.", ratings: r(4, 5, 5, 5, 5) },
  { id: "shadcn", name: "shadcn/ui", layer: "Styling & UI", icon: "shadcnui", color: "#000000", mine: false, lang: "TypeScript", what: "Copy-in React components built on Radix and Tailwind; you own the code.", strong: "Accessible, good-looking defaults you can change freely.", weak: "You maintain the copied components yourself.", when: "React SaaS dashboards and admin panels.", ratings: r(4, 5, 4, 5, 4) },
  { id: "mui", name: "MUI", layer: "Styling & UI", icon: "mui", color: "#007fff", mine: false, lang: "TypeScript", npm: "@mui/material", what: "A large React component library following Material Design.", strong: "Data grids, date pickers and forms ready to use.", weak: "Looks like Google unless you theme it heavily; bigger bundles.", when: "Internal tools where speed beats a custom look.", ratings: r(4, 3, 5, 3, 4) },
  { id: "bootstrap", name: "Bootstrap", layer: "Styling & UI", icon: "bootstrap", color: "#7952b3", mine: false, lang: "CSS", npm: "bootstrap", what: "The classic CSS framework: grid, components, utilities.", strong: "Everyone knows it; works without any JavaScript framework.", weak: "Generic look; heavier than utility-first CSS.", when: "Quick server-rendered pages and legacy projects.", ratings: r(5, 4, 4, 3, 3) },
  { id: "sass", name: "Sass", layer: "Styling & UI", icon: "sass", color: "#cc6699", mine: false, lang: "CSS", npm: "sass", what: "CSS with variables, nesting and mixins, compiled to plain CSS.", strong: "Structured stylesheets for big design systems.", weak: "Modern CSS now covers much of what it added.", when: "Large hand-written design systems.", ratings: r(4, 5, 4, 4, 4) },
  // Backend
  { id: "express", name: "Express", layer: "Backend", icon: "express", color: "#000000", mine: true, lang: "JavaScript", npm: "express", what: "The minimal Node.js web server: routes and middleware.", strong: "Simple, everywhere, one language with the frontend.", weak: "No structure: you choose and wire everything yourself.", when: "Small APIs, webhooks and bots.", ratings: r(5, 4, 5, 5, 3) },
  { id: "nest", name: "NestJS", layer: "Backend", icon: "nestjs", color: "#e0234e", mine: false, lang: "TypeScript", npm: "@nestjs/core", what: "A structured Node.js framework with modules and dependency injection.", strong: "Angular-like organisation for big TypeScript backends.", weak: "A lot of boilerplate for small services.", when: "Large TypeScript APIs with many developers.", ratings: r(3, 4, 4, 4, 5) },
  { id: "fastapi", name: "FastAPI", layer: "Backend", icon: "fastapi", color: "#009688", mine: true, lang: "Python", what: "Modern Python APIs with type hints, validation and automatic docs.", strong: "Very quick to build; same language as data and ML code.", weak: "You pick the ORM, auth and admin yourself.", when: "APIs next to data or ML work, and backends for mobile apps.", ratings: r(5, 4, 4, 4, 4) },
  { id: "django", name: "Django", layer: "Backend", icon: "django", color: "#0c4b33", mine: false, lang: "Python", what: "Python's batteries-included framework: ORM, admin, auth, forms.", strong: "An admin panel and auth for free; very mature.", weak: "Opinionated; async support came late.", when: "Content-heavy apps and back offices in Python.", ratings: r(4, 3, 5, 3, 5) },
  { id: "laravel", name: "Laravel", layer: "Backend", icon: "laravel", color: "#ff2d20", mine: false, lang: "PHP", what: "PHP's most popular framework: routing, ORM, queues, auth.", strong: "Very productive; huge community, especially in Indonesia.", weak: "PHP hosting habits; less common for ML-adjacent work.", when: "Business apps, portals and SaaS on a PHP team.", ratings: r(4, 3, 5, 4, 4) },
  { id: "go", name: "Go", layer: "Backend", icon: "go", color: "#00add8", mine: true, lang: "Go", what: "A compiled language with a strong standard library for servers.", strong: "Fast, small binaries, easy concurrency; great for high load.", weak: "More code for CRUD than Rails-style frameworks.", when: "High-throughput services and infrastructure tools.", ratings: r(3, 5, 4, 4, 5) },
  { id: "spring", name: "Spring Boot", layer: "Backend", icon: "springboot", color: "#6db33f", mine: false, lang: "Java / Kotlin", what: "The standard Java framework for enterprise services.", strong: "Battle-tested, everything integrates; banks and telcos run on it.", weak: "Heavy for small projects; slower to start.", when: "Large enterprise systems on the JVM.", ratings: r(2, 4, 5, 4, 5) },
  { id: "rails", name: "Ruby on Rails", layer: "Backend", icon: "rubyonrails", color: "#d30001", mine: false, lang: "Ruby", what: "Convention over configuration: a full web app in very little code.", strong: "Fastest way from idea to working CRUD product.", weak: "Smaller talent pool in Southeast Asia.", when: "Startups that want to ship a product quickly.", ratings: r(4, 3, 4, 3, 4) },
  // Data
  { id: "postgres", name: "PostgreSQL", layer: "Data", icon: "postgresql", color: "#336791", mine: true, lang: "SQL", what: "The open-source relational database most new products start on.", strong: "Reliable, powerful SQL, JSON columns, extensions like PostGIS.", weak: "You manage scaling and backups unless it's hosted.", when: "The default database for SaaS and business apps.", ratings: r(4, 4, 5, 5, 5) },
  { id: "mysql", name: "MySQL", layer: "Data", icon: "mysql", color: "#4479a1", mine: false, lang: "SQL", what: "The classic open-source relational database.", strong: "Everywhere, cheap to host, well understood.", weak: "Fewer advanced features than PostgreSQL.", when: "PHP and Laravel apps, shared hosting.", ratings: r(4, 4, 5, 4, 4) },
  { id: "mongodb", name: "MongoDB", layer: "Data", icon: "mongodb", color: "#47a248", mine: false, lang: "JSON", what: "A document database: store JSON-like records without a fixed schema.", strong: "Flexible shapes, easy to start, scales out.", weak: "Joins and strict consistency take more care.", when: "Content and event data whose shape changes often.", ratings: r(5, 4, 4, 4, 4) },
  { id: "redis", name: "Redis", layer: "Data", icon: "redis", color: "#ff4438", mine: false, lang: "commands", what: "An in-memory store for caches, sessions, queues and counters.", strong: "Microsecond reads; perfect for rate limits and leaderboards.", weak: "Memory is expensive; not your main database.", when: "Caching and real-time features next to a main database.", ratings: r(4, 5, 5, 4, 4) },
  { id: "sqlite", name: "SQLite", layer: "Data", icon: "sqlite", color: "#003b57", mine: true, lang: "SQL", what: "A whole SQL database in a single file, inside the app.", strong: "Zero setup; the standard for offline data on phones.", weak: "One writer at a time; not for many servers.", when: "Mobile offline storage, prototypes, small sites.", ratings: r(5, 5, 4, 3, 2) },
  { id: "firestore", name: "Firestore", layer: "Data", icon: "firebase", color: "#ffca28", mine: true, lang: "JSON", npm: "firebase", what: "Google's real-time document database with mobile SDKs and offline sync.", strong: "Live updates and offline support for apps with almost no backend code.", weak: "Queries are limited; costs grow with reads.", when: "Mobile and real-time apps that need to ship fast.", ratings: r(5, 4, 4, 3, 4) },
  { id: "supabase", name: "Supabase", layer: "Data", icon: "supabase", color: "#3ecf8e", mine: false, lang: "SQL", what: "Hosted PostgreSQL with auth, storage, real-time and APIs on top.", strong: "A Firebase-like experience on a real SQL database.", weak: "Platform lock-in for the extra features.", when: "MVPs and small SaaS that want a backend in an afternoon.", ratings: r(5, 4, 4, 4, 4) },
  { id: "prisma", name: "Prisma", layer: "Data", icon: "prisma", color: "#2d3748", mine: true, lang: "TypeScript", npm: "prisma", what: "A typed ORM: a schema file becomes a typed database client and migrations.", strong: "Autocomplete for every query; clear migrations.", weak: "An extra layer; complex SQL sometimes needs raw queries.", when: "TypeScript backends on SQL databases.", ratings: r(4, 4, 5, 4, 4) },
  { id: "drizzle", name: "Drizzle", layer: "Data", icon: "drizzle", color: "#7a9a1a", mine: false, lang: "TypeScript", npm: "drizzle-orm", what: "A lightweight TypeScript ORM that stays close to SQL.", strong: "Small, fast, works well on serverless and edge.", weak: "Younger, fewer guides than Prisma.", when: "Serverless TypeScript apps that like writing SQL.", ratings: r(3, 5, 3, 5, 4) },
  // Auth & payments
  { id: "authjs", name: "Auth.js (NextAuth)", layer: "Auth & payments", mono: "AJ", color: "#7c3aed", mine: true, lang: "TypeScript", npm: "next-auth", what: "Open-source authentication for Next.js and friends: OAuth, email, credentials.", strong: "Free and self-hosted; Google, GitHub and other logins in minutes.", weak: "You own sessions, roles and edge cases yourself.", when: "Next.js apps that want logins without a paid service.", ratings: r(3, 4, 4, 4, 4) },
  { id: "clerk", name: "Clerk", layer: "Auth & payments", icon: "clerk", color: "#6c47ff", mine: false, lang: "TypeScript", npm: "@clerk/nextjs", what: "Hosted users and logins with ready-made sign-in screens and organisations.", strong: "Polished UI, multi-tenant organisations, MFA out of the box.", weak: "Monthly cost per active user; your users live on their platform.", when: "SaaS that wants teams and roles working on day one.", ratings: r(5, 4, 3, 3, 4) },
  { id: "auth0", name: "Auth0", layer: "Auth & payments", icon: "auth0", color: "#eb5424", mine: false, lang: "any", what: "Enterprise identity platform: single sign-on, rules, compliance.", strong: "Enterprise SSO (SAML, Active Directory) and audit features.", weak: "Gets expensive; more setup than simpler tools.", when: "B2B products selling to big companies.", ratings: r(3, 4, 4, 4, 5) },
  { id: "stripe", name: "Stripe", layer: "Auth & payments", icon: "stripe", color: "#635bff", mine: false, lang: "any", npm: "stripe", what: "Payments and subscriptions with excellent APIs and dashboards.", strong: "Subscriptions, invoices and customer portal built in.", weak: "Availability for merchants varies by country.", when: "Global SaaS billing.", ratings: r(4, 4, 5, 4, 5) },
  { id: "xendit", name: "Xendit", layer: "Auth & payments", icon: "xendit", color: "#4573ff", mine: false, lang: "any", what: "Southeast Asian payments: virtual accounts, e-wallets, QRIS, cards.", strong: "Local methods Indonesians actually use.", weak: "Mostly a Southeast Asia focus.", when: "Products charging customers in Indonesia.", ratings: r(4, 4, 3, 4, 4) },
  { id: "midtrans", name: "Midtrans", layer: "Auth & payments", mono: "MT", color: "#0a2a66", mine: false, lang: "any", what: "Indonesian payment gateway: bank transfer, e-wallets, QRIS, cards.", strong: "Wide local coverage with a ready-made checkout page.", weak: "Focused on Indonesia.", when: "Indonesian e-commerce and subscriptions.", ratings: r(4, 4, 3, 3, 4) },
  // Mobile
  { id: "rn", name: "React Native", layer: "Mobile", icon: "react", color: "#61dafb", mine: true, lang: "TypeScript", npm: "react-native", what: "Native iOS and Android apps written in React.", strong: "Share skills and code with the web; real native components.", weak: "Some native features still need platform code.", when: "Teams that already build with React.", ratings: r(4, 4, 5, 4, 4) },
  { id: "expo", name: "Expo", layer: "Mobile", icon: "expo", color: "#000020", mine: true, lang: "TypeScript", npm: "expo", what: "The toolkit around React Native: builds, updates, device APIs.", strong: "No Xcode or Android Studio to start; over-the-air updates.", weak: "Unusual native modules need a custom build.", when: "Most new React Native apps.", ratings: r(5, 4, 5, 4, 4) },
  { id: "flutter", name: "Flutter", layer: "Mobile", icon: "flutter", color: "#02569b", mine: false, lang: "Dart", what: "Google's UI toolkit: one Dart codebase, pixel-identical on every phone.", strong: "Smooth custom UIs and strong tooling; popular in Indonesia.", weak: "Dart is used almost only for Flutter.", when: "Design-heavy apps with one team for both platforms.", ratings: r(4, 5, 4, 4, 4) },
  { id: "kotlin", name: "Kotlin", layer: "Mobile", icon: "kotlin", color: "#7f52ff", mine: true, lang: "Kotlin", what: "The language of native Android, with Jetpack Compose for UI.", strong: "Full access to Android and the best performance there.", weak: "Android only (unless you add Kotlin Multiplatform).", when: "Android-first apps and deep device features.", ratings: r(3, 5, 4, 5, 5) },
  { id: "swift", name: "Swift", layer: "Mobile", icon: "swift", color: "#f05138", mine: false, lang: "Swift", what: "Apple's language, with SwiftUI for iPhone, iPad and Mac apps.", strong: "The best iOS experience and newest Apple features first.", weak: "Apple platforms only; needs a Mac to build.", when: "iOS-first apps.", ratings: r(3, 5, 4, 5, 5) },
  { id: "capacitor", name: "Ionic / Capacitor", layer: "Mobile", icon: "capacitor", color: "#119eff", mine: false, lang: "TypeScript", npm: "@capacitor/core", what: "Wrap a web app as an installable mobile app with native plugins.", strong: "Reuse an existing web app almost as is.", weak: "Feels less native for heavy, animated UIs.", when: "Turning a working web app into store apps quickly.", ratings: r(5, 3, 4, 3, 3) },
  // Hosting & DevOps
  { id: "vercel", name: "Vercel", layer: "Hosting & DevOps", icon: "vercel", color: "#000000", mine: false, lang: "—", what: "Hosting for frontends and Next.js: push to Git, get a global URL.", strong: "Preview links for every change; zero server setup.", weak: "Costs climb with heavy traffic or long-running work.", when: "Next.js and static sites.", ratings: r(5, 5, 4, 3, 4) },
  { id: "netlify", name: "Netlify", layer: "Hosting & DevOps", icon: "netlify", color: "#00c7b7", mine: false, lang: "—", what: "Git-based hosting for static sites and serverless functions.", strong: "Simple deploys, forms and previews.", weak: "Less suited to server-heavy apps.", when: "Static sites and Jamstack projects.", ratings: r(5, 5, 3, 3, 3) },
  { id: "cloudrun", name: "Google Cloud Run", layer: "Hosting & DevOps", icon: "googlecloud", color: "#4285f4", mine: true, lang: "containers", what: "Run any container; it scales up with traffic and down to zero.", strong: "Any language, pay per use, sits next to BigQuery and Cloud SQL.", weak: "Cold starts; you write a Dockerfile.", when: "APIs and full-stack apps on Google Cloud.", ratings: r(4, 4, 4, 5, 5) },
  { id: "aws", name: "AWS", layer: "Hosting & DevOps", mono: "AWS", color: "#ff9900", mine: false, lang: "—", what: "The largest cloud: compute, databases, storage, everything else.", strong: "Every service imaginable, used by the biggest companies.", weak: "Complex consoles and bills.", when: "Large systems and teams already on AWS.", ratings: r(2, 4, 5, 5, 5) },
  { id: "cloudflare", name: "Cloudflare", layer: "Hosting & DevOps", icon: "cloudflare", color: "#f38020", mine: false, lang: "—", what: "A global network: CDN, DNS, security, and Workers that run code at the edge.", strong: "Fast everywhere, generous free tier, DDoS protection.", weak: "Edge runtimes limit some Node.js libraries.", when: "Put in front of almost any site; edge APIs.", ratings: r(4, 5, 4, 4, 5) },
  { id: "docker", name: "Docker", layer: "Hosting & DevOps", icon: "docker", color: "#2496ed", mine: true, lang: "Dockerfile", what: "Package an app and everything it needs into one container image.", strong: "Runs the same on a laptop, a server or any cloud.", weak: "Another tool to learn; images can get large.", when: "Shipping backends to the cloud.", ratings: r(3, 4, 5, 5, 5) },
  { id: "gha", name: "GitHub Actions", layer: "Hosting & DevOps", icon: "githubactions", color: "#2088ff", mine: false, lang: "YAML", what: "Automation on every push: tests, builds, deploys.", strong: "Built into GitHub; thousands of ready actions.", weak: "YAML pipelines get hard to debug.", when: "CI/CD for nearly any project.", ratings: r(4, 4, 5, 4, 4) },
  { id: "sentry", name: "Sentry", layer: "Hosting & DevOps", icon: "sentry", color: "#362d59", mine: false, lang: "—", what: "Error and performance monitoring for apps and servers.", strong: "See the exact line and user action behind a crash.", weak: "Event volume pricing; noisy without tuning.", when: "Any app with real users.", ratings: r(5, 4, 4, 4, 5) },
];

/* ------------------------------------------------------------------ same task, different tools */
export type Snippet = { tool: string; file: string; code: string };
export type Task = { id: string; title: string; ask: string; preview: "counter" | "json" | "phone"; snippets: Snippet[] };
export const TASKS: Task[] = [
  {
    id: "counter",
    title: "A button that counts clicks",
    ask: "The smallest interactive component: state, an event and a re-render.",
    preview: "counter",
    snippets: [
      {
        tool: "react",
        file: "Counter.jsx",
        code: `import { useState } from "react";

export default function Counter() {
  const [count, setCount] = useState(0);
  return (
    <button onClick={() => setCount(count + 1)}>
      Clicked {count} times
    </button>
  );
}`,
      },
      {
        tool: "vue",
        file: "Counter.vue",
        code: `<script setup>
import { ref } from "vue";
const count = ref(0);
</script>

<template>
  <button @click="count++">Clicked {{ count }} times</button>
</template>`,
      },
      {
        tool: "svelte",
        file: "Counter.svelte",
        code: `<script>
  let count = $state(0);
</script>

<button onclick={() => count++}>Clicked {count} times</button>`,
      },
      {
        tool: "angular",
        file: "counter.component.ts",
        code: `import { Component, signal } from "@angular/core";

@Component({
  selector: "app-counter",
  template: \`<button (click)="count.set(count() + 1)">
    Clicked {{ count() }} times
  </button>\`,
})
export class CounterComponent {
  count = signal(0);
}`,
      },
    ],
  },
  {
    id: "api",
    title: "An API endpoint: one store by id",
    ask: "Read an id from the URL, look it up, answer with JSON or a 404.",
    preview: "json",
    snippets: [
      {
        tool: "next",
        file: "app/api/stores/[id]/route.ts",
        code: `export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const store = await db.store.findUnique({ where: { id } });
  if (!store) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(store);
}`,
      },
      {
        tool: "express",
        file: "server.js",
        code: `import express from "express";
const app = express();

app.get("/api/stores/:id", async (req, res) => {
  const store = await db.findStore(req.params.id);
  if (!store) return res.status(404).json({ error: "Not found" });
  res.json(store);
});

app.listen(3000);`,
      },
      {
        tool: "fastapi",
        file: "main.py",
        code: `from fastapi import FastAPI, HTTPException

app = FastAPI()

@app.get("/api/stores/{store_id}")
async def get_store(store_id: int):
    store = await db.find_store(store_id)
    if store is None:
        raise HTTPException(status_code=404, detail="Not found")
    return store`,
      },
      {
        tool: "django",
        file: "views.py + urls.py",
        code: `from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from .models import Store

def store_detail(request, store_id):
    store = get_object_or_404(Store, pk=store_id)
    return JsonResponse({"id": store.id, "name": store.name})

# urls.py
path("api/stores/<int:store_id>", views.store_detail)`,
      },
      {
        tool: "laravel",
        file: "routes/api.php",
        code: `use App\\Models\\Store;

// a missing store answers 404 automatically
Route::get('/stores/{store}', function (Store $store) {
    return $store;
});`,
      },
      {
        tool: "go",
        file: "main.go",
        code: `http.HandleFunc("GET /api/stores/{id}", func(w http.ResponseWriter, r *http.Request) {
	store, err := db.FindStore(r.PathValue("id"))
	if err != nil {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	json.NewEncoder(w).Encode(store)
})
http.ListenAndServe(":3000", nil)`,
      },
    ],
  },
  {
    id: "screen",
    title: "A phone screen: a list of stores",
    ask: "A title and a scrolling list, the bread and butter of every app.",
    preview: "phone",
    snippets: [
      {
        tool: "rn",
        file: "Stores.tsx",
        code: `import { FlatList, Text, View } from "react-native";

export default function Stores({ stores }) {
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: "700" }}>Stores</Text>
      <FlatList
        data={stores}
        keyExtractor={(s) => s.id}
        renderItem={({ item }) => <Text>{item.name}</Text>}
      />
    </View>
  );
}`,
      },
      {
        tool: "flutter",
        file: "stores_screen.dart",
        code: `class StoresScreen extends StatelessWidget {
  const StoresScreen({super.key, required this.stores});
  final List<Store> stores;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Stores')),
      body: ListView.builder(
        itemCount: stores.length,
        itemBuilder: (context, i) => ListTile(title: Text(stores[i].name)),
      ),
    );
  }
}`,
      },
      {
        tool: "swift",
        file: "StoresView.swift",
        code: `struct StoresView: View {
    let stores: [Store]

    var body: some View {
        NavigationStack {
            List(stores) { store in
                Text(store.name)
            }
            .navigationTitle("Stores")
        }
    }
}`,
      },
      {
        tool: "kotlin",
        file: "StoresScreen.kt",
        code: `@Composable
fun StoresScreen(stores: List<Store>) {
    Column(Modifier.padding(16.dp)) {
        Text("Stores", style = MaterialTheme.typography.headlineMedium)
        LazyColumn {
            items(stores) { store -> Text(store.name) }
        }
    }
}`,
      },
    ],
  },
];

/* ------------------------------------------------------------------ stack builder */
export type Scenario = { id: string; label: string; need: string; picks: Partial<Record<Layer, { tool: string; why: string; alt: string[] }>> };
export const SCENARIOS: Scenario[] = [
  {
    id: "site",
    label: "Landing page or blog",
    need: "Mostly content, must be fast and found on Google, rarely changes.",
    picks: {
      "Meta-framework": { tool: "astro", why: "ships almost no JavaScript, so pages load instantly and rank well", alt: ["next"] },
      "Styling & UI": { tool: "tailwind", why: "a consistent look without writing a stylesheet from scratch", alt: ["sass"] },
      "Hosting & DevOps": { tool: "netlify", why: "static files on a CDN: nearly free and nothing to keep running", alt: ["vercel", "cloudflare"] },
    },
  },
  {
    id: "saas",
    label: "SaaS MVP",
    need: "Logins, teams, a dashboard, billing; ship in weeks, grow later.",
    picks: {
      "Meta-framework": { tool: "next", why: "pages and API in one TypeScript codebase, server-rendered where it matters", alt: ["nuxt", "sveltekit"] },
      "Styling & UI": { tool: "shadcn", why: "accessible dashboard components you can restyle freely", alt: ["mui", "tailwind"] },
      Data: { tool: "postgres", why: "relational data with tenants, plans and invoices fits SQL best", alt: ["supabase"] },
      "Auth & payments": { tool: "stripe", why: "subscriptions, invoices and a customer portal out of the box", alt: ["xendit", "midtrans"] },
      "Hosting & DevOps": { tool: "vercel", why: "preview links for every change and no servers to manage", alt: ["cloudrun"] },
    },
  },
  {
    id: "internal",
    label: "Internal portal or admin tool",
    need: "Forms, tables and reports for staff; company login; data from existing systems.",
    picks: {
      Frontend: { tool: "vue", why: "quick to build forms and tables, easy for the next developer to pick up", alt: ["react"] },
      "Styling & UI": { tool: "mui", why: "data grids and date pickers ready to use", alt: ["shadcn"] },
      Backend: { tool: "fastapi", why: "fast to write, and sits naturally next to data and reporting code", alt: ["laravel", "go"] },
      Data: { tool: "postgres", why: "one reliable database for staff data and audit logs", alt: ["mysql"] },
      "Hosting & DevOps": { tool: "docker", why: "the same container runs on the company server or the cloud", alt: ["cloudrun"] },
    },
  },
  {
    id: "mobile",
    label: "Mobile-first app",
    need: "Lives on phones: GPS, camera, push notifications, works with a bad signal.",
    picks: {
      Mobile: { tool: "expo", why: "one React codebase for iOS and Android, with over-the-air updates", alt: ["flutter", "kotlin"] },
      Data: { tool: "sqlite", why: "data saved on the phone first, synced when the signal returns", alt: ["firestore"] },
      Backend: { tool: "fastapi", why: "a small, typed API for sync and uploads", alt: ["express", "supabase"] },
      "Auth & payments": { tool: "clerk", why: "sign-in screens for mobile without building them", alt: ["authjs"] },
      "Hosting & DevOps": { tool: "cloudrun", why: "the API scales with app usage and to zero at night", alt: ["vercel"] },
    },
  },
  {
    id: "shop",
    label: "Online shop",
    need: "Product pages that load fast, a cart, local payment methods, stock.",
    picks: {
      "Meta-framework": { tool: "next", why: "fast product pages that search engines can read, plus a dynamic cart", alt: ["nuxt"] },
      Data: { tool: "postgres", why: "orders, stock and customers need transactions", alt: ["mysql"] },
      "Auth & payments": { tool: "xendit", why: "virtual accounts, e-wallets and QRIS that shoppers in Indonesia use", alt: ["midtrans", "stripe"] },
      "Hosting & DevOps": { tool: "cloudflare", why: "images and pages cached close to every shopper", alt: ["vercel"] },
    },
  },
  {
    id: "realtime",
    label: "Real-time chat or live board",
    need: "Many people see each other's changes instantly.",
    picks: {
      Frontend: { tool: "react", why: "efficient re-rendering as messages stream in", alt: ["svelte"] },
      Data: { tool: "firestore", why: "live listeners push every change to every open screen", alt: ["supabase", "redis"] },
      Backend: { tool: "go", why: "handles many open connections cheaply if you run your own", alt: ["express"] },
      "Hosting & DevOps": { tool: "cloudrun", why: "containers that keep WebSocket connections open", alt: ["cloudflare"] },
    },
  },
];
