# Price Monitor v3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Добавить 5 честных статусов на сайт + редактируемый словарь алиасов + таблицу 5 строк в UI — БЕЗ переписывания существующих скраперов и ночного cron.

**Архитектура:** Wrapper-подход. Новый метод `get_site_result()` оборачивает существующий `get_offers()`, ловит исключения, категоризирует, возвращает `SiteResult`. Словарь алиасов — в БД + хардкод как fallback. Новые эндпоинты параллельно со старыми. Откат = удалить новое, старое работает.

**Tech Stack:** Python 3.11 + FastAPI + httpx + SQLite (парсер на VPS). Next.js 15 + Drizzle + Tailwind (админка).

---

## Фаза 1 — БД и модели

### Задача 1: Миграция `brand_aliases`

**Files:**
- Modify: `~/Documents/price-monitor/db.py`
- Create: `~/Documents/price-monitor/tests/test_brand_aliases.py`

- [ ] **Step 1: Failing тест**

```python
from db import init_db, add_alias, get_aliases, delete_alias
import tempfile, os

def test_add_and_list(monkeypatch):
    monkeypatch.setenv("DB_PATH", tempfile.mktemp())
    init_db()
    aid = add_alias(canonical="Bosch", alias="Robert Bosch", site="emex.ru")
    assert aid > 0
    rows = get_aliases()
    assert len(rows) == 1 and rows[0]["canonical"] == "Bosch"

def test_delete(monkeypatch):
    monkeypatch.setenv("DB_PATH", tempfile.mktemp())
    init_db()
    aid = add_alias("Delphi", "DELPHI", None)
    delete_alias(aid)
    assert get_aliases() == []
```

- [ ] **Step 2: Запустить — FAIL**

```bash
cd ~/Documents/price-monitor && pytest tests/test_brand_aliases.py -v
```

- [ ] **Step 3: Реализовать в `db.py`**

В `init_db()` добавить:

```python
c.execute("""
    CREATE TABLE IF NOT EXISTS brand_aliases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        canonical TEXT NOT NULL,
        alias TEXT NOT NULL,
        site TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(canonical, alias, site)
    )
""")
c.execute("CREATE INDEX IF NOT EXISTS idx_brand_aliases_alias ON brand_aliases(alias)")
```

И функции:

```python
def add_alias(canonical: str, alias: str, site: str | None) -> int:
    with get_conn() as conn:
        cur = conn.execute(
            "INSERT OR IGNORE INTO brand_aliases (canonical, alias, site) VALUES (?, ?, ?)",
            (canonical, alias, site),
        )
        return cur.lastrowid

def get_aliases() -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT id, canonical, alias, site, created_at FROM brand_aliases"
        ).fetchall()
        return [dict(r) for r in rows]

def delete_alias(alias_id: int) -> None:
    with get_conn() as conn:
        conn.execute("DELETE FROM brand_aliases WHERE id = ?", (alias_id,))
```

- [ ] **Step 4: PASS**

- [ ] **Step 5: Commit**

```bash
git add db.py tests/test_brand_aliases.py
git commit -m "feat(price-monitor): brand_aliases table with CRUD"
```

---

### Задача 2: Миграция `site_results`

**Files:**
- Modify: `~/Documents/price-monitor/db.py`
- Create: `~/Documents/price-monitor/tests/test_site_results.py`

- [ ] **Step 1: Failing тест**

```python
from db import init_db, upsert_site_result, get_site_results
import tempfile

def test_upsert_and_get(monkeypatch):
    monkeypatch.setenv("DB_PATH", tempfile.mktemp())
    init_db()
    upsert_site_result("X", "Y", "exist.ru", "OFFERS",
                       '[{"price":100}]', None, None, None, 500)
    rows = get_site_results("X", "Y")
    assert len(rows) == 1 and rows[0]["status"] == "OFFERS"

def test_upsert_replaces(monkeypatch):
    monkeypatch.setenv("DB_PATH", tempfile.mktemp())
    init_db()
    upsert_site_result("X", "Y", "exist.ru", "OFFERS", "[]", None, None, None, 100)
    upsert_site_result("X", "Y", "exist.ru", "ERROR", None, None, "timeout", "boom", 200)
    rows = get_site_results("X", "Y")
    assert len(rows) == 1 and rows[0]["status"] == "ERROR"
```

- [ ] **Step 2: FAIL**

- [ ] **Step 3: Реализовать**

