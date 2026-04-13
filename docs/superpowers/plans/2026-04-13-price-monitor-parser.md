# Price Monitor — Parser Service Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone Python scraper service that collects competitor prices for GM auto parts nightly and exposes them via FastAPI for the admin panel to consume.

**Architecture:** Python project on a separate VPS. Nightly cron runs a batch scraper across 5 competitor sites (exist.ru, autodoc.ru, emex.ru, parterra.ru, zapchasti.ru) searching by article + brand. Results stored in SQLite. FastAPI exposes two endpoints: GET /price (read cached data) and POST /parse (trigger immediate scrape for one article). API is protected by a static token.

**Tech Stack:** Python 3.11, httpx, BeautifulSoup4, FastAPI, uvicorn, SQLite (stdlib), pytest, asyncio

---

## File Structure

```
price-monitor/               ← отдельный репозиторий на парсер VPS
├── scrapers/
│   ├── base.py              ← базовый класс: User-Agent ротация, задержки, httpx
│   ├── exist.py             ← парсер exist.ru
│   ├── autodoc.py           ← парсер autodoc.ru
│   ├── emex.py              ← парсер emex.ru
│   ├── parterra.py          ← парсер parterra.ru
│   └── zapchasti.py         ← парсер zapchasti.ru
├── db.py                    ← все операции с SQLite (init, upsert, query)
├── aggregator.py            ← считает avg/min/max, пишет price_summary
├── runner.py                ← ночной батч: читает articles.txt, запускает все парсеры
├── api.py                   ← FastAPI: GET /price, POST /parse, токен-аутентификация
├── config.py                ← настройки: DB_PATH, API_TOKEN, DELAY_MIN/MAX, WORKERS
├── articles.txt             ← список "артикул|бренд" по одному на строку
├── tests/
│   ├── test_db.py
│   ├── test_aggregator.py
│   └── test_api.py
├── requirements.txt
└── deploy/
    ├── install.sh           ← установка на VPS
    └── price-monitor.service ← systemd unit для uvicorn
```

---

## Task 1: Project Setup

**Files:**
- Create: `price-monitor/requirements.txt`
- Create: `price-monitor/config.py`
- Create: `price-monitor/.env.example`

- [ ] **Step 1: Создать папку проекта и requirements.txt**

```bash
mkdir price-monitor && cd price-monitor
git init
```

`requirements.txt`:
```
httpx==0.27.0
beautifulsoup4==4.12.3
lxml==5.2.1
fastapi==0.111.0
uvicorn==0.29.0
python-dotenv==1.0.1
pytest==8.2.0
pytest-asyncio==0.23.7
```

- [ ] **Step 2: Создать config.py**

```python
# config.py
import os
from dotenv import load_dotenv

load_dotenv()

DB_PATH = os.getenv("DB_PATH", "prices.db")
API_TOKEN = os.getenv("API_TOKEN", "change-me-in-production")
DELAY_MIN = float(os.getenv("DELAY_MIN", "3"))
DELAY_MAX = float(os.getenv("DELAY_MAX", "10"))
WORKERS = int(os.getenv("WORKERS", "10"))
PRICE_GREEN_LOW = float(os.getenv("PRICE_GREEN_LOW", "0.85"))   # -15%
PRICE_GREEN_HIGH = float(os.getenv("PRICE_GREEN_HIGH", "1.15")) # +15%
```

- [ ] **Step 3: Создать .env.example**

```
DB_PATH=prices.db
API_TOKEN=your-secret-token-here
DELAY_MIN=3
DELAY_MAX=10
WORKERS=10
PRICE_GREEN_LOW=0.85
PRICE_GREEN_HIGH=1.15
```

- [ ] **Step 4: Установить зависимости**

```bash
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
```

Ожидаемый результат: все пакеты установлены без ошибок.

- [ ] **Step 5: Первый коммит**

```bash
git add .
git commit -m "chore: project setup"
```

---

## Task 2: База данных (db.py)

**Files:**
- Create: `price-monitor/db.py`
- Create: `price-monitor/tests/test_db.py`

- [ ] **Step 1: Написать тест**

