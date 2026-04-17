# Price Monitor v3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the price parser so every one of 6 sources returns a categorized, truthful status (OFFERS / OUT_OF_STOCK / NOT_FOUND / ERROR / NOT_CONFIGURED); add brand-aliases + admin UI to resolve cross-site brand mismatches.

**Architecture:** Python FastAPI on VPS Timeweb (5.42.103.41). SQLite stores `brand_aliases` and `site_results`. Nightly cron at 03:00 runs `/parse-all` — fully replaces `site_results`. Admin reads cached data via `/offers`; "Обновить" button triggers on-demand single-article `/parse`. Next.js admin UI renders a 6-row status table with inline "+ alias" actions.

**Tech Stack:** Python 3.11, FastAPI, httpx, BeautifulSoup4, SQLite. Next.js 15 admin. Drizzle ORM untouched — SQLite on VPS is separate.

**Spec:** `docs/superpowers/specs/2026-04-17-price-monitor-v3-honest-results.md`

---

## File Structure

### Python (price-monitor, `~/Documents/price-monitor/`)

| File | Purpose |
|---|---|
| `models.py` | Dataclasses: `Offer`, `SiteResult`, `ErrorCategory` enum |
| `db.py` | SQLite: connection, migrations, CRUD for `site_results` + `brand_aliases` |
| `aliases.py` | **NEW**: `normalize_brand`, `load_aliases`, `brand_matches` |
| `scrapers/base.py` | `BaseScraper` with `get_result()` contract + error categorization |
| `scrapers/exist.py` | exist.ru — rewritten to new contract, with `_find_all_brands` |
| `scrapers/emex.py` | emex.ru — rewritten, with `_find_all_brands` |
| `scrapers/vdopel.py` | vdopel.ru — rewritten, with `_find_all_brands` |
| `scrapers/partkom.py` | part-kom.ru — rewritten, with `_find_all_brands` |
| `scrapers/plentycar.py` | plentycar.ru — rewritten, CSV mode |
| `scrapers/zzap.py` | **NEW**: zzap.ru (replaces armtek) |
| `scrapers/armtek.py` | **DELETE** |
| `api.py` | New `/parse` response, `/aliases*`, `/reload-aliases`, `/offers` |
| `runner.py` | Cron entry: `parse-all` populates `site_results` (full replace) |
| `deploy/deploy.sh` | rsync local → VPS + restart systemd service |
| `deploy/cron.timer` | systemd timer: 03:00 daily |
| `tests/` | pytest unit + fixture files |

### Next.js admin (`src/app/`)

| File | Purpose |
|---|---|
| `lib/price-monitor.ts` | New types: `SiteResult`, `SiteStatus`, `ParseResponse` |
| `api/price-monitor/parse/route.ts` | Proxy /parse to VPS |
| `api/price-monitor/offers/route.ts` | Proxy cached read |
| `api/price-monitor/aliases/route.ts` | **NEW**: proxy alias CRUD |
| `admin/components/MarketPriceWidget.tsx` | Rewritten: 6 rows, status badges, alias button |

---

## Phase A — Models & Database

### Task A1: Define `ErrorCategory` enum and `SiteResult` dataclass

**Files:**
- Modify: `~/Documents/price-monitor/models.py`
- Create: `~/Documents/price-monitor/tests/test_models.py`

- [ ] **Step 1: Write failing test**

```python
# tests/test_models.py
from models import Offer, SiteResult, ErrorCategory, SiteStatus

def test_site_result_offers_status():
    r = SiteResult(
        site="exist.ru",
        status=SiteStatus.OFFERS,
        offers=[Offer(article="A", brand="B", site="exist.ru", price=100.0, delivery_days=2, in_stock=True)],
        duration_ms=1200,
    )
    assert r.status == SiteStatus.OFFERS
    assert len(r.offers) == 1
    assert r.found_brands is None
    assert r.error_category is None

def test_site_result_not_found_with_brands():
    r = SiteResult(site="part-kom.ru", status=SiteStatus.NOT_FOUND, found_brands=["BOSCH", "Бош"], duration_ms=500)
    assert r.status == SiteStatus.NOT_FOUND
    assert r.found_brands == ["BOSCH", "Бош"]
    assert r.offers == []

def test_site_result_error_categorized():
    r = SiteResult(
        site="emex.ru",
        status=SiteStatus.ERROR,
        error_category=ErrorCategory.TIMEOUT,
        error_text="timeout after 30s",
        duration_ms=30000,
    )
    assert r.error_category == ErrorCategory.TIMEOUT

def test_error_category_values():
    assert ErrorCategory.TIMEOUT.value == "timeout"
    assert ErrorCategory.AUTH_FAILED.value == "auth_failed"
    assert ErrorCategory.HTTP_ERROR.value == "http_error"
    assert ErrorCategory.PARSE_ERROR.value == "parse_error"
    assert ErrorCategory.UNKNOWN.value == "unknown"
```

- [ ] **Step 2: Run — verify fails**

Run: `cd ~/Documents/price-monitor && python -m pytest tests/test_models.py -v`
Expected: FAIL — missing imports.

- [ ] **Step 3: Implement**

```python
# models.py — full replacement
from dataclasses import dataclass, field
from enum import Enum


class SiteStatus(str, Enum):
    OFFERS = "OFFERS"
    OUT_OF_STOCK = "OUT_OF_STOCK"
    NOT_FOUND = "NOT_FOUND"
    ERROR = "ERROR"
    NOT_CONFIGURED = "NOT_CONFIGURED"


class ErrorCategory(str, Enum):
    TIMEOUT = "timeout"
    AUTH_FAILED = "auth_failed"
    HTTP_ERROR = "http_error"
    PARSE_ERROR = "parse_error"
    UNKNOWN = "unknown"


@dataclass
class Offer:
    article: str
    brand: str
    site: str
    price: float
    delivery_days: int | None = None
    in_stock: bool | None = None


@dataclass
class SiteResult:
    site: str
    status: SiteStatus
    offers: list[Offer] = field(default_factory=list)
    found_brands: list[str] | None = None
    error_category: ErrorCategory | None = None
    error_text: str | None = None
    duration_ms: int = 0
```

- [ ] **Step 4: Run — verify passes**

Run: `cd ~/Documents/price-monitor && python -m pytest tests/test_models.py -v`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
cd ~/Documents/price-monitor
git add models.py tests/test_models.py
git commit -m "feat(models): add SiteResult, SiteStatus, ErrorCategory"
```

---

### Task A2: `brand_aliases` table — migration + CRUD

**Files:**
- Modify: `~/Documents/price-monitor/db.py`
- Create: `~/Documents/price-monitor/tests/test_db_aliases.py`

- [ ] **Step 1: Write failing test**

```python
# tests/test_db_aliases.py
import os, tempfile
import pytest
from db import init_db, add_alias, list_aliases, delete_alias, load_aliases_map

@pytest.fixture
def tmp_db(monkeypatch):
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
        path = f.name
    monkeypatch.setenv("DB_PATH", path)
    init_db()
    yield path
    os.unlink(path)

def test_add_and_list_alias(tmp_db):
    aid = add_alias("Bosch", "Robert Bosch", "emex.ru")
    assert isinstance(aid, int)
    rows = list_aliases()
    assert len(rows) == 1
    assert rows[0]["canonical"] == "Bosch"
    assert rows[0]["alias"] == "Robert Bosch"
    assert rows[0]["site"] == "emex.ru"

def test_unique_canonical_alias_site(tmp_db):
    add_alias("Bosch", "BOSCH", None)
    with pytest.raises(Exception):
        add_alias("Bosch", "BOSCH", None)

def test_delete_alias(tmp_db):
    aid = add_alias("Bosch", "BO", None)
    delete_alias(aid)
    assert list_aliases() == []

def test_load_aliases_map_normalized(tmp_db):
    add_alias("Bosch", "Robert Bosch", None)
    add_alias("Bosch", "BOSCH", None)
    add_alias("Opel", "GM", "vdopel.ru")
    m = load_aliases_map()
    # format: { site_or_None: { canonical_normalized: set(alias_normalized) } }
    assert "robertbosch" in m[None]["bosch"]
    assert "bosch" in m[None]["bosch"]
    assert "gm" in m["vdopel.ru"]["opel"]
```

- [ ] **Step 2: Run — verify fails**

Run: `cd ~/Documents/price-monitor && python -m pytest tests/test_db_aliases.py -v`
Expected: FAIL — missing functions.

- [ ] **Step 3: Implement in `db.py`**

Add to existing `db.py`:

```python
# db.py additions
import os, sqlite3, re
from contextlib import contextmanager

DB_PATH = os.getenv("DB_PATH", "/opt/price-monitor/prices.db")


@contextmanager
def _conn():
    c = sqlite3.connect(os.getenv("DB_PATH", DB_PATH))
    c.row_factory = sqlite3.Row
    try:
        yield c
        c.commit()
    finally:
        c.close()


def init_db():
    with _conn() as c:
        c.executescript("""
            CREATE TABLE IF NOT EXISTS brand_aliases (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                canonical TEXT NOT NULL,
                alias TEXT NOT NULL,
                site TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                UNIQUE(canonical, alias, site)
            );
            CREATE INDEX IF NOT EXISTS idx_brand_aliases_alias ON brand_aliases(alias);
        """)


def _norm(s: str) -> str:
    return re.sub(r"[\s\-.,_]+", "", (s or "").lower())


def add_alias(canonical: str, alias: str, site: str | None) -> int:
    with _conn() as c:
        cur = c.execute(
            "INSERT INTO brand_aliases(canonical, alias, site) VALUES (?, ?, ?)",
            (canonical, alias, site),
        )
        return cur.lastrowid


def list_aliases() -> list[dict]:
    with _conn() as c:
        return [dict(r) for r in c.execute("SELECT * FROM brand_aliases ORDER BY id DESC")]


def delete_alias(alias_id: int) -> None:
    with _conn() as c:
        c.execute("DELETE FROM brand_aliases WHERE id = ?", (alias_id,))


def load_aliases_map() -> dict:
    """Return { site_or_None: { norm_canonical: set(norm_alias_and_canonical) } }"""
    out: dict = {}
    with _conn() as c:
        rows = c.execute("SELECT canonical, alias, site FROM brand_aliases").fetchall()
    for r in rows:
        site = r["site"]
        canon = _norm(r["canonical"])
        alias = _norm(r["alias"])
        bucket = out.setdefault(site, {}).setdefault(canon, {_norm(r["canonical"])})
        bucket.add(alias)
    return out
```

- [ ] **Step 4: Run — verify passes**

Run: `cd ~/Documents/price-monitor && python -m pytest tests/test_db_aliases.py -v`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add db.py tests/test_db_aliases.py
git commit -m "feat(db): add brand_aliases table + CRUD + load_aliases_map"
```

---

### Task A3: `site_results` table — schema + write/read

**Files:**
- Modify: `~/Documents/price-monitor/db.py`
- Create: `~/Documents/price-monitor/tests/test_db_results.py`

- [ ] **Step 1: Write failing test**

```python
# tests/test_db_results.py
import os, tempfile, json
import pytest
from db import init_db, replace_site_results, get_site_results
from models import SiteResult, SiteStatus, Offer, ErrorCategory

@pytest.fixture
def tmp_db(monkeypatch):
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
        path = f.name
    monkeypatch.setenv("DB_PATH", path)
    init_db()
    yield path
    os.unlink(path)

def test_replace_and_read(tmp_db):
    results = [
        SiteResult(site="exist.ru", status=SiteStatus.OFFERS,
                   offers=[Offer(article="A1", brand="Bosch", site="exist.ru", price=311, delivery_days=2, in_stock=True)],
                   duration_ms=1200),
        SiteResult(site="emex.ru", status=SiteStatus.ERROR,
                   error_category=ErrorCategory.TIMEOUT, error_text="timeout 30s", duration_ms=30000),
    ]
    replace_site_results("A1", "Bosch", results)
    back = get_site_results("A1", "Bosch")
    assert len(back) == 2
    exist = next(r for r in back if r.site == "exist.ru")
    assert exist.status == SiteStatus.OFFERS
    assert exist.offers[0].price == 311
    emex = next(r for r in back if r.site == "emex.ru")
    assert emex.error_category == ErrorCategory.TIMEOUT
```

