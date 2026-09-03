# Drone MRO Business Model & Tender Watch

A static multi-page site covering the full "Drone MRO Business Model" workbook — assumptions, CapEx/OpEx, business-model comparison, breakeven sensitivity, skill matrix, training sources — plus a live-refreshing tracker for Indian defence drone/UAV maintenance tenders (GeM/CPPP).

**The tender pages are a keyword-matching aid, not an authoritative feed.** Verify every listing on the source portal (bidplus.gem.gov.in or eprocure.gov.in) before acting on it — see [`scripts/gem_drone_tender_scraper.py`](scripts/gem_drone_tender_scraper.py) for the specific limitations.

## Pages

| Page | Content |
|---|---|
| `index.html` | Home — overview and links to every section |
| `assumptions.html` | Every planning input (scale, facility, workforce, certification) |
| `capex.html` | One-time standing cost to launch |
| `opex.html` | Annual operating cost, Year 1 |
| `business-models.html` | Full in-house vs. asset-light vs. platform-led hybrid |
| `breakeven.html` | Required price/drone at different utilization levels |
| `skill-matrix.html` | 13 components mapped to in-house coverage — and the 4 gaps |
| `training-sources.html` | Open/self-learning resources per component |
| `tender-tracker.html` | Static workbook snapshot of tracked tenders |
| `tenders.html` | Live, auto-refreshing tender dashboard |

All pages are generated from the workbook's actual computed values (not re-derived), so the numbers match the `.xlsx` exactly as of the last regeneration. If you update the workbook, re-run the export and regenerate — this repo doesn't read the `.xlsx` live.

## What's in this repo

```
index.html, assumptions.html, capex.html, opex.html,
business-models.html, breakeven.html, skill-matrix.html,
training-sources.html, tender-tracker.html, tenders.html   the 10 pages
assets/style.css                    shared styling (dark ops-board theme)
assets/script.js                    loads data/tenders.json and renders the live table
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