```python
# tests/test_db.py
import os, pytest
os.environ["DB_PATH"] = ":memory:"

from db import init_db, upsert_price, get_summary, upsert_summary

def get_conn():
    import sqlite3
    from config import DB_PATH
    return sqlite3.connect(DB_PATH)

def test_init_creates_tables():
    init_db()
    conn = get_conn()
    tables = {r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()}
    assert "prices" in tables
    assert "price_summary" in tables

def test_upsert_price_and_summary():
    init_db()
    upsert_price("95227052", "ACDelco", "exist.ru", 3490.0)
    upsert_price("95227052", "ACDelco", "autodoc.ru", 3200.0)
    upsert_summary("95227052", "ACDelco", avg=3345.0, min_p=3200.0, max_p=3490.0, count=2)
    row = get_summary("95227052", "ACDelco")
    assert row is not None
    assert row["avg_price"] == 3345.0
    assert row["sites_count"] == 2
```

- [ ] **Step 2: Убедиться что тест падает**

```bash
pytest tests/test_db.py -v
```

Ожидаемый результат: `ImportError: No module named 'db'`

- [ ] **Step 3: Написать db.py**

```python
# db.py
import sqlite3
from datetime import datetime, timezone
from config import DB_PATH

def _conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with _conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS prices (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                article    TEXT NOT NULL,
                brand      TEXT NOT NULL,
                site       TEXT NOT NULL,
                price      REAL NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)
        conn.execute("""
            CREATE UNIQUE INDEX IF NOT EXISTS idx_prices_unique
            ON prices(article, brand, site)
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS price_summary (
                article    TEXT NOT NULL,
                brand      TEXT NOT NULL,
                avg_price  REAL,
                min_price  REAL,
                max_price  REAL,
                sites_count INTEGER,
                updated_at TEXT NOT NULL,
                PRIMARY KEY (article, brand)
            )
        """)

def upsert_price(article: str, brand: str, site: str, price: float):
    now = datetime.now(timezone.utc).isoformat()
    with _conn() as conn:
        conn.execute("""
            INSERT INTO prices (article, brand, site, price, updated_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(article, brand, site) DO UPDATE SET price=excluded.price, updated_at=excluded.updated_at
        """, (article, brand, site, price, now))

def upsert_summary(article: str, brand: str, avg: float, min_p: float, max_p: float, count: int):
    now = datetime.now(timezone.utc).isoformat()
    with _conn() as conn:
        conn.execute("""
            INSERT INTO price_summary (article, brand, avg_price, min_price, max_price, sites_count, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(article, brand) DO UPDATE SET
                avg_price=excluded.avg_price,
                min_price=excluded.min_price,
                max_price=excluded.max_price,
                sites_count=excluded.sites_count,
                updated_at=excluded.updated_at
        """, (article, brand, avg, min_p, max_p, count, now))

def get_summary(article: str, brand: str) -> dict | None:
    with _conn() as conn:
        row = conn.execute(
            "SELECT * FROM price_summary WHERE article=? AND brand=?",
            (article, brand)
        ).fetchone()
    return dict(row) if row else None

def get_raw_prices(article: str, brand: str) -> list[dict]:
    with _conn() as conn:
        rows = conn.execute(
            "SELECT site, price, updated_at FROM prices WHERE article=? AND brand=?",
            (article, brand)
        ).fetchall()
    return [dict(r) for r in rows]
```

- [ ] **Step 4: Запустить тесты**

```bash
pytest tests/test_db.py -v
```

Ожидаемый результат: все тесты PASS.

- [ ] **Step 5: Коммит**

```bash
git add db.py tests/test_db.py
git commit -m "feat: SQLite db module with prices and price_summary tables"
```

---

## Task 3: Базовый парсер (scrapers/base.py)

**Files:**
- Create: `price-monitor/scrapers/__init__.py`
- Create: `price-monitor/scrapers/base.py`

- [ ] **Step 1: Создать scrapers/__init__.py**

```bash
mkdir scrapers && touch scrapers/__init__.py
```

- [ ] **Step 2: Написать base.py**

```python
# scrapers/base.py
import asyncio
import random
import httpx
from bs4 import BeautifulSoup

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
]

class BaseScraper:
    SITE_NAME: str = ""

    def __init__(self, delay_min: float = 3.0, delay_max: float = 10.0):
        self.delay_min = delay_min
        self.delay_max = delay_max
        self._client: httpx.AsyncClient | None = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                timeout=30,
                follow_redirects=True,
                headers={"Accept-Language": "ru-RU,ru;q=0.9"},
            )
        return self._client

    async def _fetch(self, url: str) -> BeautifulSoup:
        await asyncio.sleep(random.uniform(self.delay_min, self.delay_max))
        client = await self._get_client()
        headers = {"User-Agent": random.choice(USER_AGENTS)}
        response = await client.get(url, headers=headers)
        response.raise_for_status()
        return BeautifulSoup(response.text, "lxml")

    async def get_price(self, article: str, brand: str) -> float | None:
        """Возвращает цену в рублях или None если не найдено."""
        raise NotImplementedError

    async def close(self):
        if self._client and not self._client.is_closed:
            await self._client.aclose()
```

