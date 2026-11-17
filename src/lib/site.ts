/**
 * The site's public address, for metadata, the sitemap and share images. Set NEXT_PUBLIC_SITE_URL once a domain is
 * chosen; on Vercel the production URL is used automatically until then; locally it's localhost.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000")).replace(/\/$/, "");

export const SITE_TITLE = "Baldanullah — Full Stack Data Scientist";
export const SITE_DESCRIPTION =
  "N.I.S. Baldanullah builds data products end to end: machine learning, dashboards, data pipelines, SaaS and mobile apps, automation and AI agents. With live demos you can try, from Makassar and Jakarta, Indonesia.";
