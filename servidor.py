#!/usr/bin/env python3
"""
Servidor HTTP simple para test-blockchain.html
Solo necesitas ejecutar este archivo
"""

import http.server
import socketserver
import os
import webbrowser
import time
from threading import Timer

PORT = 8000

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Permitir CORS
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()
    
    def log_message(self, format, *args):
        # Log más limpio
        print(f"[{self.log_date_time_string()}] {format % args}")

def open_browser():
    """Abrir navegador automáticamente después de 1 segundo"""
    time.sleep(1)
    webbrowser.open(f'http://localhost:{PORT}/test-blockchain.html')

if __name__ == '__main__':
    # Cambiar al directorio donde está el script
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    print("\n" + "="*60)
    print("🚀 SERVIDOR LOCAL PARA test-blockchain.html")
    print("="*60)
    print(f"\n✅ Servidor corriendo en: http://localhost:{PORT}")
    print(f"✅ Abre en tu navegador: http://localhost:{PORT}/test-blockchain.html")
    print("\n💡 El navegador se abrirá automáticamente en 1 segundo...")
    print("\n⚠️  Para detener el servidor: Ctrl+C")
    print("="*60 + "\n")
    
    # Abrir navegador automáticamente
    Timer(1.0, open_browser).start()
    
    # Iniciar servidor
    with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n\n✋ Servidor detenido por el usuario")
            print("¡Hasta pronto! 👋\n")