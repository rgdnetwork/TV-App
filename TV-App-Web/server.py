#!/usr/bin/env python3
"""Servidor local para TV App. Solo escucha en 127.0.0.1."""

import http.server
import os
import sys
import threading
import webbrowser

ROOT = os.path.dirname(os.path.abspath(__file__))
os.chdir(ROOT)

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 4173
URL = f"http://127.0.0.1:{PORT}/"


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".html": "text/html; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".js": "text/javascript; charset=utf-8",
        ".json": "application/json; charset=utf-8",
        ".webmanifest": "application/manifest+json; charset=utf-8",
        ".png": "image/png",
        ".woff": "font/woff",
        ".woff2": "font/woff2",
    }

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, *args):
        pass


def main():
    try:
        server = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    except OSError:
        print(f"El puerto {PORT} ya esta en uso.")
        print(f"Abriendo {URL} por si TV App ya esta en marcha...")
        webbrowser.open(URL)
        return

    threading.Timer(0.8, lambda: webbrowser.open(URL)).start()
    print(f"TV App en marcha: {URL}")
    print("Deja esta ventana abierta mientras usas la app. Ctrl+C para cerrar.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    sys.exit(main())
