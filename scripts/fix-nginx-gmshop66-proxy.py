#!/usr/bin/env python3
"""
Добавляет в HTTPS-блок(и) Nginx для gmshop66.ru прокси на Next.js (127.0.0.1:3000),
если в блоке нет proxy_pass на 127.0.0.1:3000 (типичная причина 404 после certbot).

Запуск на VPS от root:
  python3 scripts/fix-nginx-gmshop66-proxy.py /etc/nginx/sites-available/astramotors
  # несколько файлов:
  python3 scripts/fix-nginx-gmshop66-proxy.py /etc/nginx/sites-available/*
  # только посмотреть блоки с gmshop66:
  python3 scripts/fix-nginx-gmshop66-proxy.py --show /etc/nginx/sites-available/astramotors
  # что реально видит nginx (после всех include) — от root:
  python3 scripts/fix-nginx-gmshop66-proxy.py --inspect

После правок: nginx -t && systemctl reload nginx
"""
from __future__ import annotations

import glob
import re
import shutil
import subprocess
import sys
from pathlib import Path

# Учитываем localhost и необязательный слэш после порта.
RE_PROXY_PASS_NEXT = re.compile(
    r"^\s*proxy_pass\s+http://(127\.0\.0\.1|localhost):3000/?\s*;",
    re.MULTILINE | re.IGNORECASE,
)

PROXY_BLOCK = """
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
"""


def extract_server_blocks(text: str) -> list[tuple[int, int, str]]:
    blocks: list[tuple[int, int, str]] = []
    i = 0
    n = len(text)
    while i < n:
        m = re.search(r"^\s*server\s*\{", text[i:], re.MULTILINE)
        if not m:
            break
        start = i + m.start()
        brace = text.find("{", start)
        if brace == -1:
            break
        depth = 0
        j = brace
        while j < n:
            if text[j] == "{":
                depth += 1
            elif text[j] == "}":
                depth -= 1
                if depth == 0:
                    end = j + 1
                    blocks.append((start, end, text[start:end]))
                    i = end
                    break
            j += 1
        else:
            break
    return blocks


def extract_first_location_slash_block(server_block: str) -> str | None:
    """Первый блок `location / { ... }` целиком (не regex)."""
    m = re.search(r"\n\s*location\s*/\s*\{", server_block)
    if not m:
        return None
    b = server_block.find("{", m.start())
    depth = 0
    k = b
    while k < len(server_block):
        if server_block[k] == "{":
            depth += 1
        elif server_block[k] == "}":
            depth -= 1
            if depth == 0:
                return server_block[m.start() : k + 1]
        k += 1
    return None


def has_proxy_to_next(block: str) -> bool:
    """Есть ли proxy_pass на Next где угодно в server {} (в т.ч. в named location)."""
    return bool(RE_PROXY_PASS_NEXT.search(block))


def location_slash_proxies_next(block: str) -> bool:
    """Есть ли в первом `location /` proxy_pass на 127.0.0.1:3000 или localhost:3000."""
    seg = extract_first_location_slash_block(block)
    if not seg:
        return False
    return bool(RE_PROXY_PASS_NEXT.search(seg))


def needs_proxy(block: str) -> bool:
    if "gmshop66.ru" not in block:
        return False
    low = block.lower()
    if "443" not in block and "ssl" not in low:
        return False
    if location_slash_proxies_next(block):
        return False
    return True


def strip_location_slash_without_proxy(inner: str) -> str:
    """Remove only `location / { ... }` blocks that do not proxy to Next (127.0.0.1:3000)."""
    pos = 0
    parts: list[str] = []
    while True:
        m = re.search(r"\n\s*location\s*/\s*\{", inner[pos:])
        if not m:
            parts.append(inner[pos:])
            break
        abs_start = pos + m.start()
        parts.append(inner[pos:abs_start])
        b = inner.find("{", abs_start)
        depth = 0
        k = b
        while k < len(inner):
            if inner[k] == "{":
                depth += 1
            elif inner[k] == "}":
                depth -= 1
                if depth == 0:
                    seg = inner[abs_start : k + 1]
                    if not RE_PROXY_PASS_NEXT.search(seg):
                        # drop certbot/static-only location /
                        pos = k + 1
                    else:
                        parts.append(seg)
                        pos = k + 1
                    break
            k += 1
        else:
            parts.append(inner[abs_start:])
            break
    return "".join(parts).rstrip()


