"""Ligero servidor local para servir el CRM y hacer de proxy a patentechile.com.

Corre con:
    python server.py

Sirve los archivos estáticos desde el directorio actual y expone un endpoint
"/api/proxy?plate=AA1234" para intentar obtener el HTML público de
patentechile.com y evitar problemas de CORS en el navegador.

Variables de entorno útiles:
    PATENTECHILE_ORIGIN     Base de la URL de origen (por defecto https://www.patentechile.com/)
    PATENTECHILE_ATTEMPTS   Intentos de reintento antes de fallar (por defecto 3)
    PATENTECHILE_TIMEOUT    Timeout por solicitud en segundos (por defecto 20)

Nota: El entorno del runner puede bloquear conexiones salientes; en ese caso se
responderá con un error claro y deberás abrir la pestaña manualmente.
"""

from __future__ import annotations

import json
import os
import ssl
import time
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.error import URLError, HTTPError
from urllib.parse import parse_qs, urlparse
from urllib.request import Request, urlopen

ORIGIN = os.environ.get("PATENTECHILE_ORIGIN", "https://www.patentechile.com/")
REQUEST_TIMEOUT = int(os.environ.get("PATENTECHILE_TIMEOUT", "20"))
RETRY_ATTEMPTS = int(os.environ.get("PATENTECHILE_ATTEMPTS", "3"))
RETRY_BACKOFF = 1.5

HEADERS = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:123.0) Gecko/20100101 Firefox/123.0",
    "Accept-Language": "es-CL,es;q=0.9,en;q=0.8",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Referer": "https://www.patentechile.com/",
}


class ProxyHandler(SimpleHTTPRequestHandler):
    def do_GET(self):  # noqa: N802 - nombre heredado
        parsed = urlparse(self.path)
        if parsed.path == "/api/proxy":
            return self._handle_proxy(parsed)
        return super().do_GET()

    def _handle_proxy(self, parsed) -> None:
        params = parse_qs(parsed.query)
        plate = params.get("plate", [""])[0].strip()

        if not plate:
            return self._respond_json({"error": "Patente requerida"}, status=400)

        url = f"{ORIGIN}?patente={plate}"
        try:
            html = self._fetch_html(url)
        except Exception as exc:  # pragma: no cover - comportamiento de red
            message = f"No se pudo contactar a patentechile.com: {exc}"
            return self._respond_json({"error": message}, status=502)

        return self._respond_json({"html": html})

    def _fetch_html(self, url: str) -> str:
        last_error: str | None = None
        for attempt in range(1, max(1, RETRY_ATTEMPTS) + 1):
            try:
                request = Request(url, headers=HEADERS)
                context = ssl.create_default_context()
                with urlopen(request, context=context, timeout=REQUEST_TIMEOUT) as resp:
                    return resp.read().decode("utf-8", errors="ignore")
            except HTTPError as exc:  # pragma: no cover - comportamiento de red
                last_error = f"HTTP {exc.code}"
                if 400 <= exc.code < 500:
                    break
            except URLError as exc:  # pragma: no cover - comportamiento de red
                last_error = str(exc.reason)
            except Exception as exc:  # pragma: no cover - comportamiento de red
                last_error = str(exc)

            if attempt < RETRY_ATTEMPTS:
                time.sleep(RETRY_BACKOFF * attempt)

        raise RuntimeError(last_error or "Error desconocido")

    def _respond_json(self, payload: dict, status: int = 200) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format: str, *args) -> None:  # noqa: A003 - firma heredada
        return  # silencia logs en consola para el proxy


def run_server(port: int = 8000) -> None:
    server_address = ("", port)
    httpd = HTTPServer(server_address, ProxyHandler)
    print(f"Servidor local escuchando en http://localhost:{port}")
    print("Abre /index.html en tu navegador y usa el botón 'Buscar y rellenar datos'.")
    httpd.serve_forever()


if __name__ == "__main__":
    run_server()