```python
# в init_db
c.execute("""
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
    )
""")
c.execute("CREATE INDEX IF NOT EXISTS idx_site_results_lookup ON site_results(article, brand)")

def upsert_site_result(article, brand, site, status, offers_json,
                       found_brands_json, error_category, error_text, duration_ms):
    with get_conn() as conn:
        conn.execute("""
            INSERT INTO site_results (article, brand, site, status, offers_json,
                                      found_brands_json, error_category, error_text,
                                      duration_ms, scraped_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            ON CONFLICT(article, brand, site) DO UPDATE SET
                status = excluded.status,
                offers_json = excluded.offers_json,
                found_brands_json = excluded.found_brands_json,
                error_category = excluded.error_category,
                error_text = excluded.error_text,
                duration_ms = excluded.duration_ms,
                scraped_at = excluded.scraped_at
        """, (article, brand, site, status, offers_json, found_brands_json,
              error_category, error_text, duration_ms))

def get_site_results(article: str, brand: str) -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM site_results WHERE article = ? AND brand = ?",
            (article, brand),
        ).fetchall()
        return [dict(r) for r in rows]
```

- [ ] **Step 4: PASS**

- [ ] **Step 5: Commit**

```bash
git add db.py tests/test_site_results.py
git commit -m "feat(price-monitor): site_results table with upsert"
```

---

### Задача 3: Модель `SiteResult`

**Files:**
- Modify: `~/Documents/price-monitor/models.py`
- Create: `~/Documents/price-monitor/tests/test_models.py`

- [ ] **Step 1: Failing тест**

```python
from models import SiteResult, Offer

def test_site_result_to_dict():
    r = SiteResult(
        site="exist.ru", status="OFFERS",
        offers=[Offer(article="X", brand="Y", site="exist.ru",
                      price=100, delivery_days=2, in_stock=True, seller_name=None)],
        duration_ms=1000,
    )
    d = r.to_dict()
    assert d["site"] == "exist.ru"
    assert d["status"] == "OFFERS"
    assert len(d["offers"]) == 1 and d["offers"][0]["price"] == 100
```

- [ ] **Step 2: FAIL**

- [ ] **Step 3: Реализовать в `models.py`**

```python
from dataclasses import dataclass, field, asdict
from typing import Literal

Status = Literal["OFFERS", "OUT_OF_STOCK", "NOT_FOUND", "ERROR", "NOT_CONFIGURED"]
ErrorCategory = Literal["timeout", "http_error", "auth_failed", "parse_error", "unknown"]

@dataclass
class SiteResult:
    site: str
    status: Status
    offers: list = field(default_factory=list)
    found_brands: list[str] | None = None
    error_category: ErrorCategory | None = None
    error_text: str | None = None
    duration_ms: int = 0

    def to_dict(self) -> dict:
        return {
            "site": self.site,
            "status": self.status,
            "offers": [asdict(o) for o in self.offers],
            "found_brands": self.found_brands,
            "error_category": self.error_category,
            "error_text": self.error_text,
            "duration_ms": self.duration_ms,
        }
```

- [ ] **Step 4: PASS**

- [ ] **Step 5: Commit**

```bash
git add models.py tests/test_models.py
git commit -m "feat(price-monitor): SiteResult model"
```

---

## Фаза 2 — Расширение BaseScraper

### Задача 4: `brand_matches` с БД-алиасами

**Files:**
- Modify: `~/Documents/price-monitor/scrapers/base.py`
- Create: `~/Documents/price-monitor/tests/test_brand_matches_db.py`

- [ ] **Step 1: Failing тест**

```python
from scrapers.base import brand_matches, load_db_aliases

def test_hardcoded_still_works():
    assert brand_matches("GM OE", "General Motors") is True

def test_default_signature_unchanged():
    assert brand_matches("Bosch", "BOSCH") is True

def test_db_alias_global():
    db = load_db_aliases([{"canonical": "Bosch", "alias": "Robert Bosch", "site": None}])
    assert brand_matches("Robert Bosch", "Bosch", db_aliases=db) is True

def test_db_alias_site_scoped():
    db = load_db_aliases([{"canonical": "GM", "alias": "GM Original", "site": "emex.ru"}])
    assert brand_matches("GM Original", "GM", site="emex.ru", db_aliases=db) is True
    assert brand_matches("GM Original", "GM", site="exist.ru", db_aliases=db) is False
```

- [ ] **Step 2: FAIL**

- [ ] **Step 3: Расширить `brand_matches`**

```python
def brand_matches(site_brand: str, catalog_brand: str,
                  site: str | None = None,
                  db_aliases: dict | None = None) -> bool:
    n_site = normalize_brand(site_brand)
    n_catalog = normalize_brand(catalog_brand)
    if n_site == n_catalog:
        return True
    if n_site in BRAND_ALIASES.get(n_catalog, set()):
        return True
    if n_catalog in BRAND_ALIASES.get(n_site, set()):
        return True
    if db_aliases:
        for alias_site, alias in db_aliases.get(n_catalog, set()):
            if alias == n_site and (alias_site is None or alias_site == site):
                return True
    return False

def load_db_aliases(rows: list[dict]) -> dict:
    out: dict = {}
    for r in rows:
        key = normalize_brand(r["canonical"])
        val = (r["site"], normalize_brand(r["alias"]))
        out.setdefault(key, set()).add(val)
    return out
```