- [ ] **Step 3: Коммит**

```bash
git add scrapers/
git commit -m "feat: base scraper with User-Agent rotation and delay"
```

---

## Task 4: Парсер exist.ru

**Files:**
- Create: `price-monitor/scrapers/exist.py`

> **Важно перед написанием:** Открыть в браузере `https://www.exist.ru/Price/?pcode=95227052` и через DevTools (F12 → Elements) найти CSS-селектор для блока с минимальной ценой. Записать его в `PRICE_SELECTOR` ниже.

- [ ] **Step 1: Написать exist.py**

```python
# scrapers/exist.py
import re
from scrapers.base import BaseScraper

# Проверить актуальность селектора на https://www.exist.ru/Price/?pcode=TEST_ARTICLE
PRICE_SELECTOR = "td.cell-price span.price-value"  # уточнить по DevTools

class ExistScraper(BaseScraper):
    SITE_NAME = "exist.ru"

    async def get_price(self, article: str, brand: str) -> float | None:
        url = f"https://www.exist.ru/Price/?pcode={article}"
        try:
            soup = await self._fetch(url)
            # Exist — агрегатор: берём минимальную цену из списка предложений
            prices = []
            for el in soup.select(PRICE_SELECTOR):
                text = el.get_text(strip=True).replace("\xa0", "").replace(" ", "")
                text = re.sub(r"[^\d.]", "", text)
                if text:
                    prices.append(float(text))
            return min(prices) if prices else None
        except Exception:
            return None
```

- [ ] **Step 2: Коммит**

```bash
git add scrapers/exist.py
git commit -m "feat: exist.ru scraper"
```

---

## Task 5: Парсеры autodoc, emex, parterra, zapchasti

**Files:**
- Create: `price-monitor/scrapers/autodoc.py`
- Create: `price-monitor/scrapers/emex.py`
- Create: `price-monitor/scrapers/parterra.py`
- Create: `price-monitor/scrapers/zapchasti.py`

> **Важно:** Для каждого сайта открыть в браузере страницу поиска по артикулу и найти CSS-селектор цены через DevTools. URL-паттерны указаны ниже.

- [ ] **Step 1: Написать autodoc.py**

URL поиска: `https://www.autodoc.ru/search?article=ARTICLE&brand=BRAND`

```python
# scrapers/autodoc.py
import re
from scrapers.base import BaseScraper

PRICE_SELECTOR = "span.price__value"  # уточнить по DevTools

class AutodocScraper(BaseScraper):
    SITE_NAME = "autodoc.ru"

    async def get_price(self, article: str, brand: str) -> float | None:
        url = f"https://www.autodoc.ru/search?article={article}&brand={brand}"
        try:
            soup = await self._fetch(url)
            prices = []
            for el in soup.select(PRICE_SELECTOR):
                text = re.sub(r"[^\d.]", "", el.get_text(strip=True).replace("\xa0", ""))
                if text:
                    prices.append(float(text))
            return min(prices) if prices else None
        except Exception:
            return None
```

- [ ] **Step 2: Написать emex.py**

URL поиска: `https://emex.ru/products/{article}/`

```python
# scrapers/emex.py
import re
from scrapers.base import BaseScraper

PRICE_SELECTOR = "div.price span"  # уточнить по DevTools

class EmexScraper(BaseScraper):
    SITE_NAME = "emex.ru"

    async def get_price(self, article: str, brand: str) -> float | None:
        url = f"https://emex.ru/products/{article}/"
        try:
            soup = await self._fetch(url)
            prices = []
            for el in soup.select(PRICE_SELECTOR):
                text = re.sub(r"[^\d.]", "", el.get_text(strip=True).replace("\xa0", ""))
                if text:
                    prices.append(float(text))
            return min(prices) if prices else None
        except Exception:
            return None
```

- [ ] **Step 3: Написать parterra.py**

URL поиска: `https://www.parterra.ru/search/?q=ARTICLE`

