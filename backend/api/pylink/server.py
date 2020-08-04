import sys
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

ip = sys.argv[1]
port = int(sys.argv[2])
direc = sys.argv[3]

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        global direc
        super().__init__(*args, directory=direc, **kwargs)
    def log_message(self, format, *args):
        pass

server = ThreadingHTTPServer((ip,port),Handler)
server.serve_forever()