# Price Monitor — Unified Storage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `site_results` the single source of truth for all market-price consumers (admin card, product list indicator, notification bell) and cut per-row network cost in the admin product list via a bulk endpoint.

**Architecture:** On the parser side, drop the `offers` table and route the nightly runner through the same v3 path used by the manual "Обновить" button (`get_site_result` → `upsert_site_result`). Rewrite the `/offers` and `/notifications` endpoints to aggregate from `site_results` while keeping their response shapes identical, so frontend code keeps working. Add a new `/bulk` endpoint for batch market summaries. On the admin side, add a `/api/price-monitor/bulk` proxy and use it from `ProductList` instead of one fetch per row.

**Tech Stack:**
- Parser (remote VPS `root@5.42.103.41:/opt/price-monitor`): Python 3.12, FastAPI, httpx, SQLite
- Frontend (this repo): Next.js 15 App Router, TypeScript, React 19

**Deploy paths:**
- Parser: edit files under `/opt/price-monitor/` via scp from local working copy at `/Users/vladislavufimcev/Documents/price-monitor/`, then `systemctl restart price-monitor` and `cd /opt/price-monitor && venv/bin/python runner.py`
- Frontend: merge to `main` → `bash scripts/deploy-vps.sh`

---

## File Structure

**Parser (`/Users/vladislavufimcev/Documents/price-monitor/`)**

| File | Responsibility | Action |
|---|---|---|
| `db.py` | SQLite access: existing helpers + new `aggregate_from_site_results` | Modify |
| `api.py` | FastAPI routes: rewrite `/offers`, add `/bulk`, notifications stay file-based | Modify |
| `runner.py` | Nightly job: uses v3 scraper path + writes notifications from aggregation | Modify |
| `tests/test_aggregation.py` | Unit tests for aggregation helper | Create |

**Frontend (`/Users/vladislavufimcev/Documents/autoparts-shop/.claude/worktrees/heuristic-galileo-8fff2c/`)**

| File | Responsibility | Action |
|---|---|---|
| `src/app/api/price-monitor/bulk/route.ts` | Proxy POST → parser `/bulk` | Create |
| `src/app/lib/price-monitor.ts` | Add `fetchMarketDataBulk` helper | Modify |
| `src/app/admin/components/ProductList.tsx` | Fetch market data once per page, pass into `MarketCell` | Modify |

**No changes to:**
- `MarketPriceWidget.tsx` (already reads from `/site-results`)
- `PriceAlertBell.tsx` (reads `/notifications`, response shape unchanged)
- `scrapers/*.py`, `models.py`, `config.py`

---

## Ground Rules

- Test on parser side with pytest — parser already uses SQLite `:memory:` via `DB_PATH` env var.
- Run everything in the activated venv: `cd /opt/price-monitor && source venv/bin/activate` on the server, or `/Users/vladislavufimcev/Documents/price-monitor/venv/bin/python` locally.
- Commit after each task. Use the price-monitor repo (`/Users/vladislavufimcev/Documents/price-monitor/`) for parser commits, this worktree for frontend commits.
- Keep response JSON shapes of `/offers` and `/notifications` byte-for-byte compatible with what the frontend already consumes (see `src/app/lib/price-monitor.ts` `MarketSummary` and `Notifications` types).

---

## Task 1: Backup and drop the `offers` table

**Files:**
- Modify: `/Users/vladislavufimcev/Documents/price-monitor/db.py`

- [ ] **Step 1: SSH to parser server and create SQL dump of `offers` table**

Run:
```bash
ssh root@5.42.103.41 "cd /opt/price-monitor && venv/bin/python -c 'import sqlite3; conn = sqlite3.connect(\"prices.db\"); rows = conn.execute(\"SELECT * FROM offers\").fetchall(); import json; open(\"offers_backup_20260417.json\", \"w\").write(json.dumps([list(r) for r in rows]))'"
ssh root@5.42.103.41 "ls -la /opt/price-monitor/offers_backup_20260417.json"
```

Expected: file exists with non-zero size.

- [ ] **Step 2: Remove `offers` table definition and its helpers from `db.py`**

Open `/Users/vladislavufimcev/Documents/price-monitor/db.py` and replace the `init_db()` body by deleting the `CREATE TABLE IF NOT EXISTS offers` block and the `CREATE INDEX idx_offers_lookup` block. Keep `sources`, `brand_aliases`, `site_results` blocks unchanged.