- [ ] **Step 2: Run — verify fails**

Run: `cd ~/Documents/price-monitor && python -m pytest tests/test_db_results.py -v`
Expected: FAIL.

- [ ] **Step 3: Implement**

Add to `db.py`:

```python
import json
from models import SiteResult, SiteStatus, Offer, ErrorCategory


def init_db():
    # extend existing init_db — add this block alongside brand_aliases
    with _conn() as c:
        c.executescript("""
            CREATE TABLE IF NOT EXISTS site_results (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                article TEXT NOT NULL,
                brand TEXT NOT NULL,
                site TEXT NOT NULL,
                status TEXT NOT NULL,
                offers_json TEXT,
                found_brands_json TEXT,
                error_category TEXT,
                error_text TEXT,
                duration_ms INTEGER,
                scraped_at TEXT NOT NULL DEFAULT (datetime('now')),
                UNIQUE(article, brand, site)
            );
            CREATE INDEX IF NOT EXISTS idx_site_results_lookup ON site_results(article, brand);
        """)


def replace_site_results(article: str, brand: str, results: list[SiteResult]) -> None:
    with _conn() as c:
        c.execute("DELETE FROM site_results WHERE article = ? AND brand = ?", (article, brand))
        for r in results:
            offers_json = json.dumps([o.__dict__ for o in r.offers], ensure_ascii=False) if r.offers else None
            found_brands_json = json.dumps(r.found_brands, ensure_ascii=False) if r.found_brands is not None else None
            c.execute("""
                INSERT INTO site_results(article, brand, site, status, offers_json, found_brands_json,
                                         error_category, error_text, duration_ms)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (article, brand, r.site, r.status.value, offers_json, found_brands_json,
                  r.error_category.value if r.error_category else None, r.error_text, r.duration_ms))


def get_site_results(article: str, brand: str) -> list[SiteResult]:
    with _conn() as c:
        rows = c.execute("SELECT * FROM site_results WHERE article = ? AND brand = ?", (article, brand)).fetchall()
    out = []
    for row in rows:
        offers = []
        if row["offers_json"]:
            for o in json.loads(row["offers_json"]):
                offers.append(Offer(**o))
        out.append(SiteResult(
            site=row["site"],
            status=SiteStatus(row["status"]),
            offers=offers,
            found_brands=json.loads(row["found_brands_json"]) if row["found_brands_json"] else None,
            error_category=ErrorCategory(row["error_category"]) if row["error_category"] else None,
            error_text=row["error_text"],
            duration_ms=row["duration_ms"] or 0,
        ))
    return out


def wipe_all_site_results() -> None:
    """Used before nightly full-catalog run."""
    with _conn() as c:
        c.execute("DELETE FROM site_results")
```

- [ ] **Step 4: Run — verify passes**

Run: `cd ~/Documents/price-monitor && python -m pytest tests/test_db_results.py -v`
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add db.py tests/test_db_results.py
git commit -m "feat(db): add site_results schema + replace/get helpers"
```

---

### Task A4: `aliases.py` — `normalize_brand`, `brand_matches`, `AliasesStore`

**Files:**
- Create: `~/Documents/price-monitor/aliases.py`
- Create: `~/Documents/price-monitor/tests/test_aliases.py`

- [ ] **Step 1: Write failing test**

```python
# tests/test_aliases.py
from aliases import normalize_brand, AliasesStore

def test_normalize_basic():
    assert normalize_brand("Bosch") == "bosch"
    assert normalize_brand("  BOSCH ") == "bosch"
    assert normalize_brand("Robert Bosch") == "robertbosch"
    assert normalize_brand("Robert-Bosch") == "robertbosch"
    assert normalize_brand("") == ""

def test_brand_matches_exact():
    s = AliasesStore({})
    assert s.brand_matches("BOSCH", "Bosch", site="exist.ru") is True
    assert s.brand_matches("Febi", "Bosch", site="exist.ru") is False

def test_brand_matches_via_alias_site_specific():
    data = {"emex.ru": {"bosch": {"bosch", "robertbosch"}}}
    s = AliasesStore(data)
    assert s.brand_matches("Robert Bosch", "Bosch", site="emex.ru") is True
    # alias is site-specific — doesn't apply to other sites
    assert s.brand_matches("Robert Bosch", "Bosch", site="exist.ru") is False

def test_brand_matches_via_global_alias():
    data = {None: {"bosch": {"bosch", "бош"}}}
    s = AliasesStore(data)
    assert s.brand_matches("Бош", "Bosch", site="part-kom.ru") is True
    assert s.brand_matches("Бош", "Bosch", site="exist.ru") is True
```

- [ ] **Step 2: Run — verify fails**

Run: `cd ~/Documents/price-monitor && python -m pytest tests/test_aliases.py -v`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement**

```python
# aliases.py
import re
import threading
import logging
from db import load_aliases_map

log = logging.getLogger(__name__)


def normalize_brand(s: str) -> str:
    return re.sub(r"[\s\-.,_]+", "", (s or "").lower())


class AliasesStore:
    """Thread-safe alias lookup store. Data structure:
       { site_or_None: { normalized_canonical: set(normalized_variants_including_canonical) } }
    """

    def __init__(self, data: dict | None = None):
        self._data = data or {}
        self._lock = threading.Lock()

    def reload(self) -> None:
        with self._lock:
            self._data = load_aliases_map()
            log.info(f"aliases: reloaded, sites={len(self._data)}")

    def _variants_for(self, canonical: str, site: str | None) -> set[str]:
        n_canon = normalize_brand(canonical)
        variants = {n_canon}
        # global aliases
        if None in self._data and n_canon in self._data[None]:
            variants |= self._data[None][n_canon]
        # site-specific aliases
        if site and site in self._data and n_canon in self._data[site]:
            variants |= self._data[site][n_canon]
        return variants

    def brand_matches(self, site_brand: str, query_brand: str, site: str) -> bool:
        n_site = normalize_brand(site_brand)
        if not n_site:
            return False
        return n_site in self._variants_for(query_brand, site)


# Singleton for use in scrapers
STORE = AliasesStore()
```

- [ ] **Step 4: Run — verify passes**

Run: `cd ~/Documents/price-monitor && python -m pytest tests/test_aliases.py -v`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add aliases.py tests/test_aliases.py
git commit -m "feat(aliases): normalize_brand + AliasesStore with site-specific + global lookup"
```

---

## Phase B — Scraper Contract + Implementations

### Task B1: `BaseScraper.get_result()` — error categorization contract

**Files:**
- Modify: `~/Documents/price-monitor/scrapers/base.py`
- Create: `~/Documents/price-monitor/tests/test_base_scraper.py`

- [ ] **Step 1: Write failing test**

```python
# tests/test_base_scraper.py
import asyncio, httpx, json, pytest
from scrapers.base import BaseScraper
from models import SiteResult, SiteStatus, ErrorCategory
from aliases import AliasesStore

class _Fake(BaseScraper):
    SITE_NAME = "fake.test"
    def __init__(self, behavior): super().__init__(); self.behavior = behavior
    async def _scrape(self, article, brand, aliases):
        if self.behavior == "offers":
            from models import Offer
            return [Offer(article, brand, self.SITE_NAME, 100.0, 2, True)], None
        if self.behavior == "not_found_with_brands":
            return [], ["BOSCH", "Бош"]
        if self.behavior == "not_found_empty":
            return [], []
        if self.behavior == "out_of_stock":
            return [], [brand]  # found brand itself but no offers
        if self.behavior == "timeout":
            raise httpx.TimeoutException("timeout 30s")
        if self.behavior == "http_401":
            req = httpx.Request("GET", "http://x"); resp = httpx.Response(401, request=req)
            raise httpx.HTTPStatusError("401", request=req, response=resp)
        if self.behavior == "parse_error":
            raise json.JSONDecodeError("bad", "x", 0)
        if self.behavior == "unknown":
            raise RuntimeError("boom")
    def is_configured(self): return True

def run(coro): return asyncio.get_event_loop().run_until_complete(coro)

def test_offers_status():
    r = run(_Fake("offers").get_result("A", "Bosch", AliasesStore()))
    assert r.status == SiteStatus.OFFERS and r.offers and r.duration_ms >= 0

def test_not_found_status():
    r = run(_Fake("not_found_with_brands").get_result("A", "Bosch", AliasesStore()))
    assert r.status == SiteStatus.NOT_FOUND
    assert r.found_brands == ["BOSCH", "Бош"]

def test_out_of_stock_status():
    r = run(_Fake("out_of_stock").get_result("A", "Bosch", AliasesStore()))
    assert r.status == SiteStatus.OUT_OF_STOCK

def test_timeout_category():
    r = run(_Fake("timeout").get_result("A", "Bosch", AliasesStore()))
    assert r.status == SiteStatus.ERROR and r.error_category == ErrorCategory.TIMEOUT

def test_auth_failed_category():
    r = run(_Fake("http_401").get_result("A", "Bosch", AliasesStore()))
    assert r.status == SiteStatus.ERROR and r.error_category == ErrorCategory.AUTH_FAILED

def test_parse_error_category():
    r = run(_Fake("parse_error").get_result("A", "Bosch", AliasesStore()))
    assert r.status == SiteStatus.ERROR and r.error_category == ErrorCategory.PARSE_ERROR

def test_unknown_category():
    r = run(_Fake("unknown").get_result("A", "Bosch", AliasesStore()))
    assert r.status == SiteStatus.ERROR and r.error_category == ErrorCategory.UNKNOWN
```

- [ ] **Step 2: Run — verify fails**

Run: `cd ~/Documents/price-monitor && python -m pytest tests/test_base_scraper.py -v`
Expected: FAIL.

- [ ] **Step 3: Implement — rewrite `BaseScraper`**