- [ ] **Step 4: PASS**

- [ ] **Step 5: Commit**

```bash
git add scrapers/base.py tests/test_brand_matches_db.py
git commit -m "feat(price-monitor): brand_matches accepts DB aliases"
```

---

### Задача 5: `get_site_result` обёртка на `BaseScraper`

**Files:**
- Modify: `~/Documents/price-monitor/scrapers/base.py`
- Create: `~/Documents/price-monitor/tests/test_get_site_result.py`

- [ ] **Step 1: Failing тест**

```python
import pytest, httpx, json
from unittest.mock import AsyncMock
from scrapers.base import BaseScraper
from models import Offer

class FakeScraper(BaseScraper):
    SITE_NAME = "fake.ru"

@pytest.mark.asyncio
async def test_offers_status():
    s = FakeScraper()
    s.get_offers = AsyncMock(return_value=[
        Offer(article="X", brand="Y", site="fake.ru", price=100,
              delivery_days=1, in_stock=True, seller_name=None)
    ])
    r = await s.get_site_result("X", "Y")
    assert r.status == "OFFERS"

@pytest.mark.asyncio
async def test_out_of_stock():
    s = FakeScraper()
    s.get_offers = AsyncMock(return_value=[
        Offer(article="X", brand="Y", site="fake.ru", price=100,
              delivery_days=1, in_stock=False, seller_name=None)
    ])
    r = await s.get_site_result("X", "Y")
    assert r.status == "OUT_OF_STOCK"

@pytest.mark.asyncio
async def test_not_found():
    s = FakeScraper()
    s.get_offers = AsyncMock(return_value=[])
    r = await s.get_site_result("X", "Y")
    assert r.status == "NOT_FOUND"
    assert r.found_brands is None

@pytest.mark.asyncio
async def test_timeout():
    s = FakeScraper()
    s.get_offers = AsyncMock(side_effect=httpx.TimeoutException("t"))
    r = await s.get_site_result("X", "Y")
    assert r.status == "ERROR" and r.error_category == "timeout"

@pytest.mark.asyncio
async def test_auth_error():
    s = FakeScraper()
    req = httpx.Request("GET", "http://x")
    resp = httpx.Response(401, request=req)
    s.get_offers = AsyncMock(side_effect=httpx.HTTPStatusError("401", request=req, response=resp))
    r = await s.get_site_result("X", "Y")
    assert r.error_category == "auth_failed"

@pytest.mark.asyncio
async def test_http_error():
    s = FakeScraper()
    req = httpx.Request("GET", "http://x")
    resp = httpx.Response(500, request=req)
    s.get_offers = AsyncMock(side_effect=httpx.HTTPStatusError("500", request=req, response=resp))
    r = await s.get_site_result("X", "Y")
    assert r.error_category == "http_error"

@pytest.mark.asyncio
async def test_parse_error():
    s = FakeScraper()
    s.get_offers = AsyncMock(side_effect=json.JSONDecodeError("bad", "", 0))
    r = await s.get_site_result("X", "Y")
    assert r.error_category == "parse_error"

@pytest.mark.asyncio
async def test_unknown_error():
    s = FakeScraper()
    s.get_offers = AsyncMock(side_effect=RuntimeError("boom"))
    r = await s.get_site_result("X", "Y")
    assert r.error_category == "unknown"

@pytest.mark.asyncio
async def test_not_configured():
    class Unconf(FakeScraper):
        REQUIRED_ENV = "FAKE_COOKIE"
        def is_configured(self): return False
    r = await Unconf().get_site_result("X", "Y")
    assert r.status == "NOT_CONFIGURED"
```

- [ ] **Step 2: FAIL**

- [ ] **Step 3: Реализовать в `BaseScraper`**

Добавить методы (`get_offers` абстрактный уже есть):