Delete these functions entirely:
- `clear_offers()`
- `clear_offers_for(article, brand)`
- `insert_offers(offers)`
- `get_offers(article, brand)`
- `get_offers_summary(article, brand)`

- [ ] **Step 3: Commit parser change**

```bash
cd /Users/vladislavufimcev/Documents/price-monitor
git add db.py
git commit -m "chore: remove offers table — site_results is single source of truth"
```

---

## Task 2: Add aggregation helper that builds `MarketSummary` from `site_results`

**Files:**
- Modify: `/Users/vladislavufimcev/Documents/price-monitor/db.py`
- Create: `/Users/vladislavufimcev/Documents/price-monitor/tests/test_aggregation.py`

- [ ] **Step 1: Write failing test for `aggregate_from_site_results`**

Create `/Users/vladislavufimcev/Documents/price-monitor/tests/test_aggregation.py`:

```python
import json
import os
os.environ["DB_PATH"] = ":memory:"

from db import init_db, upsert_site_result, aggregate_from_site_results, _close_shared


def setup_function(_):
    _close_shared()
    init_db()


def _offers(*prices):
    return json.dumps([
        {"article": "A1", "brand": "B1", "site": "s", "price": p,
         "delivery_days": 1, "in_stock": True, "seller_name": None}
        for p in prices
    ], ensure_ascii=False)


def test_returns_none_when_no_rows():
    assert aggregate_from_site_results("A1", "B1") is None


def test_aggregates_prices_across_sites():
    upsert_site_result("A1", "B1", "exist.ru", "OFFERS", _offers(100, 150), None, None, None, 200)
    upsert_site_result("A1", "B1", "emex.ru", "OFFERS", _offers(120), None, None, None, 100)

    summary = aggregate_from_site_results("A1", "B1")

    assert summary["article"] == "A1"
    assert summary["brand"] == "B1"
    assert summary["min_price"] == 100
    assert summary["max_price"] == 150
    assert summary["median_price"] == 120
    assert summary["sites_count"] == 2
    assert summary["offers_count"] == 3


def test_ignores_non_offers_statuses():
    upsert_site_result("A1", "B1", "exist.ru", "OFFERS", _offers(100), None, None, None, 200)
    upsert_site_result("A1", "B1", "emex.ru", "NOT_FOUND", None, None, None, None, 100)
    upsert_site_result("A1", "B1", "vdopel.ru", "ERROR", None, None, "timeout", "x", 5000)

    summary = aggregate_from_site_results("A1", "B1")
    assert summary["sites_count"] == 1
    assert summary["offers_count"] == 1
    assert summary["min_price"] == 100


def test_returns_scraped_at_of_most_recent_row():
    upsert_site_result("A1", "B1", "exist.ru", "OFFERS", _offers(100), None, None, None, 200)
    upsert_site_result("A1", "B1", "emex.ru", "OFFERS", _offers(120), None, None, None, 100)

    summary = aggregate_from_site_results("A1", "B1")
    assert "scraped_at" in summary and summary["scraped_at"]
```

- [ ] **Step 2: Run test to confirm failure**

```bash
cd /Users/vladislavufimcev/Documents/price-monitor
venv/bin/python -m pytest tests/test_aggregation.py -v
```

Expected: fails with `ImportError: cannot import name 'aggregate_from_site_results' from 'db'`.

- [ ] **Step 3: Implement `aggregate_from_site_results` in `db.py`**

Add at the end of `/Users/vladislavufimcev/Documents/price-monitor/db.py`:

```python
import json as _json


def aggregate_from_site_results(article: str, brand: str) -> dict | None:
    """Build a MarketSummary-compatible dict from site_results rows.

    Shape matches the old get_offers_summary output so existing /offers
    consumers keep working without changes.
    """
    rows = _conn().execute(
        "SELECT site, offers_json, scraped_at FROM site_results "
        "WHERE article=? AND brand=? AND status='OFFERS' AND offers_json IS NOT NULL",
        (article, brand),
    ).fetchall()
    if not rows:
        return None

    all_offers: list[dict] = []
    sites: set[str] = set()
    latest_scraped: str | None = None
    for r in rows:
        try:
            parsed = _json.loads(r["offers_json"])
        except (ValueError, TypeError):
            continue
        if not parsed:
            continue
        sites.add(r["site"])
        all_offers.extend(parsed)
        if latest_scraped is None or r["scraped_at"] > latest_scraped:
            latest_scraped = r["scraped_at"]

    if not all_offers:
        return None

    prices = [float(o["price"]) for o in all_offers if isinstance(o.get("price"), (int, float))]
    if not prices:
        return None

    return {
        "article": article,
        "brand": brand,
        "min_price": min(prices),
        "max_price": max(prices),
        "median_price": sorted(prices)[len(prices) // 2],
        "sites_count": len(sites),
        "offers_count": len(all_offers),
        "offers": [
            {
                "site": o.get("site"),
                "price": o.get("price"),
                "delivery_days": o.get("delivery_days"),
                "in_stock": o.get("in_stock"),
                "seller_name": o.get("seller_name"),
                "scraped_at": latest_scraped,
            }
            for o in all_offers
        ],
        "scraped_at": latest_scraped,
    }
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd /Users/vladislavufimcev/Documents/price-monitor
venv/bin/python -m pytest tests/test_aggregation.py -v
```

Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
cd /Users/vladislavufimcev/Documents/price-monitor
git add db.py tests/test_aggregation.py
git commit -m "feat: aggregate_from_site_results — single-source market summary"
```

---

## Task 3: Rewrite `/offers` endpoint to read from aggregated site_results

**Files:**
- Modify: `/Users/vladislavufimcev/Documents/price-monitor/api.py`

- [ ] **Step 1: Replace `/offers` endpoint in `api.py`**

Find in `/Users/vladislavufimcev/Documents/price-monitor/api.py`:

```python
@app.get("/offers")
def get_offers_endpoint(
    article: str = Query(...),
    brand: str = Query(...),
    x_api_token: str = Header(default=None),
):
    check_token(x_api_token)
    summary = get_offers_summary(article, brand)
    if not summary:
        return {"article": article, "brand": brand, "offers": [], "sites_count": 0}
    return summary
```

Replace with:

```python
@app.get("/offers")
def get_offers_endpoint(
    article: str = Query(...),
    brand: str = Query(...),
    x_api_token: str = Header(default=None),
):
    check_token(x_api_token)
    summary = aggregate_from_site_results(article, brand)
    if not summary:
        return {"article": article, "brand": brand, "offers": [], "sites_count": 0}
    return summary
