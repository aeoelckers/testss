"""Ligero servidor local para servir el CRM y hacer de proxy a patentechile.com.

Corre con:
    python server.py

Sirve los archivos estáticos desde el directorio actual y expone un endpoint
"/api/proxy?plate=AA1234" para intentar obtener el HTML público de
patentechile.com y evitar problemas de CORS en el navegador.

Nota: El entorno del runner puede bloquear conexiones salientes; en ese caso se
responderá con un error y deberás abrir la pestaña manualmente.
"""

from __future__ import annotations

import json
import ssl
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.error import URLError, HTTPError
from urllib.parse import parse_qs, urlparse
from urllib.request import Request, urlopen

ORIGIN = "https://www.patentechile.com/"


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
            request = Request(url, headers={"User-Agent": "Mozilla/5.0"})
            context = ssl.create_default_context()
            with urlopen(request, context=context, timeout=15) as resp:
                html = resp.read().decode("utf-8", errors="ignore")
        except HTTPError as exc:  # pragma: no cover - comportamiento de red
            return self._respond_json({"error": f"HTTP {exc.code}"}, status=exc.code)
        except URLError as exc:  # pragma: no cover - comportamiento de red
            return self._respond_json({"error": str(exc.reason)} , status=502)
        except Exception as exc:  # pragma: no cover - comportamiento de red
            return self._respond_json({"error": str(exc)}, status=500)

        return self._respond_json({"html": html})

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
