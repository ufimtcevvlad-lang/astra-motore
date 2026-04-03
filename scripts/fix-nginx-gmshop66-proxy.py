#!/usr/bin/env python3
"""
Добавляет в HTTPS-блок(и) Nginx для gmshop66.ru прокси на Next.js (127.0.0.1:3000),
если в блоке ещё нет proxy_pass (типичная причина 404 после certbot).

Запуск на VPS от root:
  python3 scripts/fix-nginx-gmshop66-proxy.py /etc/nginx/sites-available/astramotors
  nginx -t && systemctl reload nginx
"""
from __future__ import annotations

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
    """Возвращает список (start, end, block) для каждого top-level server { ... }."""
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


def needs_proxy(block: str) -> bool:
    if "gmshop66.ru" not in block:
        return False
    if "443" not in block and "ssl" not in block:
        return False
    if "proxy_pass" in block:
        return False
    return True


def strip_location_slash_without_proxy(inner: str) -> str:
    """Убрать из тела server все `location / { ... }`, внутри которых нет proxy_pass."""
    inner2 = inner
    while True:
        m = re.search(r"\n\s*location\s*/\s*\{", inner2)
        if not m:
            break
        start = m.start()
        b = inner2.find("{", m.start())
        depth = 0
        k = b
        while k < len(inner2):
            if inner2[k] == "{":
                depth += 1
            elif inner2[k] == "}":
                depth -= 1
                if depth == 0:
                    seg = inner2[start : k + 1]
                    if "proxy_pass" not in seg:
                        inner2 = inner2[:start] + inner2[k + 1 :]
                    else:
                        inner2 = inner2[k + 1 :]
                    break
            k += 1
        else:
            break
    return inner2.rstrip()


def patch_block(block: str) -> str:
    """Вставить PROXY_BLOCK внутрь server { ... } перед закрывающей скобкой."""
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


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: fix-nginx-gmshop66-proxy.py /etc/nginx/sites-available/astramotors", file=sys.stderr)
        return 2
    path = Path(sys.argv[1])
    if not path.is_file():
        print(f"File not found: {path}", file=sys.stderr)
        return 1
    text = path.read_text(encoding="utf-8", errors="replace")
    blocks = extract_server_blocks(text)
    if not blocks:
        print("No server { } blocks found.", file=sys.stderr)
        return 1

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
        print("Nothing to do: no gmshop66 HTTPS block without proxy_pass, or proxy already set.")
        return 0

    bak = path.with_suffix(path.suffix + ".bak-gmshop66")
    shutil.copy2(path, bak)
    path.write_text(out, encoding="utf-8")
    print(f"Patched {patched} server block(s). Backup: {bak}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