```

Also update the import at the top of `api.py`. Find the line:

```python
from db import (
    init_db, get_offers_summary, update_source_status,
```

and replace `get_offers_summary` with `aggregate_from_site_results`. Full list of names is whatever else is already imported — keep them all, just swap this one.

- [ ] **Step 2: Smoke-test locally with uvicorn**

```bash
cd /Users/vladislavufimcev/Documents/price-monitor
DB_PATH=":memory:" venv/bin/python -c "
from db import init_db, upsert_site_result, aggregate_from_site_results
import json
init_db()
offers = json.dumps([{'article':'X','brand':'Y','site':'exist.ru','price':500,'delivery_days':2,'in_stock':True,'seller_name':None}])
upsert_site_result('X','Y','exist.ru','OFFERS', offers, None, None, None, 100)
print(aggregate_from_site_results('X','Y'))
"
```

Expected: prints dict with `min_price: 500`, `sites_count: 1`.

- [ ] **Step 3: Commit**

```bash
cd /Users/vladislavufimcev/Documents/price-monitor
git add api.py
git commit -m "refactor(api): /offers reads from site_results via aggregation"
```

---

## Task 4: Add `/bulk` endpoint for batch market summaries

**Files:**
- Modify: `/Users/vladislavufimcev/Documents/price-monitor/api.py`
- Modify: `/Users/vladislavufimcev/Documents/price-monitor/tests/test_aggregation.py`

- [ ] **Step 1: Write failing test for bulk endpoint**

Append to `/Users/vladislavufimcev/Documents/price-monitor/tests/test_aggregation.py`:

```python
from fastapi.testclient import TestClient


def test_bulk_endpoint_returns_summary_per_pair():
    from api import app
    client = TestClient(app)

    upsert_site_result("A1", "B1", "exist.ru", "OFFERS", _offers(100, 200), None, None, None, 100)
    upsert_site_result("A2", "B2", "emex.ru", "OFFERS", _offers(50), None, None, None, 100)

    resp = client.post(
        "/bulk",
        json={"items": [{"article": "A1", "brand": "B1"}, {"article": "A2", "brand": "B2"}, {"article": "ZZZ", "brand": "NOP"}]},
        headers={"X-API-Token": "test-token"},
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert "results" in data
    results = {(r["article"], r["brand"]): r for r in data["results"]}
    assert results[("A1", "B1")]["min_price"] == 100
    assert results[("A2", "B2")]["sites_count"] == 1
    assert results[("ZZZ", "NOP")]["sites_count"] == 0  # not-found entries still returned as empty
```

Before running, set up the test env:

```bash
cd /Users/vladislavufimcev/Documents/price-monitor
venv/bin/pip install fastapi pytest httpx 2>&1 | tail -1
```

Also make sure `api.py` uses `API_TOKEN = os.getenv("API_TOKEN", "test-token")` or that the test sets it. Check first:

```bash
grep -n 'API_TOKEN\|check_token' config.py api.py | head -5
```

If `API_TOKEN` has no default, export it before the test run: `export API_TOKEN=test-token`.

- [ ] **Step 2: Run test to confirm failure**

```bash
cd /Users/vladislavufimcev/Documents/price-monitor
API_TOKEN=test-token DB_PATH=":memory:" venv/bin/python -m pytest tests/test_aggregation.py::test_bulk_endpoint_returns_summary_per_pair -v
```

Expected: 404 or similar (endpoint doesn't exist yet).

- [ ] **Step 3: Implement `/bulk` endpoint**

Add in `/Users/vladislavufimcev/Documents/price-monitor/api.py` right after the `/offers` endpoint:

```python
from pydantic import BaseModel


class BulkItem(BaseModel):
    article: str
    brand: str


class BulkRequest(BaseModel):
    items: list[BulkItem]


@app.post("/bulk")
def bulk_market_summary(
    body: BulkRequest,
    x_api_token: str = Header(default=None),
):
    check_token(x_api_token)
    results = []
    for item in body.items:
        summary = aggregate_from_site_results(item.article, item.brand)
        if summary:
            results.append({
                "article": item.article,
                "brand": item.brand,
                "min_price": summary["min_price"],
                "max_price": summary["max_price"],
                "median_price": summary["median_price"],
                "sites_count": summary["sites_count"],
                "offers_count": summary["offers_count"],
                "scraped_at": summary["scraped_at"],
            })
        else:
            results.append({
                "article": item.article,
                "brand": item.brand,
                "min_price": None,
                "max_price": None,
                "median_price": None,
                "sites_count": 0,
                "offers_count": 0,
                "scraped_at": None,
            })
    return {"results": results}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
cd /Users/vladislavufimcev/Documents/price-monitor
API_TOKEN=test-token DB_PATH=":memory:" venv/bin/python -m pytest tests/test_aggregation.py -v
```

Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
cd /Users/vladislavufimcev/Documents/price-monitor
git add api.py tests/test_aggregation.py
git commit -m "feat(api): /bulk endpoint for batch market summaries"
```

---

## Task 5: Rewrite nightly `runner.py` to use v3 scraper path

**Files:**
- Modify: `/Users/vladislavufimcev/Documents/price-monitor/runner.py`

- [ ] **Step 1: Replace `runner.py` with v3-based version**

Overwrite `/Users/vladislavufimcev/Documents/price-monitor/runner.py` with:

```python
import asyncio
import json
import logging
from dataclasses import asdict
from datetime import datetime, timezone
from pathlib import Path

from config import DELAY_MIN, DELAY_MAX, WORKERS
from db import (
    init_db,
    upsert_site_result,
    aggregate_from_site_results,
    update_source_status,
    get_aliases,
)
from scrapers.exist import ExistScraper
from scrapers.emex import EmexScraper
from scrapers.vdopel import VdopelScraper
from scrapers.partkom import PartKomScraper
from scrapers.plentycar import PlentycarScraper

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    handlers=[logging.FileHandler("runner.log"), logging.StreamHandler()],
)
log = logging.getLogger(__name__)

SCRAPERS = [ExistScraper, EmexScraper, VdopelScraper, PartKomScraper, PlentycarScraper]


def load_articles(path: str = "articles.txt") -> list[tuple[str, str, float | None]]:
    articles = []
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line or "|" not in line:
                continue
            parts = line.split("|")
            article = parts[0].strip()
            brand = parts[1].strip()
            price = float(parts[2].strip()) if len(parts) > 2 else None
            articles.append((article, brand, price))
    return articles


def _build_aliases_cache() -> dict:
    cache: dict[str, set[str]] = {}
    for row in get_aliases():
        cache.setdefault(row["canonical"].lower(), set()).add(row["alias"].lower())
    return {k: list(v) for k, v in cache.items()}


async def scrape_pair(article: str, brand: str, aliases_cache: dict, semaphore: asyncio.Semaphore):
    async with semaphore:
        scrapers = [Cls(delay_min=DELAY_MIN, delay_max=DELAY_MAX) for Cls in SCRAPERS]
        try:
            results = await asyncio.gather(
                *[s.get_site_result(article, brand, db_aliases=aliases_cache) for s in scrapers],
                return_exceptions=True,
            )
            for scraper, result in zip(scrapers, results):
                if isinstance(result, Exception):
                    log.warning(f"ERROR {article} {brand} @ {scraper.SITE_NAME}: {result}")
                    update_source_status(scraper.SITE_NAME, success=False, error=str(result))
                    continue
                upsert_site_result(
                    article=article,
                    brand=brand,
                    site=result.site,
                    status=result.status,
                    offers_json=json.dumps(
                        [asdict(o) for o in result.offers], ensure_ascii=False
                    ) if result.offers else None,
                    found_brands_json=json.dumps(result.found_brands, ensure_ascii=False)
                    if result.found_brands is not None else None,
                    error_category=result.error_category,
                    error_text=result.error_text,
                    duration_ms=result.duration_ms,
                )
                auth_status = getattr(type(scraper), "auth_status", lambda: None)()
                if result.status in ("OFFERS", "OUT_OF_STOCK", "NOT_FOUND"):
                    update_source_status(scraper.SITE_NAME, success=True, auth_status=auth_status)
                else:
                    update_source_status(scraper.SITE_NAME, success=False, error=result.error_text or result.status)
                log.info(f"{result.status} {article} {brand} @ {scraper.SITE_NAME}: {len(result.offers)} offers")
        finally:
            for s in scrapers:
                await s.close()


def write_notifications(articles: list[tuple[str, str, float | None]]):
    red_items, yellow_items, green_count = [], [], 0
    for article, brand, your_price in articles:
        if your_price is None:
            continue
        summary = aggregate_from_site_results(article, brand)
        if not summary:
            continue
        median = summary["median_price"]
        ratio = your_price / median if median else 0
        deviation = round((ratio - 1) * 100)
        item = {
            "article": article,
            "brand": brand,
            "your_price": your_price,
            "min_price": summary["min_price"],
            "median_price": median,
            "max_price": summary["max_price"],
            "deviation_pct": deviation,
            "sites_count": summary["sites_count"],
        }
        if your_price > summary["max_price"]:
            red_items.append(item)
        elif your_price < summary["min_price"]:
            yellow_items.append(item)
        else:
            green_count += 1

    red_items.sort(key=lambda x: x["deviation_pct"], reverse=True)
    yellow_items.sort(key=lambda x: x["deviation_pct"])

    data = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "total_parsed": len(articles),
        "red_count": len(red_items),
        "yellow_count": len(yellow_items),
        "green_count": green_count,
        "red_items": red_items,
        "yellow_items": yellow_items,
    }
    Path("notifications.json").write_text(
        json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    log.info(f"Notifications: {len(red_items)} red, {len(yellow_items)} yellow, {green_count} green")


async def run_all():
    init_db()
    articles = load_articles()
    aliases_cache = _build_aliases_cache()
    log.info(f"Starting nightly run: {len(articles)} articles, {WORKERS} workers")
    started = datetime.now()
    semaphore = asyncio.Semaphore(WORKERS)
    tasks = [scrape_pair(art, brand, aliases_cache, semaphore) for art, brand, _ in articles]
    await asyncio.gather(*tasks)
    write_notifications(articles)
    elapsed = (datetime.now() - started).seconds
    log.info(f"Done in {elapsed}s")


if __name__ == "__main__":
    asyncio.run(run_all())
```

- [ ] **Step 2: Dry-run locally with 1 article**

```bash
cd /Users/vladislavufimcev/Documents/price-monitor
head -1 articles.txt > /tmp/one.txt
DB_PATH=/tmp/test_prices.db venv/bin/python -c "
import asyncio, runner
runner.load_articles = lambda path='/tmp/one.txt': [t for t in runner.load_articles.__wrapped__('/tmp/one.txt')] if False else [('test','test',None)]
"
```

If the shim above is clumsy, instead edit `articles.txt` temporarily down to 1 line, run `DB_PATH=/tmp/test_prices.db venv/bin/python runner.py`, then restore. Expected: `runner.log` shows 5 scraper results written to `site_results` for that article, no tracebacks.

- [ ] **Step 3: Commit**

```bash
cd /Users/vladislavufimcev/Documents/price-monitor
git add runner.py
git commit -m "refactor(runner): use v3 scraper path, write site_results + notifications"
```

---

## Task 6: Deploy parser changes and run manually

**Files:** no code changes, deploy only.

- [ ] **Step 1: Copy changed parser files to VPS**

```bash
cd /Users/vladislavufimcev/Documents/price-monitor
scp db.py api.py runner.py root@5.42.103.41:/opt/price-monitor/
```

- [ ] **Step 2: Restart FastAPI service**

```bash
ssh root@5.42.103.41 "systemctl restart price-monitor && systemctl status price-monitor --no-pager | head -5"
```

Expected: status `active (running)`.

- [ ] **Step 3: Drop old `offers` table on VPS**

```bash
ssh root@5.42.103.41 "cd /opt/price-monitor && venv/bin/python -c 'import sqlite3; c = sqlite3.connect(\"prices.db\"); c.execute(\"DROP TABLE IF EXISTS offers\"); c.execute(\"DROP INDEX IF EXISTS idx_offers_lookup\"); c.commit()'"
ssh root@5.42.103.41 "cd /opt/price-monitor && venv/bin/python -c 'import sqlite3; print(sqlite3.connect(\"prices.db\").execute(\"SELECT name FROM sqlite_master WHERE type=chr(39)+\\\"table\\\"+chr(39)\").fetchall())'"
```

Expected: output lists `sources`, `site_results`, `brand_aliases` but NOT `offers`.

- [ ] **Step 4: Run `runner.py` manually**

```bash
ssh root@5.42.103.41 "cd /opt/price-monitor && venv/bin/python runner.py 2>&1 | tail -20"
```

Expected: ends with `Done in Ns`. Takes 10–15 minutes depending on article count; use `run_in_background: true` if needed.

- [ ] **Step 5: Spot-check `/offers` and `/site-results` return consistent data**

```bash
TOKEN=$(ssh root@5.42.103.41 "grep API_TOKEN /opt/price-monitor/.env | cut -d= -f2")
ARTICLE=$(ssh root@5.42.103.41 "head -1 /opt/price-monitor/articles.txt | cut -d'|' -f1")
BRAND=$(ssh root@5.42.103.41 "head -1 /opt/price-monitor/articles.txt | cut -d'|' -f2 | tr -d ' '")
curl -s -H "X-API-Token: $TOKEN" "http://5.42.103.41:8000/offers?article=$ARTICLE&brand=$BRAND" | head -c 300
echo
curl -s -H "X-API-Token: $TOKEN" "http://5.42.103.41:8000/site-results?article=$ARTICLE&brand=$BRAND" | head -c 300
```

Expected: both return data for the same pair; `sites_count` from `/offers` equals number of `OFFERS`-status sites in `/site-results`.

---

## Task 7: Frontend bulk proxy route

**Files:**
- Create: `src/app/api/price-monitor/bulk/route.ts`

- [ ] **Step 1: Create the proxy route**

Create `src/app/api/price-monitor/bulk/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";

const PARSER_URL = process.env.PARSER_API_URL || "";
const PARSER_TOKEN = process.env.PARSER_API_TOKEN || "";

export async function POST(req: NextRequest) {
  if (!PARSER_URL) {
    return NextResponse.json({ results: [] });
  }
  try {
    const body = await req.json();
    const resp = await fetch(`${PARSER_URL}/bulk`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Token": PARSER_TOKEN,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (!resp.ok) {
      return NextResponse.json({ results: [] });
    }
    return NextResponse.json(await resp.json());
  } catch {
    return NextResponse.json({ results: [] });
  }
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/vladislavufimcev/Documents/autoparts-shop/.claude/worktrees/heuristic-galileo-8fff2c
git add src/app/api/price-monitor/bulk/route.ts
git commit -m "feat(api): proxy /bulk to price-monitor parser"
```

---

## Task 8: Add `fetchMarketDataBulk` helper

**Files:**
- Modify: `src/app/lib/price-monitor.ts`

- [ ] **Step 1: Append helper and type to `price-monitor.ts`**

Add at the end of `src/app/lib/price-monitor.ts`:

```typescript
export interface BulkMarketEntry {
  article: string;
  brand: string;
  min_price: number | null;
  max_price: number | null;
  median_price: number | null;
  sites_count: number;
  offers_count: number;
  scraped_at: string | null;
}

export async function fetchMarketDataBulk(
  items: { article: string; brand: string }[]
): Promise<Map<string, BulkMarketEntry>> {
  const out = new Map<string, BulkMarketEntry>();
  if (items.length === 0) return out;
  try {
    const resp = await fetch("/api/price-monitor/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    if (!resp.ok) return out;
    const data = (await resp.json()) as { results: BulkMarketEntry[] };
    for (const r of data.results ?? []) {
      out.set(`${r.article}|${r.brand}`, r);
    }
    return out;
  } catch {
    return out;
  }
}

export function bulkEntryToSummary(e: BulkMarketEntry): MarketSummary | null {
  if (e.offers_count === 0 || e.min_price == null) return null;
  return {
    article: e.article,
    brand: e.brand,
    min_price: e.min_price,
    max_price: e.max_price!,
    median_price: e.median_price!,
    sites_count: e.sites_count,
    offers_count: e.offers_count,
    offers: [],
  };
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/vladislavufimcev/Documents/autoparts-shop/.claude/worktrees/heuristic-galileo-8fff2c
git add src/app/lib/price-monitor.ts
git commit -m "feat(lib): fetchMarketDataBulk + bulkEntryToSummary helper"
```

---

## Task 9: Use bulk fetch in `ProductList`

**Files:**
- Modify: `src/app/admin/components/ProductList.tsx`

- [ ] **Step 1: Replace per-row `useEffect` fetch with a single page-level fetch**

Replace the contents of `src/app/admin/components/ProductList.tsx` with:

```tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Pagination from "./Pagination";
import {
  MarketSummary,
  fetchMarketDataBulk,
  bulkEntryToSummary,
  getPriceZone,
  formatPrice,
} from "@/app/lib/price-monitor";

interface ProductItem {
  id: number;
  name: string;
  sku: string;
  brand: string | null;
  categoryTitle: string | null;
  price: number;
  inStock: number;
  image: string | null;
}

interface ProductListProps {
  items: ProductItem[];
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const ZONE_DOT: Record<string, string> = {
  red: "bg-red-500",
  green: "bg-green-500",
  yellow: "bg-yellow-400",
  no_data: "bg-gray-300",
};

function MarketCell({ item, summary }: { item: ProductItem; summary: MarketSummary | null }) {
  if (!summary) {
    return <span className="text-xs text-gray-300">—</span>;
  }
  const zone = getPriceZone(item.price, summary);
  const dot = ZONE_DOT[zone];
  return (
    <div
      className="flex items-center justify-end gap-1.5"
      title={`Мин: ${formatPrice(summary.min_price)}, Медиана: ${formatPrice(summary.median_price)}, Макс: ${formatPrice(summary.max_price)} (${summary.sites_count} сайт.)`}
    >
      <span className={`w-2 h-2 rounded-full ${dot}`} />
      <span className="text-xs text-gray-600 whitespace-nowrap">
        {Math.round(summary.min_price)}–{Math.round(summary.max_price)}₽
      </span>
    </div>
  );
}

export default function ProductList({ items, page, totalPages, onPageChange }: ProductListProps) {
  const [summaries, setSummaries] = useState<Map<string, MarketSummary | null>>(new Map());

  const pairs = useMemo(
    () =>
      items
        .filter((it) => it.sku && it.brand)
        .map((it) => ({ article: it.sku, brand: it.brand as string })),
    [items]
  );

  useEffect(() => {
    if (pairs.length === 0) {
      setSummaries(new Map());
      return;
    }
    let cancelled = false;
    fetchMarketDataBulk(pairs).then((m) => {
      if (cancelled) return;
      const next = new Map<string, MarketSummary | null>();
      for (const p of pairs) {
        const key = `${p.article}|${p.brand}`;
        const entry = m.get(key);
        next.set(key, entry ? bulkEntryToSummary(entry) : null);
      }
      setSummaries(next);
    });
    return () => {
      cancelled = true;
    };
  }, [pairs]);

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 bg-white rounded-xl shadow-sm">
        Товары не найдены
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-2">
        {items.map((item) => {
          const summary =
            item.sku && item.brand
              ? summaries.get(`${item.sku}|${item.brand}`) ?? null
              : null;
          return (
            <div
              key={item.id}
              className="flex items-center gap-4 p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition border border-gray-100"
            >
              {item.image ? (
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-14 h-14 rounded object-cover bg-gray-100 flex-shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded bg-gray-100 flex-shrink-0 flex items-center justify-center text-gray-300">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 truncate">{item.name}</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {item.sku}
                  {item.brand ? ` \u00b7 ${item.brand}` : ""}
                  {item.categoryTitle ? ` \u00b7 ${item.categoryTitle}` : ""}
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                <div className="font-semibold text-gray-900">
                  {Number(item.price).toLocaleString("ru-RU")} &#8381;
                </div>
                <div className={`text-xs mt-0.5 ${item.inStock > 0 ? "text-green-600" : "text-red-500"}`}>
                  {item.inStock > 0 ? "В наличии" : "Нет в наличии"}
                </div>
              </div>

              <div className="flex-shrink-0 w-28">
                <MarketCell item={item} summary={summary} />
              </div>

              <Link
                href={`/admin/products/${item.id}`}
                className="flex-shrink-0 p-2 text-gray-400 hover:text-indigo-600 transition"
                title="Редактировать"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </Link>
            </div>
          );
        })}
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
    </div>
  );
}
```

- [ ] **Step 2: Verify in preview**

Check the preview server logs don't show compile errors. The preview is running at port 3000 (see `preview_list`).

```bash
# log check via Claude Preview tools — skip if running manually
```

Open `/admin/products` in the browser, DevTools → Network. Expected: **one** POST request to `/api/price-monitor/bulk` when the page loads, not 20 GETs to `/api/price-monitor`.

- [ ] **Step 3: Commit**

```bash
cd /Users/vladislavufimcev/Documents/autoparts-shop/.claude/worktrees/heuristic-galileo-8fff2c
git add src/app/admin/components/ProductList.tsx
git commit -m "perf(admin): ProductList uses /bulk — one request per page"
```

---

## Task 10: Merge and deploy frontend

- [ ] **Step 1: Merge worktree branch into main**

```bash
cd /Users/vladislavufimcev/Documents/autoparts-shop
git merge claude/heuristic-galileo-8fff2c --no-edit
git push origin main
```

- [ ] **Step 2: Run deploy script**

```bash
cd /Users/vladislavufimcev/Documents/autoparts-shop
bash scripts/deploy-vps.sh 2>&1 | tail -15
```

Expected: ends with `Деплой завершён.` and pm2 shows `astra-motors online`.

- [ ] **Step 3: Verify in production**

Open `https://gmshop66.ru/admin/products`, DevTools → Network. Expected: one POST to `/api/price-monitor/bulk`.

Open any product card. Expected: "Рыночные цены" table shows data without clicking "Обновить" (data came from overnight runner into `site_results`).

---

## Acceptance Checklist

Run through all of these after Task 10:

- [ ] Nightly `runner.py` writes into `site_results` (verified by timestamps on rows).
- [ ] `/admin/products` loads with exactly one POST to `/api/price-monitor/bulk`.
- [ ] Product card market table shows fresh data without manual "Обновить".
- [ ] Bell notifications show red/yellow items consistent with aggregated data.
- [ ] Min/max prices in the product list indicator match the carded table for the same article.
- [ ] Old `offers` table is absent from `prices.db`.
- [ ] `offers_backup_20260417.json` exists on VPS for rollback.