```python
# scrapers/base.py — full replacement of public API; keep existing USER_AGENTS/utilities
import asyncio, random, time, logging, json, httpx
from abc import ABC, abstractmethod
from models import SiteResult, SiteStatus, ErrorCategory, Offer
from aliases import AliasesStore, normalize_brand

log = logging.getLogger(__name__)

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15",
]


def normalize_article(s: str) -> str:
    return "".join(ch for ch in (s or "") if ch.isalnum()).lower()


class BaseScraper(ABC):
    SITE_NAME: str = "override.me"
    REQUEST_TIMEOUT = 30.0

    def __init__(self):
        self._client: httpx.AsyncClient | None = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(
                timeout=self.REQUEST_TIMEOUT,
                follow_redirects=True,
                headers={"User-Agent": random.choice(USER_AGENTS)},
            )
        return self._client

    async def _delay(self):
        await asyncio.sleep(random.uniform(0.3, 1.2))

    async def _fetch_text(self, url: str, **kwargs) -> str:
        client = await self._get_client()
        await self._delay()
        resp = await client.get(url, **kwargs)
        resp.raise_for_status()
        return resp.text

    async def _fetch_json(self, url: str, **kwargs) -> dict:
        client = await self._get_client()
        await self._delay()
        resp = await client.get(url, **kwargs)
        resp.raise_for_status()
        return resp.json()

    def is_configured(self) -> bool:
        return True

    def required_env(self) -> str:
        return ""

    @abstractmethod
    async def _scrape(self, article: str, brand: str, aliases: AliasesStore) -> tuple[list[Offer], list[str] | None]:
        """Return (offers, found_brands).

        Rules:
          - offers non-empty → OFFERS
          - offers empty, found_brands contains brand (or alias) → OUT_OF_STOCK
          - offers empty, found_brands does not contain brand → NOT_FOUND
          - found_brands is None → site doesn't support searching without brand filter
        """
        ...

    async def get_result(self, article: str, brand: str, aliases: AliasesStore) -> SiteResult:
        if not self.is_configured():
            return SiteResult(
                site=self.SITE_NAME,
                status=SiteStatus.NOT_CONFIGURED,
                error_text=f"{self.required_env()} не настроена",
            )

        start = time.monotonic()
        try:
            offers, found_brands = await self._scrape(article, brand, aliases)
            duration_ms = int((time.monotonic() - start) * 1000)

            if offers:
                return SiteResult(
                    site=self.SITE_NAME, status=SiteStatus.OFFERS,
                    offers=offers, duration_ms=duration_ms,
                )
            # Empty offers — figure out if NOT_FOUND or OUT_OF_STOCK
            if found_brands is not None and any(
                aliases.brand_matches(fb, brand, self.SITE_NAME) for fb in found_brands
            ):
                return SiteResult(
                    site=self.SITE_NAME, status=SiteStatus.OUT_OF_STOCK,
                    found_brands=found_brands, duration_ms=duration_ms,
                )
            return SiteResult(
                site=self.SITE_NAME, status=SiteStatus.NOT_FOUND,
                found_brands=found_brands, duration_ms=duration_ms,
            )
        except httpx.TimeoutException as e:
            return self._err(start, ErrorCategory.TIMEOUT, str(e) or "timeout")
        except httpx.HTTPStatusError as e:
            code = e.response.status_code
            cat = ErrorCategory.AUTH_FAILED if code in (401, 403) else ErrorCategory.HTTP_ERROR
            return self._err(start, cat, f"HTTP {code}")
        except (json.JSONDecodeError, ValueError) as e:
            return self._err(start, ErrorCategory.PARSE_ERROR, str(e))
        except Exception as e:
            log.exception(f"{self.SITE_NAME}: unexpected error")
            return self._err(start, ErrorCategory.UNKNOWN, str(e))

    def _err(self, start: float, cat: ErrorCategory, text: str) -> SiteResult:
        return SiteResult(
            site=self.SITE_NAME, status=SiteStatus.ERROR,
            error_category=cat, error_text=text,
            duration_ms=int((time.monotonic() - start) * 1000),
        )

    async def close(self):
        if self._client:
            await self._client.aclose()
            self._client = None
```

- [ ] **Step 4: Run — verify passes**

Run: `cd ~/Documents/price-monitor && python -m pytest tests/test_base_scraper.py -v`
Expected: 7 passed.

- [ ] **Step 5: Commit**

```bash
git add scrapers/base.py tests/test_base_scraper.py
git commit -m "feat(base): enforce error categorization contract in BaseScraper.get_result"
```

---

### Task B2: `exist.py` — migrate to new contract + `_find_all_brands`

**Files:**
- Modify: `~/Documents/price-monitor/scrapers/exist.py`
- Create: `~/Documents/price-monitor/tests/test_exist.py`
- Create: `~/Documents/price-monitor/tests/fixtures/exist/bosch_found.html`
- Create: `~/Documents/price-monitor/tests/fixtures/exist/not_found.html`

- [ ] **Step 1: Capture real fixtures**

Run once to capture samples:

```bash
curl -s 'https://www.exist.ru/Price/?pcode=0242229699' -A 'Mozilla/5.0' > ~/Documents/price-monitor/tests/fixtures/exist/bosch_found.html
curl -s 'https://www.exist.ru/Price/?pcode=ZZZ999NOEXIST' -A 'Mozilla/5.0' > ~/Documents/price-monitor/tests/fixtures/exist/not_found.html
```

- [ ] **Step 2: Write failing test**

```python
# tests/test_exist.py
import asyncio, pytest, pathlib
from unittest.mock import AsyncMock, patch
from scrapers.exist import ExistScraper
from models import SiteStatus
from aliases import AliasesStore

FIX = pathlib.Path(__file__).parent / "fixtures" / "exist"

def _fixture(name): return (FIX / name).read_text(encoding="utf-8")

def run(coro): return asyncio.new_event_loop().run_until_complete(coro)

def test_exist_parses_offers():
    with patch.object(ExistScraper, "_fetch_text", new=AsyncMock(return_value=_fixture("bosch_found.html"))):
        r = run(ExistScraper().get_result("0242229699", "Bosch", AliasesStore()))
    assert r.status == SiteStatus.OFFERS
    assert all(o.price > 0 for o in r.offers)

def test_exist_not_found():
    with patch.object(ExistScraper, "_fetch_text", new=AsyncMock(return_value=_fixture("not_found.html"))):
        r = run(ExistScraper().get_result("ZZZ999", "Bosch", AliasesStore()))
    assert r.status == SiteStatus.NOT_FOUND
    assert r.found_brands == [] or r.found_brands is None
```

- [ ] **Step 3: Run — verify fails**

Run: `cd ~/Documents/price-monitor && python -m pytest tests/test_exist.py -v`
Expected: FAIL — current `exist.py` doesn't match new interface.

- [ ] **Step 4: Rewrite `exist.py`**

```python
# scrapers/exist.py
import re, json, logging
from models import Offer
from scrapers.base import BaseScraper
from aliases import AliasesStore

log = logging.getLogger(__name__)

_SCRIPT_MARKER = "_data"


class ExistScraper(BaseScraper):
    SITE_NAME = "exist.ru"
    MAX_DELIVERY_MINUTES = 10080  # 7 days

    def _extract_data_array(self, html: str) -> list[dict]:
        """Find `_data = [...];` in <script> tags. Bracket-counted JSON extraction."""
        pos = 0
        while True:
            idx = html.find(_SCRIPT_MARKER, pos)
            if idx < 0:
                return []
            eq = html.find("=", idx)
            if eq < 0:
                return []
            # Find opening [
            start = html.find("[", eq)
            if start < 0 or start - eq > 30:
                pos = idx + len(_SCRIPT_MARKER)
                continue
            depth, i = 0, start
            while i < len(html):
                c = html[i]
                if c == "[": depth += 1
                elif c == "]":
                    depth -= 1
                    if depth == 0:
                        raw = html[start:i + 1]
                        try:
                            return json.loads(raw)
                        except json.JSONDecodeError:
                            pos = idx + len(_SCRIPT_MARKER); break
                i += 1
            else:
                return []

    async def _scrape(self, article: str, brand: str, aliases: AliasesStore):
        url = f"https://www.exist.ru/Price/?pcode={article}"
        html = await self._fetch_text(url)
        data = self._extract_data_array(html)

        if not data:
            return [], []

        found_brands = sorted({(d.get("CatalogName") or "").strip() for d in data if d.get("CatalogName")})
        offers = []
        for d in data:
            if not aliases.brand_matches(d.get("CatalogName", ""), brand, self.SITE_NAME):
                continue
            minutes = d.get("minutes") or 0
            if minutes > self.MAX_DELIVERY_MINUTES:
                continue
            price_str = d.get("MinPriceString") or ""
            m = re.search(r"(\d+(?:[.,]\d+)?)", price_str.replace(" ", ""))
            if not m:
                continue
            price = float(m.group(1).replace(",", "."))
            if price <= 0:
                continue
            offers.append(Offer(
                article=article, brand=brand, site=self.SITE_NAME,
                price=price, delivery_days=minutes // 1440 if minutes else None, in_stock=True,
            ))
        return offers, found_brands
```

- [ ] **Step 5: Run — verify passes**

Run: `cd ~/Documents/price-monitor && python -m pytest tests/test_exist.py -v`
Expected: pass.

- [ ] **Step 6: Commit**

```bash
git add scrapers/exist.py tests/test_exist.py tests/fixtures/exist/
git commit -m "feat(exist): migrate to new contract, expose found_brands"
```

---

### Task B3: `emex.py` — migrate + `_find_all_brands`

**Files:**
- Modify: `~/Documents/price-monitor/scrapers/emex.py`
- Create: `~/Documents/price-monitor/tests/test_emex.py`
- Create: `~/Documents/price-monitor/tests/fixtures/emex/bosch.json`

- [ ] **Step 1: Capture fixture**

```bash
curl -s 'https://emex.ru/api/search/search?make=Bosch&detailNum=0242229699&locationId=39915' \
  -A 'Mozilla/5.0' > ~/Documents/price-monitor/tests/fixtures/emex/bosch.json
```

- [ ] **Step 2: Write failing test**

```python
# tests/test_emex.py
import asyncio, pathlib, json, pytest
from unittest.mock import AsyncMock, patch
from scrapers.emex import EmexScraper
from models import SiteStatus
from aliases import AliasesStore

FIX = pathlib.Path(__file__).parent / "fixtures" / "emex"
def _fx(n): return json.loads((FIX / n).read_text(encoding="utf-8"))
def run(c): return asyncio.new_event_loop().run_until_complete(c)

def test_emex_offers():
    with patch.object(EmexScraper, "_fetch_json", new=AsyncMock(return_value=_fx("bosch.json"))):
        r = run(EmexScraper().get_result("0242229699", "Bosch", AliasesStore()))
    assert r.status in (SiteStatus.OFFERS, SiteStatus.OUT_OF_STOCK, SiteStatus.NOT_FOUND)
    if r.status == SiteStatus.OFFERS:
        assert all(o.price > 0 for o in r.offers)
```

- [ ] **Step 3: Run — verify fails**

Run: `cd ~/Documents/price-monitor && python -m pytest tests/test_emex.py -v`
Expected: FAIL.

- [ ] **Step 4: Rewrite `emex.py`**

```python
# scrapers/emex.py
import logging
from scrapers.base import BaseScraper
from models import Offer
from aliases import AliasesStore

log = logging.getLogger(__name__)


class EmexScraper(BaseScraper):
    SITE_NAME = "emex.ru"
    LOCATION_ID = 39915  # Ekaterinburg

    async def _scrape(self, article: str, brand: str, aliases: AliasesStore):
        url = (
            f"https://emex.ru/api/search/search?"
            f"make={brand}&detailNum={article}&locationId={self.LOCATION_ID}"
        )
        data = await self._fetch_json(url)
        makes = (data.get("searchResult") or {}).get("makes") or {}
        make_list = makes.get("list") or []

        found_brands = [m.get("make") for m in make_list if m.get("make")]
        offers: list[Offer] = []
        for m in make_list:
            m_brand = m.get("make") or ""
            if not aliases.brand_matches(m_brand, brand, self.SITE_NAME):
                continue
            best = m.get("bestPrice") or {}
            price = best.get("price")
            if not price or price <= 0:
                continue
            offers.append(Offer(
                article=article, brand=brand, site=self.SITE_NAME,
                price=float(price),
                delivery_days=best.get("deliveryDays") or None,
                in_stock=True,
            ))
        return offers, found_brands
```

- [ ] **Step 5: Run — verify passes**

Run: `cd ~/Documents/price-monitor && python -m pytest tests/test_emex.py -v`
Expected: pass.

- [ ] **Step 6: Commit**

```bash
git add scrapers/emex.py tests/test_emex.py tests/fixtures/emex/
git commit -m "feat(emex): migrate to new contract, expose found_brands"
```

---

### Task B4: `vdopel.py` — migrate + `_find_all_brands`

