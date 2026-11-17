# CV templates

The site's "Download CV" button opens a picker (`src/components/cv-picker.tsx`) with one PDF per country format.

| File | Format |
|---|---|
| `cv.html` | International (the main, hand-tuned CV, 2 pages A4) |
| `data.mjs` | The content for every other template: English (UK spelling) and Bahasa Indonesia |
| `build.mjs` | Builds Australia, United Kingdom, United States (1 page, Letter, US spelling), Europe (Europass style) and Indonesia, then prints all six to PDF |

Change the content in `data.mjs` (and `cv.html` for the international one), then from the project folder:

```
node docs/cv/build.mjs
```

It writes `public/cv/cv-baldanullah-<format>.pdf`, copies the international one to `public/cv-baldanullah.pdf`, and prints the page count of each, so you can see when a template outgrows its page limit (US = 1 page, UK and Indonesia = 2). Uses the installed Chrome (set `CHROME=...` if it lives elsewhere) and the Geist font in `fonts/`. Redeploy the site afterwards (docs/deploy-plan.md).

Formats left out on purpose: German Lebenslauf, Japanese rirekisho and Gulf CVs usually expect a photo, date of birth and nationality, which aren't in the CV.
