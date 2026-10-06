#!/usr/bin/env python3
"""Stamp the script and style links in index.html with a short fingerprint of
each file (assets/app.js?v=1a2b3c4d). Run it before every push.

GitHub Pages lets browsers reuse files for ten minutes. Without the stamps, a
reload right after an update can pair the new page with the old scripts, and
new buttons do nothing. A changed file gets a new stamp, so browsers fetch it
fresh; unchanged files stay cached.

Usage:  python3 tools/stamp.py
"""

import hashlib
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INDEX = ROOT / "index.html"
LINK = re.compile(r'((?:src|href)=")(assets/[^"?]+)(?:\?v=[0-9a-f]+)?"')


def stamp(match):
    path = match.group(2)
    digest = hashlib.sha1((ROOT / path).read_bytes()).hexdigest()[:8]
    return f'{match.group(1)}{path}?v={digest}"'


def main():
    html = INDEX.read_text(encoding="utf-8")
    stamped = LINK.sub(stamp, html)
    if stamped == html:
        print("index.html is up to date")
        return
    INDEX.write_text(stamped, encoding="utf-8")
    for line in stamped.splitlines():
        if "?v=" in line:
            print(line.strip())


if __name__ == "__main__":
    main()