```python
import time, json, logging
import httpx
from models import SiteResult

log = logging.getLogger(__name__)

class BaseScraper:
    SITE_NAME: str = ""
    REQUIRED_ENV: str | None = None

    def is_configured(self) -> bool:
        return True

    async def _find_all_brands_safe(self, article: str) -> list[str] | None:
        return None

    async def get_site_result(self, article: str, brand: str,
                              db_aliases: dict | None = None) -> SiteResult:
        if not self.is_configured():
            return SiteResult(
                site=self.SITE_NAME, status="NOT_CONFIGURED",
                error_text=f"{self.REQUIRED_ENV} not set" if self.REQUIRED_ENV else "not configured",
            )
        start = time.monotonic()
        try:
            offers = await self.get_offers(article, brand)
            duration = int((time.monotonic() - start) * 1000)
            in_stock = [o for o in offers if o.in_stock is not False]
            if in_stock:
                return SiteResult(site=self.SITE_NAME, status="OFFERS",
                                  offers=in_stock, duration_ms=duration)
            if offers:
                return SiteResult(site=self.SITE_NAME, status="OUT_OF_STOCK",
                                  duration_ms=duration)
            found = await self._find_all_brands_safe(article)
            return SiteResult(site=self.SITE_NAME, status="NOT_FOUND",
                              found_brands=found, duration_ms=duration)
        except httpx.TimeoutException as e:
            return self._error("timeout", str(e), start)
        except httpx.HTTPStatusError as e:
            cat = "auth_failed" if e.response.status_code in (401, 403) else "http_error"
            return self._error(cat, f"HTTP {e.response.status_code}", start)
        except (json.JSONDecodeError, ValueError) as e:
            return self._error("parse_error", str(e), start)
        except Exception as e:
            log.exception(f"{self.SITE_NAME}: unexpected")
            return self._error("unknown", str(e), start)

    def _error(self, cat: str, text: str, start: float) -> SiteResult:
        return SiteResult(
            site=self.SITE_NAME, status="ERROR",
            error_category=cat, error_text=text,
            duration_ms=int((time.monotonic() - start) * 1000),
        )
```

- [ ] **Step 4: PASS**

- [ ] **Step 5: Commit**

```bash
git add scrapers/base.py tests/test_get_site_result.py
git commit -m "feat(price-monitor): BaseScraper.get_site_result wrapper"
```

---

### Задача 6: `is_configured` для exist/emex

**Files:**
- Modify: `~/Documents/price-monitor/scrapers/exist.py`
- Modify: `~/Documents/price-monitor/scrapers/emex.py`
- Create: `~/Documents/price-monitor/tests/test_is_configured.py`

- [ ] **Step 1: Failing тест**

```python
import os
from scrapers.exist import ExistScraper
from scrapers.emex import EmexScraper

def test_exist_configured(monkeypatch):
    monkeypatch.setenv("EXIST_COOKIE", "x")
    assert ExistScraper().is_configured() is True

def test_exist_not_configured(monkeypatch):
    monkeypatch.delenv("EXIST_COOKIE", raising=False)
    assert ExistScraper().is_configured() is False

def test_emex_configured(monkeypatch):
    monkeypatch.setenv("EMEX_COOKIE", "x")
    assert EmexScraper().is_configured() is True
```

- [ ] **Step 2: FAIL**

- [ ] **Step 3: Реализовать**

В `exist.py`:
```python
class ExistScraper(BaseScraper):
    SITE_NAME = "exist.ru"
    REQUIRED_ENV = "EXIST_COOKIE"
    def is_configured(self):
        import os
        return bool(os.environ.get("EXIST_COOKIE"))
```

Аналогично `emex.py` (`EMEX_COOKIE`).

- [ ] **Step 4: PASS**

- [ ] **Step 5: Commit**

```bash
git add scrapers/exist.py scrapers/emex.py tests/test_is_configured.py
git commit -m "feat(price-monitor): is_configured for exist and emex"
```

---

### Задача 7: `_find_all_brands_safe` в exist.ru

**Files:**
- Modify: `~/Documents/price-monitor/scrapers/exist.py`
- Create: `~/Documents/price-monitor/tests/test_exist_find_brands.py`

- [ ] **Step 1: Failing тест**

```python
import pytest
from unittest.mock import AsyncMock
from scrapers.exist import ExistScraper

FIXTURE = '<html><script>_data = [{"CatalogName":"Robert Bosch","MinPriceString":"300"},{"CatalogName":"Bosch","MinPriceString":"310"}];</script></html>'

@pytest.mark.asyncio
async def test_find_brands_returns_list():
    s = ExistScraper()
    s._fetch_text = AsyncMock(return_value=FIXTURE)
    brands = await s._find_all_brands_safe("X")
    assert sorted(brands) == ["Bosch", "Robert Bosch"]

@pytest.mark.asyncio
async def test_find_brands_empty():
    s = ExistScraper()
    s._fetch_text = AsyncMock(return_value="<html>nothing</html>")
    brands = await s._find_all_brands_safe("X")
    assert brands == []
```

- [ ] **Step 2: FAIL**

- [ ] **Step 3: Реализовать**

```python
async def _find_all_brands_safe(self, article: str) -> list[str] | None:
    try:
        html = await self._fetch_text(f"https://www.exist.ru/Price/?pcode={article}")
        items = extract_data_array(html)  # существующая функция bracket-counting
        brands = sorted({it.get("CatalogName") for it in items if it.get("CatalogName")})
        return brands
    except Exception:
        return None
```