```python
# scrapers/parterra.py
import re
from scrapers.base import BaseScraper

PRICE_SELECTOR = "span.item-price"  # уточнить по DevTools

class ParterraScraper(BaseScraper):
    SITE_NAME = "parterra.ru"

    async def get_price(self, article: str, brand: str) -> float | None:
        url = f"https://www.parterra.ru/search/?q={article}"
        try:
            soup = await self._fetch(url)
            prices = []
            for el in soup.select(PRICE_SELECTOR):
                text = re.sub(r"[^\d.]", "", el.get_text(strip=True).replace("\xa0", ""))
                if text:
                    prices.append(float(text))
            return min(prices) if prices else None
        except Exception:
            return None
```

- [ ] **Step 4: Написать zapchasti.py**

URL поиска: `https://www.zapchasti.ru/search/?article=ARTICLE`

```python
# scrapers/zapchasti.py
import re
from scrapers.base import BaseScraper

PRICE_SELECTOR = "span.price"  # уточнить по DevTools

class ZapChastiScraper(BaseScraper):
    SITE_NAME = "zapchasti.ru"

    async def get_price(self, article: str, brand: str) -> float | None:
        url = f"https://www.zapchasti.ru/search/?article={article}"
        try:
            soup = await self._fetch(url)
            prices = []
            for el in soup.select(PRICE_SELECTOR):
                text = re.sub(r"[^\d.]", "", el.get_text(strip=True).replace("\xa0", ""))
                if text:
                    prices.append(float(text))
            return min(prices) if prices else None
        except Exception:
            return None
```

- [ ] **Step 5: Коммит**

```bash
git add scrapers/
git commit -m "feat: autodoc, emex, parterra, zapchasti scrapers"
```

---

## Task 6: Агрегатор (aggregator.py)

**Files:**
- Create: `price-monitor/aggregator.py`
- Create: `price-monitor/tests/test_aggregator.py`

- [ ] **Step 1: Написать тест**

```python
# tests/test_aggregator.py
import os
os.environ["DB_PATH"] = ":memory:"

from db import init_db, upsert_price
from aggregator import aggregate

def test_aggregate_calculates_correctly():
    init_db()
    upsert_price("TEST001", "Brand", "exist.ru", 1000.0)
    upsert_price("TEST001", "Brand", "autodoc.ru", 2000.0)
    upsert_price("TEST001", "Brand", "emex.ru", 3000.0)
    result = aggregate("TEST001", "Brand")
    assert result["avg_price"] == 2000.0
    assert result["min_price"] == 1000.0
    assert result["max_price"] == 3000.0
    assert result["sites_count"] == 3

def test_aggregate_returns_none_when_no_data():
    init_db()
    result = aggregate("NOTEXIST", "NoBrand")
    assert result is None
```

- [ ] **Step 2: Убедиться что тест падает**

```bash
pytest tests/test_aggregator.py -v
```

- [ ] **Step 3: Написать aggregator.py**

```python
# aggregator.py
from db import get_raw_prices, upsert_summary

def aggregate(article: str, brand: str) -> dict | None:
    rows = get_raw_prices(article, brand)
    if not rows:
        return None
    prices = [r["price"] for r in rows]
    avg = round(sum(prices) / len(prices), 2)
    result = {
        "avg_price": avg,
        "min_price": min(prices),
        "max_price": max(prices),
        "sites_count": len(prices),
    }
    upsert_summary(article, brand, avg, result["min_price"], result["max_price"], result["sites_count"])
    return result
```

- [ ] **Step 4: Запустить тесты**

```bash
pytest tests/test_aggregator.py -v
```

Ожидаемый результат: PASS.

- [ ] **Step 5: Коммит**

```bash
git add aggregator.py tests/test_aggregator.py
git commit -m "feat: price aggregator (avg/min/max)"
```

---

## Task 7: Ночной батч-runner (runner.py)

**Files:**
- Create: `price-monitor/runner.py`
- Create: `price-monitor/articles.txt` (пример)

- [ ] **Step 1: Создать articles.txt (пример)**

Формат: `артикул|бренд` — по одной строке:

```
95227052|ACDelco
93745242|ACDelco
25182496|ACDelco
```

Этот файл экспортируется из 1С и обновляется вручную при добавлении новых товаров.

- [ ] **Step 2: Написать runner.py**

