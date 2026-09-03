# Drone MRO Tender Watch

A static dashboard tracking active Indian defence drone/UAV maintenance, AMC, and repair tenders sourced from GeM and CPPP.

**This is a keyword-matching aid, not an authoritative feed.** Verify every listing on the source portal (bidplus.gem.gov.in or eprocure.gov.in) before acting on it — see [`scripts/gem_drone_tender_scraper.py`](scripts/gem_drone_tender_scraper.py) for the specific limitations.

## What's in this repo

```
index.html                          the dashboard page
assets/style.css                    styling
assets/script.js                    loads data/tenders.json and renders the table
data/tenders.json                   the tender data the site reads (seeded with one example)
scripts/gem_drone_tender_scraper.py run this to refresh data/tenders.json
requirements.txt                    Python deps for the scraper
.github/workflows/update-tenders.yml   optional scheduled refresh via GitHub Actions
```

## Run it locally

Open `index.html` directly in a browser, or serve it so `fetch()` can load the JSON:

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