`except Exception: return None` здесь разрешён — дебаг-функция не должна ронять обёртку.

- [ ] **Step 4: PASS**

- [ ] **Step 5: Commit**

```bash
git add scrapers/exist.py tests/test_exist_find_brands.py
git commit -m "feat(price-monitor): exist.ru _find_all_brands_safe"
```

---

## Фаза 3 — API

### Задача 8: Эндпоинты алиасов

**Files:**
- Modify: `~/Documents/price-monitor/api.py`
- Create: `~/Documents/price-monitor/tests/test_api_aliases.py`

- [ ] **Step 1: Failing тест**

```python
from fastapi.testclient import TestClient
import tempfile

def test_alias_crud(monkeypatch):
    monkeypatch.setenv("DB_PATH", tempfile.mktemp())
    from db import init_db; init_db()
    from api import app
    c = TestClient(app)
    r = c.post("/aliases", json={"canonical": "Bosch", "alias": "BOSCH", "site": "emex.ru"})
    assert r.status_code == 200
    aid = r.json()["id"]
    assert any(a["id"] == aid for a in c.get("/aliases").json())
    c.delete(f"/aliases/{aid}")
    assert c.get("/aliases").json() == []
```

- [ ] **Step 2: FAIL**

- [ ] **Step 3: Реализовать в `api.py`**

```python
from pydantic import BaseModel
from db import add_alias, get_aliases, delete_alias
from scrapers.base import load_db_aliases

class AliasIn(BaseModel):
    canonical: str
    alias: str
    site: str | None = None

_ALIASES_CACHE: dict = {}

def _reload_aliases_cache():
    global _ALIASES_CACHE
    _ALIASES_CACHE = load_db_aliases(get_aliases())

@app.on_event("startup")
def _startup():
    _reload_aliases_cache()

@app.get("/aliases")
def list_aliases():
    return get_aliases()

@app.post("/aliases")
def create_alias(p: AliasIn):
    aid = add_alias(p.canonical, p.alias, p.site)
    _reload_aliases_cache()
    return {"ok": True, "id": aid}

@app.delete("/aliases/{alias_id}")
def remove_alias(alias_id: int):
    delete_alias(alias_id)
    _reload_aliases_cache()
    return {"ok": True}

@app.post("/reload-aliases")
def reload_aliases():
    _reload_aliases_cache()
    return {"ok": True}
```

- [ ] **Step 4: PASS**

- [ ] **Step 5: Commit**

```bash
git add api.py tests/test_api_aliases.py
git commit -m "feat(price-monitor): /aliases CRUD endpoints"
```

---

### Задача 9: `/parse-v3` и `/site-results`

**Files:**
- Modify: `~/Documents/price-monitor/api.py`
- Create: `~/Documents/price-monitor/tests/test_api_parse_v3.py`

- [ ] **Step 1: Failing тест**

```python
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock
from api import app
from models import SiteResult
import api, tempfile

def test_site_results_empty(monkeypatch):
    monkeypatch.setenv("DB_PATH", tempfile.mktemp())
    from db import init_db; init_db()
    c = TestClient(app)
    r = c.get("/site-results", params={"article": "NOPE", "brand": "NOPE"})
    assert r.status_code == 200
    assert r.json()["sites"] == []

def test_parse_v3_returns_five_rows(monkeypatch):
    monkeypatch.setenv("DB_PATH", tempfile.mktemp())
    from db import init_db; init_db()
    fakes = []
    for name in api.SITE_ORDER:
        m = AsyncMock()
        m.SITE_NAME = name
        m.get_site_result = AsyncMock(return_value=SiteResult(site=name, status="NOT_FOUND"))
        fakes.append(m)
    monkeypatch.setattr(api, "SCRAPERS_V3", fakes)
    c = TestClient(app)
    r = c.post("/parse-v3", params={"article": "X", "brand": "Y"})
    assert r.status_code == 200
    assert len(r.json()["sites"]) == 5
```

- [ ] **Step 2: FAIL**

- [ ] **Step 3: Реализовать в `api.py`**