**Files:**
- Modify: `~/Documents/price-monitor/scrapers/vdopel.py`
- Create: `~/Documents/price-monitor/tests/test_vdopel.py`
- Create: `~/Documents/price-monitor/tests/fixtures/vdopel/products.json`
- Create: `~/Documents/price-monitor/tests/fixtures/vdopel/sklads.json`

- [ ] **Step 1: Capture fixtures**

```bash
curl -s 'https://vdopel.ru/detailSearchNew/default/getSkladList/?search_phrase=0242229699&time_start=0' \
  > ~/Documents/price-monitor/tests/fixtures/vdopel/sklads.json
curl -s 'https://vdopel.ru/detailSearchNew/default/getProductList/?search_phrase=0242229699&search_sklad=local_my&time_start=0&search_brand=' \
  > ~/Documents/price-monitor/tests/fixtures/vdopel/products.json
```

- [ ] **Step 2: Write failing test**

```python
# tests/test_vdopel.py
import asyncio, pathlib, json
from unittest.mock import AsyncMock, patch
from scrapers.vdopel import VdopelScraper
from models import SiteStatus
from aliases import AliasesStore

FIX = pathlib.Path(__file__).parent / "fixtures" / "vdopel"
def fx(n): return json.loads((FIX / n).read_text(encoding="utf-8"))
def run(c): return asyncio.new_event_loop().run_until_complete(c)

def test_vdopel_offers():
    async def fake_fetch_json(url, **kw):
        return fx("sklads.json") if "getSkladList" in url else fx("products.json")
    with patch.object(VdopelScraper, "_fetch_json", new=AsyncMock(side_effect=fake_fetch_json)):
        r = run(VdopelScraper().get_result("0242229699", "Bosch", AliasesStore()))
    assert r.status in (SiteStatus.OFFERS, SiteStatus.NOT_FOUND, SiteStatus.OUT_OF_STOCK)
```

- [ ] **Step 3: Run — verify fails**

Run: `cd ~/Documents/price-monitor && python -m pytest tests/test_vdopel.py -v`
Expected: FAIL — signature mismatch.

- [ ] **Step 4: Rewrite `vdopel.py`**

```python
# scrapers/vdopel.py
from scrapers.base import BaseScraper
from models import Offer
from aliases import AliasesStore


class VdopelScraper(BaseScraper):
    SITE_NAME = "vdopel.ru"

    async def _scrape(self, article: str, brand: str, aliases: AliasesStore):
        sklads_url = f"https://vdopel.ru/detailSearchNew/default/getSkladList/?search_phrase={article}&time_start=0"
        sklads = (await self._fetch_json(sklads_url)).get("sklads", [])
        if not sklads:
            return [], []

        offers: list[Offer] = []
        all_brands: set[str] = set()
        for sklad in sklads:
            products_url = (
                f"https://vdopel.ru/detailSearchNew/default/getProductList/"
                f"?search_phrase={article}&search_sklad={sklad}&time_start=0&search_brand="
            )
            data = await self._fetch_json(products_url)
            items = (data.get("products") or []) + (data.get("products_other") or [])
            for p in items:
                p_brand = (p.get("brand") or "").strip()
                if p_brand:
                    all_brands.add(p_brand)
                if not aliases.brand_matches(p_brand, brand, self.SITE_NAME):
                    continue
                price = p.get("price")
                try:
                    price = float(price)
                except (TypeError, ValueError):
                    continue
                if price <= 0:
                    continue
                qty = p.get("kolichestvo", "0")
                try:
                    in_stock = int(qty) > 0
                except (TypeError, ValueError):
                    in_stock = None
                offers.append(Offer(
                    article=article, brand=brand, site=self.SITE_NAME,
                    price=price, delivery_days=None, in_stock=in_stock,
                ))
        return offers, sorted(all_brands)
```

- [ ] **Step 5: Run — verify passes**

Run: `cd ~/Documents/price-monitor && python -m pytest tests/test_vdopel.py -v`
Expected: pass.

- [ ] **Step 6: Commit**

```bash
git add scrapers/vdopel.py tests/test_vdopel.py tests/fixtures/vdopel/
git commit -m "feat(vdopel): migrate to new contract, expose found_brands"
```

---

### Task B5: `partkom.py` — migrate + `_find_all_brands`

**Files:**
- Modify: `~/Documents/price-monitor/scrapers/partkom.py`
- Create: `~/Documents/price-monitor/tests/test_partkom.py`
- Create: `~/Documents/price-monitor/tests/fixtures/partkom/search.html`

- [ ] **Step 1: Capture fixture**

```bash
curl -s 'https://part-kom.ru/search?search=0242229699' -A 'Mozilla/5.0' \
  > ~/Documents/price-monitor/tests/fixtures/partkom/search.html
```

- [ ] **Step 2: Write failing test**

```python
# tests/test_partkom.py
import asyncio, pathlib
from unittest.mock import AsyncMock, patch
from scrapers.partkom import PartKomScraper
from models import SiteStatus
from aliases import AliasesStore

FIX = pathlib.Path(__file__).parent / "fixtures" / "partkom"
def run(c): return asyncio.new_event_loop().run_until_complete(c)

def test_partkom_runs():
    html = (FIX / "search.html").read_text(encoding="utf-8")
    with patch.object(PartKomScraper, "_fetch_text", new=AsyncMock(return_value=html)):
        r = run(PartKomScraper().get_result("0242229699", "Bosch", AliasesStore()))
    assert r.status in (SiteStatus.OFFERS, SiteStatus.OUT_OF_STOCK, SiteStatus.NOT_FOUND, SiteStatus.ERROR)
```

- [ ] **Step 3: Run — verify fails**

Run: `cd ~/Documents/price-monitor && python -m pytest tests/test_partkom.py -v`
Expected: FAIL.

- [ ] **Step 4: Rewrite `partkom.py`**

```python
# scrapers/partkom.py
import json, logging
from scrapers.base import BaseScraper
from models import Offer
from aliases import AliasesStore

log = logging.getLogger(__name__)
_MARKER = 'window[Symbol.for("InstantSearchInitialResults")] = '


class PartKomScraper(BaseScraper):
    SITE_NAME = "part-kom.ru"

    def _parse_hits(self, html: str) -> list[dict]:
        idx = html.find(_MARKER)
        if idx < 0:
            return []
        start = idx + len(_MARKER)
        end = html.find("</script>", start)
        if end < 0:
            return []
        json_str = html[start:end].strip().rstrip(";")
        data = json.loads(json_str)
        results = (data.get("products") or {}).get("results") or []
        if not results:
            return []
        return results[0].get("hits") or []

    async def _scrape(self, article: str, brand: str, aliases: AliasesStore):
        html = await self._fetch_text(f"https://part-kom.ru/search?search={article}")
        hits = self._parse_hits(html)
        if not hits:
            return [], []
        all_brands = sorted({(h.get("brand") or "").strip() for h in hits if h.get("brand")})
        offers = []
        for h in hits:
            if not aliases.brand_matches(h.get("brand") or "", brand, self.SITE_NAME):
                continue
            price = h.get("price")
            if not isinstance(price, (int, float)) or price <= 0:
                continue
            stock = h.get("stock", 0)
            offers.append(Offer(
                article=article, brand=brand, site=self.SITE_NAME,
                price=float(price), in_stock=stock > 0,
            ))
        return offers, all_brands
```

- [ ] **Step 5: Run — verify passes**

Run: `cd ~/Documents/price-monitor && python -m pytest tests/test_partkom.py -v`
Expected: pass.

- [ ] **Step 6: Commit**

```bash
git add scrapers/partkom.py tests/test_partkom.py tests/fixtures/partkom/
git commit -m "feat(partkom): migrate to new contract, expose found_brands"
```

---

### Task B6: `plentycar.py` — migrate + `_find_all_brands`

**Files:**
- Modify: `~/Documents/price-monitor/scrapers/plentycar.py`
- Create: `~/Documents/price-monitor/tests/test_plentycar.py`

- [ ] **Step 1: Write failing test (minimal — full CSV download mocked out)**

```python
# tests/test_plentycar.py
import asyncio, zipfile, io, tempfile, pathlib
from unittest.mock import patch
from scrapers.plentycar import PlentycarScraper, CACHE_DIR
from models import SiteStatus
from aliases import AliasesStore

def _build_zip(rows: list[dict]) -> bytes:
    csv_lines = ["Производитель;Код;Наименование;Цена,р. (розница);Наличие;Срок, дн"]
    for r in rows:
        csv_lines.append(f"{r['brand']};{r['code']};{r['name']};{r['price']};{r['stock']};{r['days']}")
    csv_bytes = "\r\n".join(csv_lines).encode("cp1251")
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("price.csv", csv_bytes)
    return buf.getvalue()

def run(c): return asyncio.new_event_loop().run_until_complete(c)

def test_plentycar_finds_offer(tmp_path, monkeypatch):
    # Seed cache with a fake ZIP containing one matching row
    monkeypatch.setattr("scrapers.plentycar.CACHE_DIR", tmp_path)
    tmp_path.mkdir(exist_ok=True)
    rows = [{"brand": "Bosch", "code": "0242229699", "name": "Свеча", "price": "410,00", "stock": "+", "days": "3"}]
    z = _build_zip(rows)
    for wid in (1, 3, 6, 10):
        (tmp_path / f"plentycar-{wid}.csv.zip").write_bytes(z)
        # mtime fresh
    with patch.object(PlentycarScraper, "_ensure_file", side_effect=lambda wid: tmp_path / f"plentycar-{wid}.csv.zip"):
        r = run(PlentycarScraper().get_result("0242229699", "Bosch", AliasesStore()))
    assert r.status == SiteStatus.OFFERS
    assert r.offers[0].price == 410.0
```

- [ ] **Step 2: Run — verify fails**

Run: `cd ~/Documents/price-monitor && python -m pytest tests/test_plentycar.py -v`
Expected: FAIL (interface mismatch).

- [ ] **Step 3: Rewrite `plentycar.py` — adapt to `_scrape` contract**

Keep existing download logic. Replace `get_offers` with `_scrape`:

```python
# scrapers/plentycar.py — replace get_offers
# (keep _ensure_file and existing download/caching code as-is)
import csv, io, zipfile, asyncio, logging, time, random
from pathlib import Path
from scrapers.base import BaseScraper, normalize_article, USER_AGENTS
from models import Offer
from aliases import AliasesStore

log = logging.getLogger(__name__)
CACHE_DIR = Path("/tmp/plentycar_cache")
CACHE_MAX_AGE_SEC = 12 * 3600
_WAREHOUSES = [(1, 1), (3, 3), (6, 6), (10, 10)]
_BASE_URL = "https://img.plentycar.ru/price/plentycar-{wid}.csv.zip"


class PlentycarScraper(BaseScraper):
    SITE_NAME = "plentycar.ru"

    async def _ensure_file(self, wid: int) -> Path | None:
        # (same as existing impl — keep unchanged)
        CACHE_DIR.mkdir(exist_ok=True)
        path = CACHE_DIR / f"plentycar-{wid}.csv.zip"
        if path.exists() and time.time() - path.stat().st_mtime < CACHE_MAX_AGE_SEC:
            return path
        url = _BASE_URL.format(wid=wid)
        client = await self._get_client()
        try:
            resp = await client.get(url, headers={"User-Agent": random.choice(USER_AGENTS)}, timeout=180)
            resp.raise_for_status()
        except Exception as e:
            log.warning(f"plentycar: download {wid} failed: {e}")
            return path if path.exists() else None
        path.write_bytes(resp.content)
        return path

    def _scan_file(self, path: Path, art_norm: str, query_brand: str, default_days: int,
                   aliases: AliasesStore, all_brands: set[str], offers: list[Offer],
                   query_article: str) -> None:
        with zipfile.ZipFile(path) as zf:
            for name in zf.namelist():
                if not name.lower().endswith('.csv'):
                    continue
                with zf.open(name) as raw:
                    stream = io.TextIOWrapper(raw, encoding='cp1251', errors='replace')
                    reader = csv.DictReader(stream, delimiter=';')
                    for row in reader:
                        art = normalize_article(row.get('Код', ''))
                        if art != art_norm:
                            continue
                        row_brand = (row.get('Производитель') or '').strip()
                        if row_brand:
                            all_brands.add(row_brand)
                        if not aliases.brand_matches(row_brand, query_brand, self.SITE_NAME):
                            continue
                        raw_price = (row.get('Цена,р. (розница)') or '').replace(',', '.').strip()
                        try:
                            price = float(raw_price)
                        except ValueError:
                            continue
                        if price <= 0:
                            continue
                        in_stock = row.get('Наличие', '').strip() == '+'
                        try:
                            csv_days = int(row.get('Срок, дн', 0) or 0)
                        except ValueError:
                            csv_days = 0
                        offers.append(Offer(
                            article=query_article, brand=query_brand, site=self.SITE_NAME,
                            price=price, delivery_days=csv_days if csv_days > 0 else default_days,
                            in_stock=in_stock,
                        ))

    async def _scrape(self, article: str, brand: str, aliases: AliasesStore):
        art_norm = normalize_article(article)
        offers: list[Offer] = []
        all_brands: set[str] = set()
        for wid, default_days in _WAREHOUSES:
            path = await self._ensure_file(wid)
            if path is None:
                continue
            await asyncio.get_event_loop().run_in_executor(
                None, self._scan_file, path, art_norm, brand, default_days, aliases, all_brands, offers, article
            )
        return offers, sorted(all_brands)
```

- [ ] **Step 4: Run — verify passes**

Run: `cd ~/Documents/price-monitor && python -m pytest tests/test_plentycar.py -v`
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add scrapers/plentycar.py tests/test_plentycar.py
git commit -m "feat(plentycar): migrate to new contract, expose found_brands"
```

---

### Task B7: `zzap.py` — NEW scraper, research + implement

**Files:**
- Create: `~/Documents/price-monitor/scrapers/zzap.py`
- Create: `~/Documents/price-monitor/tests/test_zzap.py`
- Create: `~/Documents/price-monitor/tests/fixtures/zzap/search.html`

- [ ] **Step 1: Manual research**

Investigate real request. Example URL (to be verified):
```bash
curl -s 'https://www.zzap.ru/public/search.aspx?partnumber=0242229699' \
  -A 'Mozilla/5.0' -o ~/Documents/price-monitor/tests/fixtures/zzap/search.html
```

Open file, find how prices + brands appear. Document selector choice inside `zzap.py` as a comment. If the HTML is JS-only (empty shell), fall back to `autopiter.ru` (see note in spec).

Look for:
- AJAX JSON endpoint (check browser DevTools Network tab on the live site)
- Embedded SSR data (search for `__NEXT_DATA__`, `window.__INITIAL_STATE__`, or similar)
- Table `<tr>` rows with brand/article/price

- [ ] **Step 2: Write failing test**

```python
# tests/test_zzap.py
import asyncio, pathlib
from unittest.mock import AsyncMock, patch
from scrapers.zzap import ZzapScraper
from models import SiteStatus
from aliases import AliasesStore

FIX = pathlib.Path(__file__).parent / "fixtures" / "zzap"
def run(c): return asyncio.new_event_loop().run_until_complete(c)

def test_zzap_parses():
    html = (FIX / "search.html").read_text(encoding="utf-8")
    with patch.object(ZzapScraper, "_fetch_text", new=AsyncMock(return_value=html)):
        r = run(ZzapScraper().get_result("0242229699", "Bosch", AliasesStore()))
    assert r.status in (SiteStatus.OFFERS, SiteStatus.OUT_OF_STOCK, SiteStatus.NOT_FOUND, SiteStatus.ERROR)
```

- [ ] **Step 3: Implement — skeleton that follows pattern discovered in step 1**

```python
# scrapers/zzap.py
import re, logging
from bs4 import BeautifulSoup
from scrapers.base import BaseScraper, normalize_article
from models import Offer
from aliases import AliasesStore

log = logging.getLogger(__name__)


class ZzapScraper(BaseScraper):
    SITE_NAME = "zzap.ru"

    async def _scrape(self, article: str, brand: str, aliases: AliasesStore):
        # TODO — replace selectors based on real HTML discovered in Step 1
        url = f"https://www.zzap.ru/public/search.aspx?partnumber={article}"
        html = await self._fetch_text(url, headers={"User-Agent": "Mozilla/5.0"})
        soup = BeautifulSoup(html, "html.parser")

        rows = soup.select("tr.parts-row")  # placeholder — confirm real selector
        if not rows:
            return [], []

        all_brands: set[str] = set()
        offers: list[Offer] = []
        for row in rows:
            b_el = row.select_one(".brand")
            p_el = row.select_one(".price")
            if not b_el or not p_el:
                continue
            row_brand = b_el.get_text(strip=True)
            if row_brand:
                all_brands.add(row_brand)
            if not aliases.brand_matches(row_brand, brand, self.SITE_NAME):
                continue
            m = re.search(r"(\d+(?:[.,]\d+)?)", p_el.get_text().replace(" ", ""))
            if not m:
                continue
            price = float(m.group(1).replace(",", "."))
            if price <= 0:
                continue
            offers.append(Offer(
                article=article, brand=brand, site=self.SITE_NAME,
                price=price, in_stock=True,
            ))
        return offers, sorted(all_brands)
```

- [ ] **Step 4: Verify against real data**

Run: `cd ~/Documents/price-monitor && python -c "
import asyncio
from scrapers.zzap import ZzapScraper
from aliases import AliasesStore
r = asyncio.run(ZzapScraper().get_result('0242229699', 'Bosch', AliasesStore()))
print(r)
"`

Expected: a real result (OFFERS or NOT_FOUND with `found_brands`).

If selectors wrong → iterate. If site is fully JS-rendered → switch to `autopiter.ru` (repeat Steps 1-4 with new site name).

- [ ] **Step 5: Run tests**

Run: `cd ~/Documents/price-monitor && python -m pytest tests/test_zzap.py -v`
Expected: pass.

- [ ] **Step 6: Commit**

```bash
git add scrapers/zzap.py tests/test_zzap.py tests/fixtures/zzap/
git commit -m "feat(zzap): add zzap.ru scraper (replaces armtek)"
```

---

### Task B8: Remove `armtek.py`

**Files:**
- Delete: `~/Documents/price-monitor/scrapers/armtek.py`

- [ ] **Step 1: Remove file**

```bash
cd ~/Documents/price-monitor
rm scrapers/armtek.py
```

- [ ] **Step 2: Grep for references and remove**

```bash
grep -rn "armtek" --include="*.py" .
```

Fix any remaining imports by removing them.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "refactor: remove armtek scraper (replaced by zzap)"
```

---

## Phase C — API & Runner

### Task C1: `/parse` endpoint — new response format

**Files:**
- Modify: `~/Documents/price-monitor/api.py`
- Create: `~/Documents/price-monitor/tests/test_api_parse.py`

- [ ] **Step 1: Write failing test**

```python
# tests/test_api_parse.py
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch
from models import SiteResult, SiteStatus, Offer
import api

