"""
gem_drone_tender_scraper.py

Purpose
-------
Search public Indian government e-procurement portals for ACTIVE tenders
related to defence drone/UAV maintenance, AMC, repair, or overhaul, and
write results to data/tenders.json (consumed by index.html) and/or a CSV.

Important — read before running or scheduling
-----------------------------------------------
1. GeM (bidplus.gem.gov.in) and CPPP/eprocure.gov.in periodically change
   their page structure and add anti-automation measures (CAPTCHA, session
   tokens, rate limits). This script WILL need occasional maintenance —
   treat it as a starting point, not a fire-and-forget tool. If it starts
   returning zero results, open the portal in a browser, inspect the
   Network tab for the actual request the search form makes, and update
   the BASE_URL/params/selectors below to match.
2. Check each portal's current Terms of Use before running this on a
   schedule (e.g. via the included GitHub Action). Prefer the portal's own
   "saved search + email alert" feature as your primary channel — use this
   script as a supplementary sweep.
3. Respect robots.txt and keep request rates low (this script sleeps
   between requests by default). Do not parallelize aggressively.
4. This script only reads publicly listed tender notices. It does not log
   in, bid, or submit anything.
5. Hosted CI runners (like GitHub Actions) may get rate-limited or blocked
   by these portals more readily than a residential/office connection —
   if the scheduled Action starts failing, that's often why. Fall back to
   running it locally and committing the JSON manually.

Requirements
------------
pip install -r requirements.txt

Usage
-----
python scripts/gem_drone_tender_scraper.py --json-out data/tenders.json --csv-out active_drone_tenders.csv
"""

import argparse
import csv
import json
import sys
import time
from datetime import datetime, timezone

import requests
from bs4 import BeautifulSoup

KEYWORDS = [
    "drone", "uav", "unmanned aerial vehicle", "rpas",
    "remotely piloted aircraft",
]
MAINT_TERMS = [
    "maintenance", "amc", "cmc", "repair", "overhaul", "mro",
    "annual maintenance", "comprehensive maintenance", "health monitoring",
]

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                  "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
}

REQUEST_DELAY_SECONDS = 3  # be polite — do not lower this


def matches_drone_maintenance(text: str) -> bool:
    t = text.lower()
    has_drone_term = any(k in t for k in KEYWORDS)
    has_maint_term = any(k in t for k in MAINT_TERMS)
    return has_drone_term and has_maint_term


def search_gem_bidplus(session: requests.Session, keyword: str):
    """
    GeM's public bid search UI lives at https://bidplus.gem.gov.in/bidlists
    It is form-driven and may render results via JS in your browser, but
    the underlying search often works as a simple GET with query params.
    If this stops returning results, inspect the live page's Network tab
    and update BASE_URL/params/selectors to match the real request.
    """
    results = []
    BASE_URL = "https://bidplus.gem.gov.in/bidlists"
    params = {"searchTerm": keyword}
    try:
        resp = session.get(BASE_URL, params=params, headers=HEADERS, timeout=20)
        resp.raise_for_status()
    except requests.RequestException as e:
        print(f"[GeM] request failed for '{keyword}': {e}", file=sys.stderr)
        return results

    soup = BeautifulSoup(resp.text, "html.parser")
    candidates = soup.select("[class*='bid']") or soup.find_all(["div", "li"])
    for c in candidates:
        text = c.get_text(" ", strip=True)
        if text and matches_drone_maintenance(text):
            link_tag = c.find("a", href=True)
            link = link_tag["href"] if link_tag else BASE_URL
            results.append({
                "id": "",
                "title": text[:200],
                "authority": "",
                "location": "",
                "value": "",
                "emd": "",
                "closes": "",
                "status": "unknown",
                "link": link if link.startswith("http") else BASE_URL,
                "source": "GeM",
            })
    return results


def search_cppp(session: requests.Session, keyword: str):
    """
    CPPP / eprocure.gov.in tender search. Structure and endpoint change
    between portal versions — verify the current search URL in-browser
    (Network tab) before relying on this in production.
    """
    results = []
    BASE_URL = "https://eprocure.gov.in/cppp/latestactivetendersear"
    params = {"searchKeyword": keyword}
    try:
        resp = session.get(BASE_URL, params=params, headers=HEADERS, timeout=20)
        resp.raise_for_status()
    except requests.RequestException as e:
        print(f"[CPPP] request failed for '{keyword}': {e}", file=sys.stderr)
        return results

    soup = BeautifulSoup(resp.text, "html.parser")
    rows = soup.find_all("tr")
    for row in rows:
        text = row.get_text(" ", strip=True)
        if text and matches_drone_maintenance(text):
            link_tag = row.find("a", href=True)
            link = link_tag["href"] if link_tag else BASE_URL
            results.append({
                "id": "",
                "title": text[:200],
                "authority": "",
                "location": "",
                "value": "",
                "emd": "",
                "closes": "",
                "status": "unknown",
                "link": link if link.startswith("http") else BASE_URL,
                "source": "CPPP",
            })
    return results


def dedupe(results):
    seen = set()
    out = []
    for r in results:
        key = (r["source"], r["title"])
        if key not in seen:
            seen.add(key)
            out.append(r)
    return out


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--json-out", default="data/tenders.json",
                         help="Path to write the site's tenders.json")
    parser.add_argument("--csv-out", default=None,
                         help="Optional path to also write a CSV")
    args = parser.parse_args()

    session = requests.Session()
    all_results = []

    for kw in ["drone maintenance", "UAV maintenance", "drone AMC",
               "UAV repair overhaul", "RPAS maintenance"]:
        print(f"Searching GeM for: {kw}")
        all_results.extend(search_gem_bidplus(session, kw))
        time.sleep(REQUEST_DELAY_SECONDS)

        print(f"Searching CPPP for: {kw}")
        all_results.extend(search_cppp(session, kw))
        time.sleep(REQUEST_DELAY_SECONDS)

    deduped = dedupe(all_results)

    payload = {
        "last_updated": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source_note": "Auto-generated by gem_drone_tender_scraper.py. Fields left blank could not be "
                        "reliably parsed from the portal's current markup — verify every entry on the "
                        "source portal before acting on it.",
        "tenders": deduped,
    }

    with open(args.json_out, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)
    print(f"\nWrote {len(deduped)} candidate matches to {args.json_out}")

    if args.csv_out:
        with open(args.csv_out, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=list(deduped[0].keys()) if deduped else
                                     ["id", "title", "authority", "location", "value", "emd", "closes", "status", "link", "source"])
            writer.writeheader()
            writer.writerows(deduped)
        print(f"Also wrote CSV to {args.csv_out}")

    print("Review each manually before relying on it — keyword matching over-includes and under-includes.")


if __name__ == "__main__":
    main()