```python
import asyncio, json
from datetime import datetime
from dataclasses import asdict
from db import upsert_site_result, get_site_results
from scrapers.exist import ExistScraper
from scrapers.emex import EmexScraper
from scrapers.part_kom import PartKomScraper
from scrapers.vdopel import VdopelScraper
from scrapers.plentycar import PlentycarScraper

SCRAPERS_V3 = [ExistScraper(), EmexScraper(), PartKomScraper(), VdopelScraper(), PlentycarScraper()]
SITE_ORDER = ["exist.ru", "emex.ru", "part-kom.ru", "vdopel.ru", "plentycar.ru"]

@app.post("/parse-v3")
async def parse_v3(article: str, brand: str):
    results = await asyncio.gather(
        *[s.get_site_result(article, brand, db_aliases=_ALIASES_CACHE) for s in SCRAPERS_V3]
    )
    for r in results:
        upsert_site_result(
            article=article, brand=brand, site=r.site, status=r.status,
            offers_json=json.dumps([asdict(o) for o in r.offers]) if r.offers else None,
            found_brands_json=json.dumps(r.found_brands) if r.found_brands is not None else None,
            error_category=r.error_category, error_text=r.error_text,
            duration_ms=r.duration_ms,
        )
    ordered = sorted(results, key=lambda x: SITE_ORDER.index(x.site))
    return {
        "article": article, "brand": brand,
        "scraped_at": datetime.utcnow().isoformat() + "Z",
        "sites": [r.to_dict() for r in ordered],
    }

@app.get("/site-results")
def site_results_endpoint(article: str, brand: str):
    rows = get_site_results(article, brand)
    by_site = {r["site"]: r for r in rows}
    out = []
    scraped_at = None
    for site in SITE_ORDER:
        if site not in by_site:
            continue
        r = by_site[site]
        scraped_at = r["scraped_at"]
        out.append({
            "site": r["site"], "status": r["status"],
            "offers": json.loads(r["offers_json"]) if r["offers_json"] else [],
            "found_brands": json.loads(r["found_brands_json"]) if r["found_brands_json"] else None,
            "error_category": r["error_category"], "error_text": r["error_text"],
            "duration_ms": r["duration_ms"],
        })
    return {"article": article, "brand": brand, "scraped_at": scraped_at, "sites": out}
```

- [ ] **Step 4: PASS**

- [ ] **Step 5: Commit**

```bash
git add api.py tests/test_api_parse_v3.py
git commit -m "feat(price-monitor): /parse-v3 and /site-results endpoints"
```

---

## Фаза 4 — Деплой на VPS

### Задача 10: Синхронизация и миграция

- [ ] **Step 1: Rsync**

```bash
rsync -av --exclude='.venv' --exclude='__pycache__' --exclude='data/' \
  ~/Documents/price-monitor/ root@5.42.103.41:/opt/price-monitor/
```

- [ ] **Step 2: Миграция БД**

```bash
ssh root@5.42.103.41 'cd /opt/price-monitor && .venv/bin/python -c "from db import init_db; init_db()"'
```

- [ ] **Step 3: Restart**

```bash
ssh root@5.42.103.41 'systemctl restart price-monitor && sleep 2 && systemctl status price-monitor --no-pager'
```

- [ ] **Step 4: Smoke-тест**

```bash
curl -H "X-API-Key: gmshop-parser-2026" -X POST \
  "http://5.42.103.41/parse-v3?article=GN1023412B1&brand=Delphi"
```

Ожидаем: JSON с 5 элементами в `sites[]`, каждый с валидным `status`.

- [ ] **Step 5: Проверка старых эндпоинтов**

```bash
curl -H "X-API-Key: gmshop-parser-2026" "http://5.42.103.41/notifications"
```

Должен работать как раньше — не сломали.

---

## Фаза 5 — Админка

### Задача 11: TypeScript типы + хелперы

**Files:**
- Modify: `src/app/lib/price-monitor.ts`

- [ ] **Step 1: Добавить в конец файла**

```typescript
export type SiteStatus = "OFFERS" | "OUT_OF_STOCK" | "NOT_FOUND" | "ERROR" | "NOT_CONFIGURED";
export type ErrorCategory = "timeout" | "http_error" | "auth_failed" | "parse_error" | "unknown";

export interface SiteOffer {
  price: number;
  delivery_days: number | null;
  in_stock: boolean | null;
}

export interface SiteResult {
  site: string;
  status: SiteStatus;
  offers: SiteOffer[];
  found_brands: string[] | null;
  error_category: ErrorCategory | null;
  error_text: string | null;
  duration_ms: number;
}

export interface SiteResultsResponse {
  article: string;
  brand: string;
  scraped_at: string | null;
  sites: SiteResult[];
}

export async function fetchSiteResults(article: string, brand: string): Promise<SiteResultsResponse | null> {
  const params = new URLSearchParams({ article, brand });
  const r = await fetch(`/api/price-monitor/site-results?${params}`);
  if (!r.ok) return null;
  return r.json();
}

export async function refreshSiteResults(article: string, brand: string): Promise<SiteResultsResponse | null> {
  const params = new URLSearchParams({ article, brand });
  const r = await fetch(`/api/price-monitor/parse-v3?${params}`, { method: "POST" });
  if (!r.ok) return null;
  return r.json();
}

export async function addBrandAlias(canonical: string, alias: string, site: string | null): Promise<boolean> {
  const r = await fetch("/api/price-monitor/aliases", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ canonical, alias, site }),
  });
  return r.ok;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/lib/price-monitor.ts
git commit -m "feat(admin): v3 types and helpers"
```