```python
# runner.py
import asyncio
import logging
from datetime import datetime

from config import DB_PATH, DELAY_MIN, DELAY_MAX, WORKERS
from db import init_db, upsert_price
from aggregator import aggregate
from scrapers.exist import ExistScraper
from scrapers.autodoc import AutodocScraper
from scrapers.emex import EmexScraper
from scrapers.parterra import ParterraScraper
from scrapers.zapchasti import ZapChastiScraper

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    handlers=[
        logging.FileHandler("runner.log"),
        logging.StreamHandler(),
    ]
)
log = logging.getLogger(__name__)

SCRAPERS = [
    ExistScraper,
    AutodocScraper,
    EmexScraper,
    ParterraScraper,
    ZapChastiScraper,
]

def load_articles(path: str = "articles.txt") -> list[tuple[str, str]]:
    articles = []
    with open(path) as f:
        for line in f:
            line = line.strip()
            if line and "|" in line:
                article, brand = line.split("|", 1)
                articles.append((article.strip(), brand.strip()))
    return articles

async def scrape_one(article: str, brand: str, semaphore: asyncio.Semaphore):
    async with semaphore:
        for ScraperClass in SCRAPERS:
            scraper = ScraperClass(delay_min=DELAY_MIN, delay_max=DELAY_MAX)
            try:
                price = await scraper.get_price(article, brand)
                if price:
                    upsert_price(article, brand, scraper.SITE_NAME, price)
                    log.info(f"OK {article} {brand} @ {scraper.SITE_NAME}: {price}")
                else:
                    log.info(f"NOT_FOUND {article} {brand} @ {scraper.SITE_NAME}")
            except Exception as e:
                log.warning(f"ERROR {article} {brand} @ {scraper.SITE_NAME}: {e}")
            finally:
                await scraper.close()
        aggregate(article, brand)

async def run_all():
    init_db()
    articles = load_articles()
    log.info(f"Starting nightly run: {len(articles)} articles, {WORKERS} workers")
    started = datetime.now()
    semaphore = asyncio.Semaphore(WORKERS)
    tasks = [scrape_one(art, brand, semaphore) for art, brand in articles]
    await asyncio.gather(*tasks)
    elapsed = (datetime.now() - started).seconds // 60
    log.info(f"Done in {elapsed} min")

if __name__ == "__main__":
    asyncio.run(run_all())
```

- [ ] **Step 3: Проверить запуск на малом наборе**

Оставить в articles.txt 3-5 строк и запустить:

```bash
python runner.py
```

Ожидаемый результат: в логе видны строки `OK` или `NOT_FOUND` для каждого артикула и сайта, файл `prices.db` появился.

- [ ] **Step 4: Коммит**

```bash
git add runner.py articles.txt
git commit -m "feat: nightly batch runner with semaphore concurrency"
```

---

## Task 8: FastAPI (api.py)

**Files:**
- Create: `price-monitor/api.py`
- Create: `price-monitor/tests/test_api.py`

- [ ] **Step 1: Написать тест**

```python
# tests/test_api.py
import os
os.environ["DB_PATH"] = ":memory:"
os.environ["API_TOKEN"] = "test-token"

import pytest
from fastapi.testclient import TestClient
from db import init_db, upsert_price
from aggregator import aggregate

@pytest.fixture(autouse=True)
def setup():
    init_db()
    upsert_price("95227052", "ACDelco", "exist.ru", 3000.0)
    upsert_price("95227052", "ACDelco", "autodoc.ru", 3500.0)
    aggregate("95227052", "ACDelco")

from api import app
client = TestClient(app)

def auth():
    return {"X-API-Token": "test-token"}

def test_get_price_returns_summary():
    r = client.get("/price", params={"article": "95227052", "brand": "ACDelco"}, headers=auth())
    assert r.status_code == 200
    data = r.json()
    assert data["avg_price"] == 3250.0
    assert data["sites_count"] == 2

def test_get_price_not_found():
    r = client.get("/price", params={"article": "NOTEXIST", "brand": "X"}, headers=auth())
    assert r.status_code == 404

def test_unauthorized():
    r = client.get("/price", params={"article": "95227052", "brand": "ACDelco"})
    assert r.status_code == 401
```

- [ ] **Step 2: Убедиться что тест падает**

```bash
pytest tests/test_api.py -v
```

- [ ] **Step 3: Написать api.py**

