import http.server
import ssl

# Configuración del servidor
server_address = ('0.0.0.0', 8443)
httpd = http.server.HTTPServer(server_address, http.server.SimpleHTTPRequestHandler)

# Crear contexto SSL
context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
# Los certificados están en la misma carpeta
context.load_cert_chain(certfile='cert.pem', keyfile='key.pem')

# Aplicar SSL al socket
httpd.socket = context.wrap_socket(httpd.socket, server_side=True)

print("✓ Servidor HTTPS corriendo en https://0.0.0.0:8443")
print("\nObtén tu IP con: ipconfig")
print("Luego accede desde el móvil a: https://TU_IP:8443/?id=planta01\n")

httpd.serve_forever()