---

### Задача 12: Next.js прокси-роуты

**Files:**
- Create: `src/app/api/price-monitor/site-results/route.ts`
- Create: `src/app/api/price-monitor/parse-v3/route.ts`
- Create: `src/app/api/price-monitor/aliases/route.ts`

- [ ] **Step 1: site-results**

```typescript
// src/app/api/price-monitor/site-results/route.ts
import { NextRequest, NextResponse } from "next/server";

const BASE = process.env.PRICE_MONITOR_URL!;
const KEY = process.env.PRICE_MONITOR_API_KEY!;

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const r = await fetch(`${BASE}/site-results?${params}`, {
    headers: { "X-API-Key": KEY }, cache: "no-store",
  });
  return NextResponse.json(await r.json(), { status: r.status });
}
```

- [ ] **Step 2: parse-v3**

```typescript
// src/app/api/price-monitor/parse-v3/route.ts
import { NextRequest, NextResponse } from "next/server";

const BASE = process.env.PRICE_MONITOR_URL!;
const KEY = process.env.PRICE_MONITOR_API_KEY!;

export async function POST(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const r = await fetch(`${BASE}/parse-v3?${params}`, {
    method: "POST", headers: { "X-API-Key": KEY },
  });
  return NextResponse.json(await r.json(), { status: r.status });
}
```

- [ ] **Step 3: aliases (POST + GET)**

```typescript
// src/app/api/price-monitor/aliases/route.ts
import { NextRequest, NextResponse } from "next/server";

const BASE = process.env.PRICE_MONITOR_URL!;
const KEY = process.env.PRICE_MONITOR_API_KEY!;

export async function GET() {
  const r = await fetch(`${BASE}/aliases`, { headers: { "X-API-Key": KEY }, cache: "no-store" });
  return NextResponse.json(await r.json(), { status: r.status });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const r = await fetch(`${BASE}/aliases`, {
    method: "POST",
    headers: { "X-API-Key": KEY, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return NextResponse.json(await r.json(), { status: r.status });
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/price-monitor/
git commit -m "feat(admin): proxy routes for v3 endpoints"
```

---

### Задача 13: Переписать `MarketPriceWidget`

**Files:**
- Modify: `src/app/admin/components/MarketPriceWidget.tsx`

- [ ] **Step 1: Полная замена компонента**

