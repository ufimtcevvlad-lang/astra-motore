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

После правок: nginx -t && systemctl reload nginx
"""
from __future__ import annotations

import glob
import re
import shutil
import sys
from pathlib import Path

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


def has_proxy_to_next(block: str) -> bool:
    """Есть ли уже прокси именно на Next на этом сервере."""
    return bool(
        re.search(
            r"^\s*proxy_pass\s+http://127\.0\.0\.1:3000",
            block,
            re.MULTILINE,
        )
    )


def needs_proxy(block: str) -> bool:
    if "gmshop66.ru" not in block:
        return False
    low = block.lower()
    if "443" not in block and "ssl" not in low:
        return False
    if has_proxy_to_next(block):
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
                    if not re.search(
                        r"^\s*proxy_pass\s+http://127\.0\.0\.1:3000",
                        seg,
                        re.MULTILINE,
                    ):
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
        prox = has_proxy_to_next(block)
        print(f"  server block #{idx}: listen 443-ish={has443 or sslish}, proxy->3000={prox}")
        print("  ---")
        for line in block.splitlines()[:25]:
            print(f"  {line}")
        if block.count("\n") > 25:
            print("  ...")
        print()


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
        print("Usage: fix-nginx-gmshop66-proxy.py [--show] <nginx.conf> [more.conf ...]", file=sys.stderr)
        return 2

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
        print("Nothing to do: no gmshop66.ru HTTPS block missing proxy_pass to 127.0.0.1:3000.")
        print("Run with --show <file> to inspect server blocks.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