def patch_block(block: str) -> str:
    first = block.find("{")
    if first == -1:
        return block
    depth = 0
    for j in range(first, len(block)):
        if block[j] == "{":
            depth += 1
        elif block[j] == "}":
            depth -= 1
            if depth == 0:
                prefix = block[: first + 1]
                inner = strip_location_slash_without_proxy(block[first + 1 : j])
                return prefix + "\n" + inner + PROXY_BLOCK + "\n}\n"
    return block


def show_gmshop66(path: Path, text: str) -> None:
    print(f"=== {path} ===")
    for idx, (_s, _e, block) in enumerate(extract_server_blocks(text), 1):
        if "gmshop66.ru" not in block:
            continue
        has443 = "443" in block
        sslish = "ssl" in block.lower()
        prox_slash = location_slash_proxies_next(block)
        prox_any = has_proxy_to_next(block)
        print(
            f"  server block #{idx}: listen 443-ish={has443 or sslish}, "
            f"proxy в location / ->3000={prox_slash}, proxy где-либо={prox_any}",
        )
        print("  ---")
        for line in block.splitlines()[:25]:
            print(f"  {line}")
        if block.count("\n") > 25:
            print("  ...")
        print()


def inspect_merged_config() -> int:
    """Печатает из `nginx -T` все server {}, где встречается gmshop66 (как в итоговом конфиге)."""
    try:
        proc = subprocess.run(
            ["nginx", "-T"],
            capture_output=True,
            text=True,
            timeout=120,
            check=False,
        )
    except FileNotFoundError:
        print("nginx не найден в PATH.", file=sys.stderr)
        return 1
    out = proc.stdout or ""
    err = (proc.stderr or "").strip()
    if proc.returncode != 0:
        print(err or out[:2000], file=sys.stderr)
        print("Запустите от root: sudo nginx -T", file=sys.stderr)
        return proc.returncode or 1

    blocks = extract_server_blocks(out)
    hits = [(i, b) for i, b in enumerate(blocks, 1) if "gmshop66" in b[2].lower()]
    if not hits:
        print("В объединённом конфиге нет строки «gmshop66». Проверьте server_name в файлах sites-enabled.")
        return 0

    https_dup = [
        (i, block_str)
        for i, (_s, _e, block_str) in enumerate(blocks, 1)
        if "gmshop66" in block_str.lower()
        and re.search(r"^\s*listen\s+[^\n;]*\b443\b", block_str, re.MULTILINE)
    ]
    if len(https_dup) > 1:
        print(
            "ВНИМАНИЕ: в конфиге несколько server{} с listen 443 и упоминанием gmshop66. "
            "При одинаковом server_name nginx выбирает первый подходящий блок — "
            "проверьте порядок include и дубликаты.",
        )
        for i, b in https_dup:
            print(
                f"  HTTPS+gmshop66: server #{i}, "
                f"proxy в location /={location_slash_proxies_next(b)}, "
                f"proxy где-либо={has_proxy_to_next(b)}",
            )
        print()

    for idx, (_start, _end, block) in hits:
        sn = [
            ln
            for ln in block.splitlines()
            if re.match(r"^\s*server_name\b", ln)
        ]
        listen = [ln for ln in block.splitlines() if re.match(r"^\s*listen\b", ln)]
        default_srv = "default_server" in block
        prox_slash = location_slash_proxies_next(block)
        prox_any = has_proxy_to_next(block)
        apex_ok = False
        www_present = False
        for ln in sn:
            m = re.search(r"server_name\s+(.+?);", ln)
            if not m:
                continue
            parts = re.findall(r"\S+", m.group(1))
            if "gmshop66.ru" in parts:
                apex_ok = True
            if "www.gmshop66.ru" in parts:
                www_present = True
        www_only = www_present and not apex_ok

        print(f"=== server #{idx} (итоговый nginx -T) ===")
        for ln in listen[:12]:
            print(ln)
        if len(listen) > 12:
            print(f"... (+{len(listen) - 12} listen)")
        for ln in sn:
            print(ln)
        if default_srv:
            print("(в блоке есть default_server)")
        print(
            f"proxy в первом location / -> :3000: {prox_slash} "
            f"(proxy_pass где-либо в server: {prox_any})",
        )
        loc_slash = extract_first_location_slash_block(block)
        if loc_slash:
            print("--- первый location / (важно для GET /) ---")
            for ln in loc_slash.splitlines()[:25]:
                print(ln)
            if loc_slash.count("\n") > 25:
                print("...")
            low_loc = loc_slash.lower()
            if "try_files" in low_loc and not RE_PROXY_PASS_NEXT.search(loc_slash):
                print(
                    "ПРОБЛЕМА: в location / есть try_files, но нет proxy_pass на :3000 — "
                    "запрос к / часто заканчивается =404 в nginx, даже если proxy есть в другом location.",
                )
            if re.search(r"location\s*=\s*/", block):
                print("ПРОБЛЕМА: есть location = / — он сильнее обычного location / и может отдавать 404.")
        else:
            print("(нет явного location / — смотрите include и другие location)")
        if www_only:
            print(
                "ВНИМАНИЕ: в server_name нет gmshop66.ru (только www?). "
                "Запрос на https://gmshop66.ru/ может уйти в ДРУГОЙ server → 404.",
            )
        if not prox_slash:
            print("--- фрагмент блока (ищите location / и proxy_pass) ---")
            for ln in block.splitlines()[:45]:
                print(ln)
            if block.count("\n") > 45:
                print("...")
        print()
    return 0