```tsx
"use client";

import { useEffect, useState } from "react";
import {
  SiteResult, SiteStatus, SiteResultsResponse,
  fetchSiteResults, refreshSiteResults, addBrandAlias,
  formatPrice,
} from "@/app/lib/price-monitor";

interface Props { article: string; brand: string; yourPrice: number; }

const SITE_ORDER = ["exist.ru", "emex.ru", "part-kom.ru", "vdopel.ru", "plentycar.ru"];

const STATUS_STYLE: Record<SiteStatus, { dot: string; label: string }> = {
  OFFERS:         { dot: "bg-green-500",  label: "В наличии" },
  OUT_OF_STOCK:   { dot: "bg-yellow-500", label: "Нет в наличии" },
  NOT_FOUND:      { dot: "bg-orange-500", label: "Не нашёл" },
  ERROR:          { dot: "bg-red-500",    label: "Ошибка" },
  NOT_CONFIGURED: { dot: "bg-gray-400",   label: "Не настроен" },
};

export default function MarketPriceWidget({ article, brand, yourPrice }: Props) {
  const [data, setData] = useState<SiteResultsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!article || !brand) return;
    setLoading(true);
    fetchSiteResults(article, brand).then((d) => { setData(d); setLoading(false); });
  }, [article, brand]);

  const refresh = async () => {
    setRefreshing(true);
    const d = await refreshSiteResults(article, brand);
    if (d) setData(d);
    setRefreshing(false);
  };

  const addAlias = async (aliasBrand: string, site: string) => {
    const ok = await addBrandAlias(brand, aliasBrand, site);
    if (ok) refresh();
  };

  if (loading) {
    return <div className="border rounded-lg p-4 bg-gray-50 text-sm text-gray-500">Загрузка...</div>;
  }

  const bySite = new Map<string, SiteResult>((data?.sites ?? []).map(s => [s.site, s]));
  const prices = (data?.sites ?? []).filter(s => s.status === "OFFERS")
                                    .flatMap(s => s.offers.map(o => o.price));
  const min = prices.length ? Math.min(...prices) : null;
  const max = prices.length ? Math.max(...prices) : null;
  const median = prices.length ? [...prices].sort((a,b)=>a-b)[Math.floor(prices.length/2)] : null;
  const found = (data?.sites ?? []).filter(s => s.status === "OFFERS" || s.status === "OUT_OF_STOCK").length;

  return (
    <div className="border rounded-lg p-4 bg-white">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-sm">Рыночные цены</h4>
        <button onClick={refresh} disabled={refreshing}
          className="text-xs px-2 py-1 border rounded hover:bg-gray-50 disabled:opacity-50">
          {refreshing ? "Парсинг..." : "Обновить"}
        </button>
      </div>

      {prices.length > 0 && (
        <div className="flex gap-4 text-sm mb-3 text-gray-700">
          <span>Мин: <b>{formatPrice(min!)}</b></span>
          <span>Медиана: <b>{formatPrice(median!)}</b></span>
          <span>Макс: <b>{formatPrice(max!)}</b></span>
          <span className="text-gray-500">({found} из 5 нашли)</span>
        </div>
      )}

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 text-xs">
            <th className="pb-1">Сайт</th>
            <th className="pb-1">Статус</th>
            <th className="pb-1">Цена</th>
            <th className="pb-1">Детали</th>
          </tr>
        </thead>
        <tbody>
          {SITE_ORDER.map((site) => {
            const r = bySite.get(site);
            if (!r) {
              return (
                <tr key={site} className="border-t border-gray-100 text-gray-400">
                  <td className="py-1">{site}</td>
                  <td colSpan={3} className="py-1 text-xs">ещё не парсили — нажмите «Обновить»</td>
                </tr>
              );
            }
            return (
              <tr key={site} className="border-t border-gray-100">
                <td className="py-1">{r.site}</td>
                <td className="py-1">
                  <span className={`inline-block w-2 h-2 rounded-full ${STATUS_STYLE[r.status].dot} mr-1`} />
                  {STATUS_STYLE[r.status].label}
                </td>
                <td className="py-1 font-medium">
                  {r.offers.length > 0 ? formatPrice(r.offers[0].price) : "—"}
                </td>
                <td className="py-1 text-gray-600 text-xs">
                  {r.status === "OFFERS" && r.offers[0].delivery_days != null && `${r.offers[0].delivery_days} дн.`}
                  {r.status === "ERROR" && (r.error_text ?? r.error_category)}
                  {r.status === "NOT_CONFIGURED" && r.error_text}
                  {r.status === "NOT_FOUND" && r.found_brands && r.found_brands.length > 0 && (
                    <span>
                      сайт знает:{" "}
                      {r.found_brands.map((b, j) => (
                        <button key={j} onClick={() => addAlias(b, r.site)}
                          className="underline hover:text-blue-600 mr-2">
                          {b} [+ алиас]
                        </button>
                      ))}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/admin/components/MarketPriceWidget.tsx
git commit -m "feat(admin): MarketPriceWidget v3 with 5-row honest status table"
```

---

### Задача 14: End-to-end проверка

- [ ] **Step 1: Запустить dev-сервер**

- [ ] **Step 2: Открыть товар в админке**:
  - Таблица показывает 5 строк (placeholder для сайтов без записи)
  - «Обновить» триггерит парсинг, таблица перерисовывается
  - Для `NOT_FOUND` с `found_brands` видны кнопки `[+ алиас]`
  - Клик по алиасу добавляет и перепарсивает

- [ ] **Step 3: Проверка алиаса влияет на результат**:
  - До: exist.ru = NOT_FOUND, found_brands = ["Robert Bosch"]
  - Добавить алиас "Bosch" → "Robert Bosch" для exist.ru
  - После: exist.ru = OFFERS или OUT_OF_STOCK

- [ ] **Step 4: Скриншот** через preview_screenshot

---

### Задача 15: Финальный ревью и merge

- [ ] **Step 1:** Dispatch code reviewer на весь diff ветки против main
- [ ] **Step 2:** Merge в main после approval

---

## Что НЕ делаем

- 6-й сайт (zzap/autopiter) — выкинут как лишний риск
- Переписывание существующих `get_offers()` — не трогаем рабочий код
- `_find_all_brands_safe` для emex/part-kom/vdopel/plentycar — на старте только exist.ru
- Миграция ночного cron на `get_site_result` — отдельный PR
- Удаление старого `/parse` и `offers` — живут параллельно

## Критерий готовности

- `curl /parse-v3?article=X&brand=Y` → 5 строк с валидными статусами
- Админка: таблица 5 строк, цвета по статусам, мин/медиана/макс
- Добавление алиаса через кнопку влияет на следующий прогон
- Ночной cron как работал, так и работает (не сломан)
- Unit-тесты зелёные