```python
# api.py
import asyncio
from fastapi import FastAPI, HTTPException, Header, Query
from config import API_TOKEN, DELAY_MIN, DELAY_MAX
from db import init_db, upsert_price, get_summary, get_raw_prices
from aggregator import aggregate
from scrapers.exist import ExistScraper
from scrapers.autodoc import AutodocScraper
from scrapers.emex import EmexScraper
from scrapers.parterra import ParterraScraper
from scrapers.zapchasti import ZapChastiScraper

app = FastAPI(title="Price Monitor API")

SCRAPERS = [ExistScraper, AutodocScraper, EmexScraper, ParterraScraper, ZapChastiScraper]

def check_token(x_api_token: str = Header(default=None)):
    if x_api_token != API_TOKEN:
        raise HTTPException(status_code=401, detail="Unauthorized")

@app.on_event("startup")
def startup():
    init_db()

@app.get("/price")
def get_price(
    article: str = Query(...),
    brand: str = Query(...),
    x_api_token: str = Header(default=None),
):
    check_token(x_api_token)
    summary = get_summary(article, brand)
    if not summary:
        raise HTTPException(status_code=404, detail="No data")
    summary["sites"] = get_raw_prices(article, brand)
    return summary

@app.post("/parse")
async def parse_now(
    article: str = Query(...),
    brand: str = Query(...),
    x_api_token: str = Header(default=None),
):
    check_token(x_api_token)
    for ScraperClass in SCRAPERS:
        scraper = ScraperClass(delay_min=1.0, delay_max=2.0)
        try:
            price = await scraper.get_price(article, brand)
            if price:
                upsert_price(article, brand, scraper.SITE_NAME, price)
        finally:
            await scraper.close()
    result = aggregate(article, brand)
    if not result:
        raise HTTPException(status_code=404, detail="Not found on any site")
    result["sites"] = get_raw_prices(article, brand)
    return result
```

- [ ] **Step 4: Запустить тесты**

```bash
pytest tests/ -v
```

Ожидаемый результат: все тесты PASS.

- [ ] **Step 5: Коммит**

```bash
git add api.py tests/test_api.py
git commit -m "feat: FastAPI with GET /price and POST /parse, token auth"
```

---

## Task 9: Deploy на VPS

**Files:**
- Create: `price-monitor/deploy/install.sh`
- Create: `price-monitor/deploy/price-monitor.service`

- [ ] **Step 1: Написать install.sh**

```bash
#!/bin/bash
# deploy/install.sh — запускать от root на парсер VPS
set -e

apt-get update && apt-get install -y python3.11 python3.11-venv git

cd /opt
git clone https://github.com/YOUR_REPO/price-monitor.git
cd price-monitor

python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
echo "Отредактируйте /opt/price-monitor/.env — укажите API_TOKEN"
```

- [ ] **Step 2: Написать systemd unit для uvicorn**

```ini
# deploy/price-monitor.service
[Unit]
Description=Price Monitor API
After=network.target

[Service]
WorkingDirectory=/opt/price-monitor
ExecStart=/opt/price-monitor/venv/bin/uvicorn api:app --host 0.0.0.0 --port 8080
Restart=always
User=www-data
EnvironmentFile=/opt/price-monitor/.env

[Install]
WantedBy=multi-user.target
```

- [ ] **Step 3: Установить и запустить сервис**

```bash
cp deploy/price-monitor.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable price-monitor
systemctl start price-monitor
systemctl status price-monitor
```

Ожидаемый результат: `Active: active (running)`.

- [ ] **Step 4: Настроить cron для ночного запуска**

```bash
crontab -e
```

Добавить строку:

```
0 2 * * * /opt/price-monitor/venv/bin/python /opt/price-monitor/runner.py >> /opt/price-monitor/runner.log 2>&1
```

Парсер будет запускаться каждую ночь в 02:00.

- [ ] **Step 5: Проверить API**

```bash
curl -H "X-API-Token: your-token" "http://localhost:8080/price?article=95227052&brand=ACDelco"
```

Ожидаемый результат: JSON с ценами или `{"detail":"No data"}` (если артикул ещё не парсился).

- [ ] **Step 6: Финальный коммит**

```bash
git add deploy/
git commit -m "feat: deploy scripts and systemd service"
```

---

## Готово — Parser Service

После выполнения всех задач:
- FastAPI работает на парсер VPS на порту 8080
- Каждую ночь в 02:00 автоматически обновляются цены для всех артикулов из articles.txt
- По кнопке "Спарсить цену" в админке делается запрос POST /parse

**Следующий план:** `2026-04-13-price-monitor-admin.md` — интеграция шкалы, кнопки и уведомлений в Next.js Admin Panel.
