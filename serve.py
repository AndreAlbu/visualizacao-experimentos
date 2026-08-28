#!/usr/bin/env python3
"""Servidor de desenvolvimento com cache desabilitado.

Uso:  python3 serve.py [porta]   (padrão: 4173)

O http.server padrão deixa o navegador usar cache heurístico, o que faz
edições nos módulos JS não aparecerem ao recarregar. Este wrapper envia
Cache-Control: no-store para que cada reload busque sempre a versão atual.
"""
import sys
from http.server import HTTPServer, SimpleHTTPRequestHandler


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        self.send_header('Expires', '0')
        super().end_headers()


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 4173
    print(f'Servindo em http://localhost:{port} (sem cache)')
    HTTPServer(('', port), NoCacheHandler).serve_forever()
