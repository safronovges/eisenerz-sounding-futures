#!/usr/bin/env python3
"""Serve the site at http://localhost:8173 and tell browsers to recheck every
file on each load, so edits show up on a normal reload.

Usage:  python3 tools/serve.py [port]
"""

import functools
import http.server
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8173
    handler = functools.partial(NoCacheHandler, directory=str(ROOT))
    with http.server.ThreadingHTTPServer(("127.0.0.1", port), handler) as server:
        print(f"Serving on http://localhost:{port}  (Ctrl+C to stop)")
        server.serve_forever()


if __name__ == "__main__":
    main()