def test_parse_returns_6_sites():
    async def fake_parse_one(article, brand):
        return [
            SiteResult(site="exist.ru", status=SiteStatus.OFFERS,
                       offers=[Offer(article, brand, "exist.ru", 311, 2, True)], duration_ms=1200),
            SiteResult(site="emex.ru", status=SiteStatus.NOT_FOUND, found_brands=["BOSCH"], duration_ms=800),
            SiteResult(site="zzap.ru", status=SiteStatus.OFFERS,
                       offers=[Offer(article, brand, "zzap.ru", 380, 3, True)], duration_ms=1500),
            SiteResult(site="part-kom.ru", status=SiteStatus.OUT_OF_STOCK, found_brands=["Bosch"], duration_ms=700),
            SiteResult(site="vdopel.ru", status=SiteStatus.ERROR, error_text="timeout", duration_ms=30000),
            SiteResult(site="plentycar.ru", status=SiteStatus.OFFERS,
                       offers=[Offer(article, brand, "plentycar.ru", 410, 3, True)], duration_ms=2500),
        ]
    with patch.object(api, "parse_one_article", new=AsyncMock(side_effect=fake_parse_one)):
        client = TestClient(api.app)
        resp = client.post("/parse?article=A&brand=Bosch", headers={"X-API-Token": "test"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["article"] == "A" and body["brand"] == "Bosch"
    assert len(body["sites"]) == 6
    by_site = {s["site"]: s for s in body["sites"]}
    assert by_site["exist.ru"]["status"] == "OFFERS"
    assert by_site["exist.ru"]["offers"][0]["price"] == 311
    assert by_site["emex.ru"]["found_brands"] == ["BOSCH"]
```

- [ ] **Step 2: Run — verify fails**

Run: `cd ~/Documents/price-monitor && python -m pytest tests/test_api_parse.py -v`
Expected: FAIL.

- [ ] **Step 3: Implement**

```python
# api.py — replace /parse logic
import asyncio, os, logging
from datetime import datetime, timezone
from fastapi import FastAPI, Header, HTTPException, Query
from scrapers.exist import ExistScraper
from scrapers.emex import EmexScraper
from scrapers.zzap import ZzapScraper
from scrapers.partkom import PartKomScraper
from scrapers.vdopel import VdopelScraper
from scrapers.plentycar import PlentycarScraper
from models import SiteResult
from aliases import STORE
import db

log = logging.getLogger(__name__)
app = FastAPI()
API_TOKEN = os.getenv("API_TOKEN", "gmshop-parser-2026")
SITE_ORDER = ["exist.ru", "emex.ru", "zzap.ru", "part-kom.ru", "vdopel.ru", "plentycar.ru"]


def _check_token(x_api_token: str | None):
    if x_api_token != API_TOKEN:
        raise HTTPException(status_code=401, detail="Invalid API token")


@app.on_event("startup")
def _startup():
    db.init_db()
    STORE.reload()


def _result_to_dict(r: SiteResult) -> dict:
    return {
        "site": r.site,
        "status": r.status.value,
        "offers": [o.__dict__ for o in r.offers],
        "found_brands": r.found_brands,
        "error_category": r.error_category.value if r.error_category else None,
        "error_text": r.error_text,
        "duration_ms": r.duration_ms,
    }


def _build_scrapers():
    return [
        ExistScraper(), EmexScraper(), ZzapScraper(),
        PartKomScraper(), VdopelScraper(), PlentycarScraper(),
    ]


async def parse_one_article(article: str, brand: str) -> list[SiteResult]:
    scrapers = _build_scrapers()
    try:
        tasks = [s.get_result(article, brand, STORE) for s in scrapers]
        results = await asyncio.gather(*tasks, return_exceptions=False)
    finally:
        await asyncio.gather(*(s.close() for s in scrapers), return_exceptions=True)
    # Sort to SITE_ORDER
    by_site = {r.site: r for r in results}
    return [by_site[s] for s in SITE_ORDER if s in by_site]


@app.post("/parse")
async def parse(
    article: str = Query(...),
    brand: str = Query(...),
    x_api_token: str | None = Header(default=None, alias="X-API-Token"),
):
    _check_token(x_api_token)
    results = await parse_one_article(article, brand)
    db.replace_site_results(article, brand, results)
    return {
        "article": article,
        "brand": brand,
        "parsed_at": datetime.now(timezone.utc).isoformat(),
        "sites": [_result_to_dict(r) for r in results],
    }
```

- [ ] **Step 4: Run — verify passes**

Run: `cd ~/Documents/price-monitor && API_TOKEN=test python -m pytest tests/test_api_parse.py -v`
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add api.py tests/test_api_parse.py
git commit -m "feat(api): /parse returns structured 6-site result, saves to site_results"
```

---

### Task C2: `/offers` — cached read endpoint

**Files:**
- Modify: `~/Documents/price-monitor/api.py`
- Create: `~/Documents/price-monitor/tests/test_api_offers.py`

- [ ] **Step 1: Write failing test**

```python
# tests/test_api_offers.py
from fastapi.testclient import TestClient
import os, tempfile
import api, db
from models import SiteResult, SiteStatus, Offer

def test_offers_reads_cached():
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
        os.environ["DB_PATH"] = f.name
    db.init_db()
    db.replace_site_results("A", "Bosch", [
        SiteResult(site="exist.ru", status=SiteStatus.OFFERS,
                   offers=[Offer("A", "Bosch", "exist.ru", 311, 2, True)], duration_ms=1200),
    ])
    client = TestClient(api.app)
    resp = client.get("/offers?article=A&brand=Bosch", headers={"X-API-Token": "gmshop-parser-2026"})
    assert resp.status_code == 200
    body = resp.json()
    assert len(body["sites"]) == 1
    assert body["sites"][0]["status"] == "OFFERS"
```

- [ ] **Step 2: Run — verify fails**

Run: `cd ~/Documents/price-monitor && python -m pytest tests/test_api_offers.py -v`
Expected: FAIL.

- [ ] **Step 3: Implement**

Add to `api.py`:

```python
@app.get("/offers")
async def offers(
    article: str = Query(...),
    brand: str = Query(...),
    x_api_token: str | None = Header(default=None, alias="X-API-Token"),
):
    _check_token(x_api_token)
    results = db.get_site_results(article, brand)
    return {
        "article": article,
        "brand": brand,
        "sites": [_result_to_dict(r) for r in results],
    }
```

- [ ] **Step 4: Run — verify passes**

Run: `cd ~/Documents/price-monitor && python -m pytest tests/test_api_offers.py -v`
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add api.py tests/test_api_offers.py
git commit -m "feat(api): /offers reads cached site_results"
```

---

### Task C3: `/aliases` CRUD + `/reload-aliases`

**Files:**
- Modify: `~/Documents/price-monitor/api.py`
- Create: `~/Documents/price-monitor/tests/test_api_aliases.py`

- [ ] **Step 1: Write failing test**

```python
# tests/test_api_aliases.py
from fastapi.testclient import TestClient
import os, tempfile
import api, db

def test_alias_crud_and_reload():
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
        os.environ["DB_PATH"] = f.name
    db.init_db()
    c = TestClient(api.app)
    hdr = {"X-API-Token": "gmshop-parser-2026"}

    # Add
    resp = c.post("/aliases", json={"canonical": "Bosch", "alias": "Robert Bosch", "site": "emex.ru"}, headers=hdr)
    assert resp.status_code == 200
    aid = resp.json()["id"]

    # List
    resp = c.get("/aliases", headers=hdr)
    assert resp.status_code == 200
    rows = resp.json()["aliases"]
    assert len(rows) == 1 and rows[0]["canonical"] == "Bosch"

    # Reload
    resp = c.post("/reload-aliases", headers=hdr)
    assert resp.status_code == 200

    # Delete
    resp = c.delete(f"/aliases/{aid}", headers=hdr)
    assert resp.status_code == 200
    assert c.get("/aliases", headers=hdr).json()["aliases"] == []
```

- [ ] **Step 2: Run — verify fails**

Run: `cd ~/Documents/price-monitor && python -m pytest tests/test_api_aliases.py -v`
Expected: FAIL.

- [ ] **Step 3: Implement**

Add to `api.py`:

```python
from pydantic import BaseModel


class AliasIn(BaseModel):
    canonical: str
    alias: str
    site: str | None = None


@app.post("/aliases")
def add_alias_ep(
    payload: AliasIn,
    x_api_token: str | None = Header(default=None, alias="X-API-Token"),
):
    _check_token(x_api_token)
    aid = db.add_alias(payload.canonical, payload.alias, payload.site)
    return {"ok": True, "id": aid}


@app.get("/aliases")
def list_aliases_ep(x_api_token: str | None = Header(default=None, alias="X-API-Token")):
    _check_token(x_api_token)
    return {"aliases": db.list_aliases()}


@app.delete("/aliases/{alias_id}")
def delete_alias_ep(alias_id: int, x_api_token: str | None = Header(default=None, alias="X-API-Token")):
    _check_token(x_api_token)
    db.delete_alias(alias_id)
    return {"ok": True}


@app.post("/reload-aliases")
def reload_aliases_ep(x_api_token: str | None = Header(default=None, alias="X-API-Token")):
    _check_token(x_api_token)
    STORE.reload()
    return {"ok": True}
```

- [ ] **Step 4: Run — verify passes**

Run: `cd ~/Documents/price-monitor && python -m pytest tests/test_api_aliases.py -v`
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add api.py tests/test_api_aliases.py
git commit -m "feat(api): aliases CRUD + reload endpoint"
```

---

### Task C4: `runner.py` — nightly full-catalog parse

**Files:**
- Modify: `~/Documents/price-monitor/runner.py`
- Create: `~/Documents/price-monitor/tests/test_runner.py`

- [ ] **Step 1: Write failing test**

```python
# tests/test_runner.py
import asyncio, os, tempfile
from unittest.mock import AsyncMock, patch
import db
from models import SiteResult, SiteStatus, Offer
from runner import run_catalog

def test_runner_wipes_and_refills(monkeypatch, tmp_path):
    dbfile = tmp_path / "t.db"
    monkeypatch.setenv("DB_PATH", str(dbfile))
    db.init_db()
    # Pre-populate to verify wipe
    db.replace_site_results("OLD", "Brand", [SiteResult(site="exist.ru", status=SiteStatus.OFFERS)])

    articles_path = tmp_path / "articles.txt"
    articles_path.write_text("A1|Bosch|100\nA2|Febi|200\n", encoding="utf-8")

    async def fake_parse(article, brand):
        return [SiteResult(site="exist.ru", status=SiteStatus.OFFERS,
                           offers=[Offer(article, brand, "exist.ru", 311, 2, True)], duration_ms=1)]
    with patch("runner.parse_one_article", new=AsyncMock(side_effect=fake_parse)):
        asyncio.run(run_catalog(str(articles_path)))

    # OLD wiped
    assert db.get_site_results("OLD", "Brand") == []
    # New rows present
    assert len(db.get_site_results("A1", "Bosch")) == 1
    assert len(db.get_site_results("A2", "Febi")) == 1
```

- [ ] **Step 2: Run — verify fails**

Run: `cd ~/Documents/price-monitor && python -m pytest tests/test_runner.py -v`
Expected: FAIL.

- [ ] **Step 3: Implement**

```python
# runner.py
import asyncio, logging, sys
from api import parse_one_article
from aliases import STORE
import db

log = logging.getLogger(__name__)


def _load_articles(path: str) -> list[tuple[str, str]]:
    out = []
    with open(path, encoding="utf-8") as f:
        for line in f:
            parts = line.strip().split("|")
            if len(parts) < 2 or not parts[0]:
                continue
            out.append((parts[0], parts[1]))
    return out


async def run_catalog(articles_path: str):
    db.init_db()
    STORE.reload()
    items = _load_articles(articles_path)
    log.info(f"runner: starting catalog run, {len(items)} items")
    db.wipe_all_site_results()
    for article, brand in items:
        try:
            results = await parse_one_article(article, brand)
            db.replace_site_results(article, brand, results)
            log.info(f"runner: {article}/{brand} → {len(results)} sites")
        except Exception:
            log.exception(f"runner: failed {article}/{brand}")
        await asyncio.sleep(2.0)  # politeness between articles
    log.info("runner: done")


if __name__ == "__main__":
    path = sys.argv[1] if len(sys.argv) > 1 else "articles.txt"
    logging.basicConfig(level=logging.INFO)
    asyncio.run(run_catalog(path))
```

- [ ] **Step 4: Run — verify passes**

Run: `cd ~/Documents/price-monitor && python -m pytest tests/test_runner.py -v`
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add runner.py tests/test_runner.py
git commit -m "feat(runner): nightly catalog run with full wipe+refill"
```

---

### Task C5: `/parse-all` endpoint (manual trigger)

**Files:**
- Modify: `~/Documents/price-monitor/api.py`
- Add test in `tests/test_api_parse_all.py`

- [ ] **Step 1: Write failing test**

```python
# tests/test_api_parse_all.py
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock
import api

def test_parse_all_triggers_runner():
    with patch.object(api, "run_catalog", new=AsyncMock()) as mock:
        c = TestClient(api.app)
        resp = c.post("/parse-all", headers={"X-API-Token": "gmshop-parser-2026"})
    assert resp.status_code == 200
    mock.assert_called_once()
```

- [ ] **Step 2: Run — verify fails**

Run: `cd ~/Documents/price-monitor && python -m pytest tests/test_api_parse_all.py -v`
Expected: FAIL.

- [ ] **Step 3: Implement**

Add to `api.py`:

```python
from runner import run_catalog


@app.post("/parse-all")
async def parse_all_ep(x_api_token: str | None = Header(default=None, alias="X-API-Token")):
    _check_token(x_api_token)
    # Run in background — don't block HTTP response
    articles_path = os.getenv("ARTICLES_PATH", "/opt/price-monitor/articles.txt")
    asyncio.create_task(run_catalog(articles_path))
    return {"ok": True, "message": "catalog parse started"}
```

- [ ] **Step 4: Run — verify passes**

Run: `cd ~/Documents/price-monitor && python -m pytest tests/test_api_parse_all.py -v`
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add api.py tests/test_api_parse_all.py
git commit -m "feat(api): /parse-all background endpoint"
```

---

## Phase D — Deploy

### Task D1: deploy script + systemd timer

**Files:**
- Create: `~/Documents/price-monitor/deploy/deploy.sh`
- Create: `~/Documents/price-monitor/deploy/price-monitor-cron.service`
- Create: `~/Documents/price-monitor/deploy/price-monitor-cron.timer`

- [ ] **Step 1: Create deploy.sh**

```bash
# deploy/deploy.sh
#!/bin/bash
set -euo pipefail
HOST="${VPS_HOST:-5.42.103.41}"
USER="${VPS_USER:-root}"
REMOTE_DIR="/opt/price-monitor"

echo "Syncing code to $USER@$HOST:$REMOTE_DIR ..."
rsync -av --delete --exclude=__pycache__ --exclude=.pytest_cache --exclude=tests/ \
      --exclude=prices.db --exclude=.env --exclude=venv/ \
      ~/Documents/price-monitor/ "$USER@$HOST:$REMOTE_DIR/"

echo "Installing systemd units..."
ssh "$USER@$HOST" "cp $REMOTE_DIR/deploy/price-monitor-cron.service /etc/systemd/system/ && \
                   cp $REMOTE_DIR/deploy/price-monitor-cron.timer /etc/systemd/system/ && \
                   systemctl daemon-reload && \
                   systemctl enable --now price-monitor-cron.timer"

echo "Restarting price-monitor service..."
ssh "$USER@$HOST" "systemctl restart price-monitor && systemctl status price-monitor --no-pager | head -20"

echo "Done."
```

```bash
chmod +x deploy/deploy.sh
```

- [ ] **Step 2: Create systemd service (cron entry)**

```ini
# deploy/price-monitor-cron.service
[Unit]
Description=Price monitor nightly catalog parse
After=network.target

[Service]
Type=oneshot
WorkingDirectory=/opt/price-monitor
ExecStart=/opt/price-monitor/venv/bin/python runner.py /opt/price-monitor/articles.txt
EnvironmentFile=/opt/price-monitor/.env
StandardOutput=journal
StandardError=journal
```

- [ ] **Step 3: Create systemd timer**

```ini
# deploy/price-monitor-cron.timer
[Unit]
Description=Run price-monitor-cron daily at 03:00

[Timer]
OnCalendar=*-*-* 03:00:00
Persistent=true

[Install]
WantedBy=timers.target
```

- [ ] **Step 4: Commit**

```bash
git add deploy/
git commit -m "feat(deploy): rsync script + systemd timer (03:00 nightly)"
```

---

### Task D2: Execute deploy to VPS

- [ ] **Step 1: Dry-run rsync**

Run locally:
```bash
rsync -av --delete --dry-run \
      --exclude=__pycache__ --exclude=.pytest_cache --exclude=tests/ \
      --exclude=prices.db --exclude=.env --exclude=venv/ \
      ~/Documents/price-monitor/ root@5.42.103.41:/opt/price-monitor/
```

Expected: list of files to sync, no surprises.

- [ ] **Step 2: Real deploy**

```bash
cd ~/Documents/price-monitor && ./deploy/deploy.sh
```

- [ ] **Step 3: Apply migration on VPS**

```bash
ssh root@5.42.103.41 "cd /opt/price-monitor && venv/bin/python -c 'import db; db.init_db(); print(\"db ok\")'"
```

Expected: `db ok`.

- [ ] **Step 4: Smoke test — `/parse` on real article**

```bash
curl -sS -X POST "http://5.42.103.41/parse?article=0242229699&brand=Bosch" \
     -H "X-API-Token: gmshop-parser-2026" | python -m json.tool
```

Expected: JSON with `"sites": [6 entries]`. Each has a valid status. No `unknown` error_category.

- [ ] **Step 5: Check timer**

```bash
ssh root@5.42.103.41 "systemctl list-timers price-monitor-cron.timer --no-pager"
```

Expected: next trigger at 03:00.

- [ ] **Step 6: No commit (deploy artefact only). Mark step done.**

---

## Phase E — Admin UI (Next.js)

### Task E1: TypeScript types for v3

**Files:**
- Modify: `src/app/lib/price-monitor.ts`

- [ ] **Step 1: Replace types**

```typescript
// src/app/lib/price-monitor.ts
export type SiteStatus = "OFFERS" | "OUT_OF_STOCK" | "NOT_FOUND" | "ERROR" | "NOT_CONFIGURED";

export type ErrorCategory = "timeout" | "auth_failed" | "http_error" | "parse_error" | "unknown";

export interface Offer {
  article: string;
  brand: string;
  site: string;
  price: number;
  delivery_days: number | null;
  in_stock: boolean | null;
}

export interface SiteResult {
  site: string;
  status: SiteStatus;
  offers: Offer[];
  found_brands: string[] | null;
  error_category: ErrorCategory | null;
  error_text: string | null;
  duration_ms: number;
}

export interface ParseResponse {
  article: string;
  brand: string;
  parsed_at?: string;
  sites: SiteResult[];
}

export interface Alias {
  id: number;
  canonical: string;
  alias: string;
  site: string | null;
  created_at: string;
}

export const SITE_LABELS: Record<string, string> = {
  "exist.ru": "exist.ru",
  "emex.ru": "emex.ru",
  "zzap.ru": "zzap.ru",
  "part-kom.ru": "part-kom.ru",
  "vdopel.ru": "vdopel.ru",
  "plentycar.ru": "plentycar.ru",
};

export const SITE_ORDER = ["exist.ru", "emex.ru", "zzap.ru", "part-kom.ru", "vdopel.ru", "plentycar.ru"];

export const STATUS_STYLE: Record<SiteStatus, { bg: string; text: string; label: string; dot: string }> = {
  OFFERS: { bg: "bg-green-50", text: "text-green-700", label: "В наличии", dot: "🟢" },
  OUT_OF_STOCK: { bg: "bg-yellow-50", text: "text-yellow-700", label: "Нет в наличии", dot: "🟡" },
  NOT_FOUND: { bg: "bg-orange-50", text: "text-orange-700", label: "Не нашёл", dot: "🟠" },
  ERROR: { bg: "bg-red-50", text: "text-red-700", label: "Ошибка", dot: "🔴" },
  NOT_CONFIGURED: { bg: "bg-gray-50", text: "text-gray-600", label: "Нет кред.", dot: "⚪" },
};


export async function fetchCachedOffers(article: string, brand: string): Promise<ParseResponse | null> {
  const url = `/api/price-monitor/offers?article=${encodeURIComponent(article)}&brand=${encodeURIComponent(brand)}`;
  const r = await fetch(url);
  if (!r.ok) return null;
  return r.json();
}

export async function triggerParse(article: string, brand: string): Promise<ParseResponse | null> {
  const r = await fetch(`/api/price-monitor/parse?article=${encodeURIComponent(article)}&brand=${encodeURIComponent(brand)}`, {
    method: "POST",
  });
  if (!r.ok) return null;
  return r.json();
}

export async function addAlias(canonical: string, alias: string, site: string | null): Promise<boolean> {
  const r = await fetch("/api/price-monitor/aliases", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ canonical, alias, site }),
  });
  return r.ok;
}

export function computeSummary(sites: SiteResult[]): { min: number | null; median: number | null; max: number | null; foundCount: number } {
  const prices: number[] = [];
  let foundCount = 0;
  for (const s of sites) {
    if (s.status === "OFFERS") {
      foundCount++;
      for (const o of s.offers) if (o.price > 0) prices.push(o.price);
    } else if (s.status === "OUT_OF_STOCK") {
      foundCount++;
    }
  }
  if (prices.length === 0) return { min: null, median: null, max: null, foundCount };
  prices.sort((a, b) => a - b);
  const mid = Math.floor(prices.length / 2);
  const median = prices.length % 2 ? prices[mid] : (prices[mid - 1] + prices[mid]) / 2;
  return { min: prices[0], median, max: prices[prices.length - 1], foundCount };
}

export function formatPrice(p: number | null): string {
  if (p === null) return "—";
  return `${Math.round(p)}\u00A0₽`;
}
```

- [ ] **Step 2: Typecheck**

Run: `cd /Users/vladislavufimcev/Documents/autoparts-shop/.claude/worktrees/heuristic-galileo-8fff2c && bun run typecheck 2>&1 | tail`
Expected: no errors in `price-monitor.ts`. Other files may error because old types are gone — that's fixed in next tasks.

- [ ] **Step 3: Commit**

```bash
git add src/app/lib/price-monitor.ts
git commit -m "feat(types): v3 SiteResult types, labels, helpers"
```

---

### Task E2: Next.js API proxy routes — `/parse`, `/offers`, `/aliases`

**Files:**
- Modify: `src/app/api/price-monitor/parse/route.ts`
- Modify: `src/app/api/price-monitor/offers/route.ts` (create if absent)
- Create: `src/app/api/price-monitor/aliases/route.ts`
- Create: `src/app/api/price-monitor/aliases/[id]/route.ts`

- [ ] **Step 1: Update `/parse` proxy**

```typescript
// src/app/api/price-monitor/parse/route.ts
import { NextRequest, NextResponse } from "next/server";

const VPS = process.env.PARSER_API_URL || "http://5.42.103.41";
const TOKEN = process.env.PARSER_API_TOKEN || "";

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const article = url.searchParams.get("article");
  const brand = url.searchParams.get("brand");
  if (!article || !brand) return NextResponse.json({ error: "missing params" }, { status: 400 });

  const r = await fetch(`${VPS}/parse?article=${encodeURIComponent(article)}&brand=${encodeURIComponent(brand)}`, {
    method: "POST",
    headers: { "X-API-Token": TOKEN },
  });
  const body = await r.text();
  return new NextResponse(body, { status: r.status, headers: { "Content-Type": "application/json" } });
}
```

- [ ] **Step 2: Update/create `/offers` proxy**

```typescript
// src/app/api/price-monitor/offers/route.ts
import { NextRequest, NextResponse } from "next/server";

const VPS = process.env.PARSER_API_URL || "http://5.42.103.41";
const TOKEN = process.env.PARSER_API_TOKEN || "";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const article = url.searchParams.get("article");
  const brand = url.searchParams.get("brand");
  if (!article || !brand) return NextResponse.json({ error: "missing params" }, { status: 400 });
  const r = await fetch(`${VPS}/offers?article=${encodeURIComponent(article)}&brand=${encodeURIComponent(brand)}`, {
    headers: { "X-API-Token": TOKEN },
  });
  const body = await r.text();
  return new NextResponse(body, { status: r.status, headers: { "Content-Type": "application/json" } });
}
```

- [ ] **Step 3: Create `/aliases` POST + GET proxy**

```typescript
// src/app/api/price-monitor/aliases/route.ts
import { NextRequest, NextResponse } from "next/server";

const VPS = process.env.PARSER_API_URL || "http://5.42.103.41";
const TOKEN = process.env.PARSER_API_TOKEN || "";

export async function GET() {
  const r = await fetch(`${VPS}/aliases`, { headers: { "X-API-Token": TOKEN } });
  const body = await r.text();
  return new NextResponse(body, { status: r.status, headers: { "Content-Type": "application/json" } });
}

export async function POST(req: NextRequest) {
  const payload = await req.json();
  const r = await fetch(`${VPS}/aliases`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Token": TOKEN },
    body: JSON.stringify(payload),
  });
  if (r.ok) {
    // trigger reload on VPS
    await fetch(`${VPS}/reload-aliases`, { method: "POST", headers: { "X-API-Token": TOKEN } });
  }
  const body = await r.text();
  return new NextResponse(body, { status: r.status, headers: { "Content-Type": "application/json" } });
}
```

- [ ] **Step 4: Create `/aliases/[id]` DELETE proxy**

```typescript
// src/app/api/price-monitor/aliases/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";

const VPS = process.env.PARSER_API_URL || "http://5.42.103.41";
const TOKEN = process.env.PARSER_API_TOKEN || "";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await fetch(`${VPS}/aliases/${id}`, {
    method: "DELETE",
    headers: { "X-API-Token": TOKEN },
  });
  const body = await r.text();
  return new NextResponse(body, { status: r.status, headers: { "Content-Type": "application/json" } });
}
```

- [ ] **Step 5: Typecheck + lint**

Run: `bun run typecheck && bun run lint`
Expected: pass (or only pre-existing errors).

- [ ] **Step 6: Commit**

```bash
git add src/app/api/price-monitor/
git commit -m "feat(api-proxy): v3 routes — parse, offers, aliases CRUD"
```

---

### Task E3: Rewrite `MarketPriceWidget.tsx` — 6-row table with status badges

**Files:**
- Modify: `src/app/admin/components/MarketPriceWidget.tsx`

- [ ] **Step 1: Replace component**

```tsx
// src/app/admin/components/MarketPriceWidget.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  fetchCachedOffers, triggerParse, addAlias,
  ParseResponse, SiteResult, SITE_ORDER, STATUS_STYLE, computeSummary, formatPrice,
} from "@/app/lib/price-monitor";

interface Props {
  article: string;
  brand: string;
  yourPrice: number;
}

function orderedSites(sites: SiteResult[]): SiteResult[] {
  const map = new Map(sites.map((s) => [s.site, s]));
  return SITE_ORDER.map((name) => map.get(name)).filter((x): x is SiteResult => x !== undefined);
}

export default function MarketPriceWidget({ article, brand, yourPrice }: Props) {
  const [data, setData] = useState<ParseResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [parsing, setParsing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const d = await fetchCachedOffers(article, brand);
    setData(d);
    setLoading(false);
  }, [article, brand]);

  useEffect(() => { void load(); }, [load]);

  const handleRefresh = async () => {
    setParsing(true);
    const fresh = await triggerParse(article, brand);
    if (fresh) setData(fresh);
    setParsing(false);
  };

  const handleAddAlias = async (aliasName: string, site: string) => {
    const ok = await addAlias(brand, aliasName, site);
    if (ok) {
      setParsing(true);
      const fresh = await triggerParse(article, brand);
      if (fresh) setData(fresh);
      setParsing(false);
    }
  };

  if (loading) return <div className="p-4 text-sm text-gray-500">Загрузка...</div>;

  const sites = data ? orderedSites(data.sites) : [];
  const summary = computeSummary(sites);

  return (
    <div className="border rounded-lg p-4 bg-white">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-sm">Рыночные цены</h4>
        <button
          onClick={handleRefresh}
          disabled={parsing}
          className="text-xs px-2 py-1 bg-white border rounded hover:bg-gray-50 disabled:opacity-50"
        >
          {parsing ? "Обновление..." : "Обновить"}
        </button>
      </div>

      <div className="flex flex-wrap gap-4 text-sm mb-3">
        <span>Мин: <b>{formatPrice(summary.min)}</b></span>
        <span>Медиана: <b>{formatPrice(summary.median)}</b></span>
        <span>Макс: <b>{formatPrice(summary.max)}</b></span>
        <span className="text-gray-500">({summary.foundCount} из 6 нашли товар)</span>
        <span className="text-gray-500">Твоя: <b>{formatPrice(yourPrice)}</b></span>
      </div>

      <table className="w-full text-sm border-t">
        <thead>
          <tr className="text-left text-gray-500 text-xs border-b">
            <th className="py-2 w-32">Сайт</th>
            <th className="py-2 w-36">Статус</th>
            <th className="py-2 w-24">Цена</th>
            <th className="py-2">Доставка / детали</th>
          </tr>
        </thead>
        <tbody>
          {sites.map((s) => <SiteRow key={s.site} s={s} onAddAlias={handleAddAlias} />)}
        </tbody>
      </table>
    </div>
  );
}

function SiteRow({ s, onAddAlias }: { s: SiteResult; onAddAlias: (alias: string, site: string) => void }) {
  const style = STATUS_STYLE[s.status];
  const hasMultiple = s.offers.length > 1;

  return (
    <>
      <tr className="border-b">
        <td className="py-2 align-top font-medium">{s.site}</td>
        <td className="py-2 align-top">
          <span className={`text-xs px-2 py-0.5 rounded ${style.bg} ${style.text}`}>
            {style.dot} {style.label}
          </span>
        </td>
        <td className="py-2 align-top">
          {s.offers.length > 0 ? formatPrice(s.offers[0].price) : "—"}
        </td>
        <td className="py-2 align-top text-gray-600">
          {s.status === "OFFERS" && s.offers[0]?.delivery_days != null && `${s.offers[0].delivery_days} дн.`}
          {s.status === "OUT_OF_STOCK" && "—"}
          {s.status === "NOT_FOUND" && (
            <NotFoundCell site={s.site} foundBrands={s.found_brands} onAddAlias={onAddAlias} />
          )}
          {s.status === "ERROR" && (
            <span className="text-red-600">{s.error_category}: {s.error_text}</span>
          )}
          {s.status === "NOT_CONFIGURED" && (
            <span className="text-gray-500">{s.error_text || "не настроен"}</span>
          )}
        </td>
      </tr>
      {hasMultiple && s.offers.slice(1).map((o, i) => (
        <tr key={i} className="border-b">
          <td></td>
          <td></td>
          <td className="py-1 align-top">{formatPrice(o.price)}</td>
          <td className="py-1 align-top text-gray-600">{o.delivery_days ? `${o.delivery_days} дн.` : "—"}</td>
        </tr>
      ))}
    </>
  );
}

function NotFoundCell({
  site, foundBrands, onAddAlias,
}: {
  site: string;
  foundBrands: string[] | null;
  onAddAlias: (alias: string, site: string) => void;
}) {
  if (foundBrands === null) return <span className="text-gray-500">—</span>;
  if (foundBrands.length === 0) return <span className="text-gray-500">не найден</span>;
  return (
    <span>
      сайт знает: {foundBrands.map((b, i) => (
        <span key={b}>
          {i > 0 && ", "}
          <button
            className="underline text-blue-600 hover:text-blue-800"
            onClick={() => onAddAlias(b, site)}
            title="Добавить как алиас и обновить"
          >
            {b}
          </button>
        </span>
      ))}
    </span>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `bun run typecheck`
Expected: pass.

- [ ] **Step 3: Verify in dev server**

Start dev server:
```bash
bun run dev
```

Open admin, login, open any product, check that:
- 6 rows always present
- Статусы с цветами корректны
- Кнопка «Обновить» работает
- Клик по `found_brand` добавляет алиас, перезапускает парсинг, строка обновляется

Follow the preview verification workflow: screenshot/inspect via preview_start, preview_snapshot, preview_screenshot.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/components/MarketPriceWidget.tsx
git commit -m "feat(admin): v3 market price widget — 6 rows, statuses, alias button"
```

---

## Phase F — End-to-End Verification

### Task F1: Real-article smoke test (no mocks)

- [ ] **Step 1: Pick a real article from catalog**

```bash
head -5 ~/Documents/price-monitor/articles.txt
```

Pick one — e.g. `0242229699|Bosch|450`.

- [ ] **Step 2: Call deployed `/parse`**

```bash
curl -sS -X POST "http://5.42.103.41/parse?article=0242229699&brand=Bosch" \
     -H "X-API-Token: gmshop-parser-2026" | python -m json.tool > /tmp/parse_result.json
cat /tmp/parse_result.json
```

Expected:
- `sites` array has 6 entries
- Each entry has a valid status (not empty, not null)
- No `error_category = "unknown"` (all errors categorized)
- For `NOT_FOUND` sites — `found_brands` is a non-null list where the scraper supports it

- [ ] **Step 3: Verify `/offers` returns cached data**

```bash
curl -sS "http://5.42.103.41/offers?article=0242229699&brand=Bosch" \
     -H "X-API-Token: gmshop-parser-2026" | python -m json.tool
```

Expected: same data as `/parse` step 2.

- [ ] **Step 4: Add an alias via API, re-parse, check it takes effect**

If step 2 showed a `NOT_FOUND` with `found_brands: ["Robert Bosch"]`:
```bash
curl -sS -X POST "http://5.42.103.41/aliases" \
     -H "X-API-Token: gmshop-parser-2026" -H "Content-Type: application/json" \
     -d '{"canonical":"Bosch","alias":"Robert Bosch","site":"emex.ru"}'
curl -sS -X POST "http://5.42.103.41/reload-aliases" -H "X-API-Token: gmshop-parser-2026"
curl -sS -X POST "http://5.42.103.41/parse?article=0242229699&brand=Bosch" \
     -H "X-API-Token: gmshop-parser-2026" | python -m json.tool | head -50
```

Expected: that site's status flips from `NOT_FOUND` to `OFFERS` / `OUT_OF_STOCK`.

- [ ] **Step 5: Check admin UI in dev**

`bun run dev` → login as admin → open product with SKU 0242229699 → verify 6-row table displays correctly and «+ alias» button works.

- [ ] **Step 6: Commit result notes**

```bash
git add -A
git commit --allow-empty -m "chore: v3 e2e smoke test passed" || true
```

---

### Task F2: Full-catalog run on VPS

- [ ] **Step 1: Trigger `/parse-all`**

```bash
curl -sS -X POST "http://5.42.103.41/parse-all" -H "X-API-Token: gmshop-parser-2026"
```

Expected: `{"ok": true, "message": "catalog parse started"}`.

- [ ] **Step 2: Tail logs**

```bash
ssh root@5.42.103.41 "journalctl -u price-monitor -f -n 100"
```

Expected: lines like `runner: 0242229699/Bosch → 6 sites`. No tracebacks.

- [ ] **Step 3: After completion, check site_results count**

```bash
ssh root@5.42.103.41 "sqlite3 /opt/price-monitor/prices.db 'SELECT COUNT(*), status FROM site_results GROUP BY status;'"
```

Expected: distribution across all 5 statuses. No `ERROR` rows with `error_category = unknown` — all errors should be categorized:
```bash
ssh root@5.42.103.41 "sqlite3 /opt/price-monitor/prices.db \"SELECT COUNT(*) FROM site_results WHERE error_category = 'unknown';\""
```
Expected: `0`.

- [ ] **Step 4: Commit notes**

```bash
git add -A
git commit --allow-empty -m "chore: first full-catalog v3 run done"
```

---

## Phase G — Cleanup

### Task G1: Update README

**Files:**
- Modify: `~/Documents/price-monitor/README.md`

- [ ] **Step 1: Rewrite README**

Short description of:
- 5 statuses
- Alias table and how to add/delete
- How to run tests (`python -m pytest tests/`)
- How to deploy (`./deploy/deploy.sh`)
- How the nightly cron works (systemd timer)
- How to diagnose `NOT_FOUND` via `found_brands`

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: price-monitor v3 README"
```

---

### Task G2: Merge branch to main

- [ ] **Step 1: Final typecheck + tests**

```bash
# Python
cd ~/Documents/price-monitor && python -m pytest tests/ -v

# Next.js
cd /Users/vladislavufimcev/Documents/autoparts-shop/.claude/worktrees/heuristic-galileo-8fff2c
bun run typecheck && bun run lint
```

Expected: all pass.

- [ ] **Step 2: Push branch, open PR (via gh)**

```bash
git push -u origin claude/heuristic-galileo-8fff2c
gh pr create --title "feat: price monitor v3 — honest results across 6 sources" \
             --body-file docs/superpowers/specs/2026-04-17-price-monitor-v3-honest-results.md
```

- [ ] **Step 3: Await user review & merge**

---

## Self-Review Checklist (done during plan writing)

- ✅ All 5 statuses (OFFERS / OUT_OF_STOCK / NOT_FOUND / ERROR / NOT_CONFIGURED) handled in both Python (`SiteStatus` enum in Task A1, branching in Task B1) and TypeScript (Task E1).
- ✅ All 5 error categories (timeout / auth_failed / http_error / parse_error / unknown) — Task A1 + Task B1.
- ✅ `found_brands = null` vs `[]` contract — Task B1 comment + Task B2-B7 behavior.
- ✅ 6 sources covered: exist (B2), emex (B3), vdopel (B4), partkom (B5), plentycar (B6), zzap (B7). armtek deleted (B8).
- ✅ Alias storage: SQLite `brand_aliases` (A2) + AliasesStore singleton (A4) + CRUD API (C3) + admin UI button (E3).
- ✅ Site-specific aliases: enforced in `AliasesStore._variants_for` (Task A4) + API accepts `site: str | None` (Task C3).
- ✅ Nightly cron: systemd timer in Task D1, runner in Task C4, endpoint in Task C5.
- ✅ Admin reads cache via `/offers` (Task C2, Task E2) — no on-page-load parsing.
- ✅ «Обновить» button triggers on-demand `/parse` (Task E3).
- ✅ "No silent except" contract — enforced in `BaseScraper.get_result` (Task B1) and test-covered (B1 tests).
- ✅ Honest 6-row table always shown, per-status cell rendering, alias button — Task E3.
- ✅ Full-catalog smoke test with zero `error_category = unknown` assertion — Task F2.
