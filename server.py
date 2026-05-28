#!/usr/bin/env python3
"""Local dev server with API proxy for Jolpica F1 API."""
import http.server
import urllib.request
import urllib.error
import json
import os

PORT = int(os.environ.get("PORT", 8080))
API_BASE = "https://api.jolpi.ca/ergast/f1"
WEB_ROOT = os.path.dirname(os.path.abspath(__file__))


class ProxyHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=WEB_ROOT, **kwargs)

    def do_GET(self):
        if self.path.startswith("/api/"):
            self.proxy_api()
        else:
            super().do_GET()

    def proxy_api(self):
        api_path = self.path[4:]  # Remove /api/ prefix
        url = f"{API_BASE}{api_path}"

        try:
            req = urllib.request.Request(url, headers={"User-Agent": "GYX-F1-Calendar/1.0"})
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = resp.read()
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.send_header("Cache-Control", "public, max-age=300")
                self.end_headers()
                self.wfile.write(data)
        except urllib.error.HTTPError as e:
            self.send_response(e.code)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())
        except Exception as e:
            self.send_response(500)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.end_headers()

    def log_message(self, format, *args):
        if "/api/" in str(args[0]):
            print(f"[API] {args[0]}")
        else:
            pass  # Suppress static file logs


if __name__ == "__main__":
    print(f"\n  🏎  GYX's F1 Calendar — Dev Server")
    print(f"  ⇢  http://localhost:{PORT}")
    print(f"  ⇢  API proxy: /api/ → {API_BASE}")
    print(f"  ⇢  Press Ctrl+C to stop\n")

    server = http.server.HTTPServer(("", PORT), ProxyHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n  Server stopped.")
        server.server_close()