def process_file(path: Path) -> int:
    text = path.read_text(encoding="utf-8", errors="replace")
    blocks = extract_server_blocks(text)
    if not blocks:
        return 0

    patched = 0
    new_parts: list[str] = []
    pos = 0
    for start, end, block in blocks:
        new_parts.append(text[pos:start])
        if needs_proxy(block):
            new_parts.append(patch_block(block))
            patched += 1
        else:
            new_parts.append(block)
        pos = end
    new_parts.append(text[pos:])
    out = "".join(new_parts)

    if patched == 0:
        return 0

    bak = path.with_suffix(path.suffix + ".bak-gmshop66")
    shutil.copy2(path, bak)
    print(f"Backup: {bak}")
    path.write_text(out, encoding="utf-8")
    print(f"Patched {patched} server block(s) in {path}")
    return patched


def main() -> int:
    args = [a for a in sys.argv[1:] if a]
    if not args:
        print(
            "Usage: fix-nginx-gmshop66-proxy.py [--show|--inspect] <nginx.conf> [more.conf ...]",
            file=sys.stderr,
        )
        return 2

    if args[0] == "--inspect":
        return inspect_merged_config()

    show_only = False
    if args[0] == "--show":
        show_only = True
        args = args[1:]
    if not args:
        print("No files given.", file=sys.stderr)
        return 2

    paths: list[Path] = []
    for a in args:
        if "*" in a:
            paths.extend(Path(p) for p in glob.glob(a))
            continue
        p = Path(a)
        if p.is_dir():
            paths.extend(f for f in sorted(p.iterdir()) if f.is_file())
        else:
            paths.append(p)

    seen: set[Path] = set()
    uniq = []
    for p in paths:
        try:
            r = p.resolve()
        except OSError:
            r = p
        if r in seen or not p.is_file():
            continue
        seen.add(r)
        uniq.append(p)

    if show_only:
        for p in uniq:
            if "gmshop66.ru" in p.read_text(encoding="utf-8", errors="replace"):
                show_gmshop66(p, p.read_text(encoding="utf-8", errors="replace"))
        return 0

    total = 0
    for p in uniq:
        if "gmshop66.ru" not in p.read_text(encoding="utf-8", errors="replace"):
            continue
        total += process_file(p)
    if total == 0:
        print("Nothing to do: нет HTTPS-блока gmshop66.ru, где в первом location / нет proxy на :3000.")
        print("Уточните файлы: sudo grep -rl gmshop66 /etc/nginx")
        print("Затем: sudo python3 .../fix-nginx-gmshop66-proxy.py --show <файл>")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
