# Drone MRO Business Model & Tender Watch

A static multi-page site covering the full "Drone MRO Business Model" workbook — **Assumptions is now a live, editable simulation**: change any input and CapEx, OpEx, Business Models, Breakeven, and Skill Matrix all recalculate in the browser, no server or rebuild required. Also included: a live-refreshing tracker for Indian defence drone/UAV maintenance tenders (GeM/CPPP).

**The tender pages are a keyword-matching aid, not an authoritative feed.** Verify every listing on the source portal (bidplus.gem.gov.in or eprocure.gov.in) before acting on it — see [`scripts/gem_drone_tender_scraper.py`](scripts/gem_drone_tender_scraper.py) for the specific limitations.

## Pages

| Page | Content |
|---|---|
| `index.html` | Home — overview and links to every section |
| `assumptions.html` | **Editable.** Every planning input (scale, facility, workforce, certification) — change values here |
| `capex.html` | **Live.** One-time standing cost to launch, recalculated from Assumptions |
| `opex.html` | **Live.** Annual operating cost, Year 1 |
| `business-models.html` | **Live + editable.** Full in-house vs. asset-light vs. platform-led hybrid — edit the multipliers/price/SaaS revenue directly on the page |
| `breakeven.html` | **Live.** Required price/drone at different utilization levels |
| `skill-matrix.html` | **Live.** 13 components mapped to in-house coverage — status flips as you change headcount |
| `training-sources.html` | Open/self-learning resources per component (static) |
| `tender-tracker.html` | Static workbook snapshot of tracked tenders |
| `tenders.html` | Live, auto-refreshing tender dashboard (separate data source — GeM/CPPP scraper) |

## How the simulation works

`assets/model.js` holds every formula from the workbook (CapEx, OpEx, the three business models, breakeven sensitivity, skill-matrix coverage) as plain JS functions, plus default values matching the original workbook. `assets/render.js` reads the current assumptions, computes each page's numbers, and writes them into the page — dispatched by a `data-page` attribute on `<body>`.

Inputs on `assumptions.html` (`data-key="..."`) and `business-models.html` (`data-bmkey="..."`) save to the browser's `localStorage` on every change (`droneMroAssumptions.v1` and `droneMroBizModel.v1`). Every other page reads that same storage on load. This means:
- Changes persist across page navigation and browser restarts, **on the same browser/device only**.
- A different browser, device, or visitor sees the original workbook defaults — nothing is synced or shared.
- "Reset to workbook defaults" on the Assumptions page clears your stored values.

If you want the simulation numbers to update the static export too (e.g. after settling on a scenario), there's no automatic sync — read the values back out of the browser and edit the `.xlsx` workbook by hand, or treat the web version as the live source of truth going forward.

## What's in this repo

```
index.html, assumptions.html, capex.html, opex.html,
business-models.html, breakeven.html, skill-matrix.html,
training-sources.html, tender-tracker.html, tenders.html   the 10 pages
assets/style.css                    shared styling (Field Dossier theme, sidebar nav)
assets/model.js                     all workbook formulas + defaults + localStorage helpers
assets/render.js                    reads assumptions, computes, renders each page
assets/script.js                    loads data/tenders.json and renders the live tender table
data/tenders.json                   the tender data tenders.html reads (seeded with one example)
scripts/gem_drone_tender_scraper.py run this to refresh data/tenders.json
requirements.txt                    Python deps for the scraper
.github/workflows/update-tenders.yml   optional scheduled refresh via GitHub Actions
```

## Run it locally

Open `index.html` directly in a browser and click through the nav bar, or serve it so `tenders.html`'s `fetch()` can load the JSON:

```bash
python -m http.server 8000
# then visit http://localhost:8000
```

## Refresh the tender data

```bash
pip install -r requirements.txt
python scripts/gem_drone_tender_scraper.py --json-out data/tenders.json
```

Read the docstring at the top of that script before scheduling it — GeM and CPPP change their page structure periodically, and their terms of use should be checked before running this on any recurring schedule.

## Publish on GitHub Pages

1. Create a new GitHub repository and push this folder to it:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo>.git
   git push -u origin main
   ```
2. In the repo, go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to `Deploy from a branch`, branch `main`, folder `/ (root)`.
4. Save. GitHub will publish the site at `https://<your-username>.github.io/<your-repo>/` within a minute or two.

## Optional: scheduled auto-refresh

The included workflow (`.github/workflows/update-tenders.yml`) runs the scraper daily and commits any changes to `data/tenders.json`, which the live Pages site will then reflect. It's set to continue (not fail the whole workflow) if the scrape comes back empty — portal anti-automation measures make intermittent failures normal. Treat it as a supplementary sweep; GeM's and CPPP's own saved-search + email alerts remain the more reliable primary channel.

## License / disclaimer

Not affiliated with GeM, CPPP, or the Ministry of Defence. Provided as-is for personal tender-tracking convenience.
