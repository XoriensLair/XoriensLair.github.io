from http.server import BaseHTTPRequestHandler, HTTPServer
from subprocess import Popen
import json
import urllib.parse
import os

import logging

def process_requestline(line):
    # b'command=test&kwargs%5Btest%5D=1'
    parsed = dict(urllib.parse.parse_qsl(str(line)[2:len(str(line))-1]))
    command = parsed.pop('command')
    kwargs = {}
    for k in parsed.keys():
        kwargs[k.split('[')[1].strip(']')] = parsed[k]
    return {'command':command,'kwargs':kwargs}

def make_handler(_link):
    class Handler(BaseHTTPRequestHandler):
        link = _link
        def __init__(self,request, client_address, server):
            super().__init__(request, client_address, server)
            self.link = _link

        def do_POST(self):
            try:
                command_json = process_requestline(self.rfile.read(int(self.headers['Content-Length'])))
                try:
                    code, data = Handler.link.commands[command_json['command']](command_json['kwargs'])
                    self.send_response(code)
                    self.send_header('Content-type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin','*')
                    self.end_headers()
                    self.wfile.write(bytes(json.dumps(data),'utf-8'))
                except KeyError:
                    self.send_response(404)
                    self.send_header('Access-Control-Allow-Origin','*')
                    self.end_headers()
            except ConnectionAbortedError:
                self.link.logger.error('Client connection aborted. Client: '+self.client_address[0]+':'+str(self.client_address[1]))
            except:
                self.link.logger.exception('Link Error')
        def log_message(self, format, *args):
            return
    return Handler

class PyLink:
    def __init__(self,ip,server_port,api_port,directory=None,python_path='python',server_path='server.py',**commands):
        self.server = None
        self.logger = logging.LoggerAdapter(logging.getLogger('root'),{'location':'PYLINK'})
        self.api = HTTPServer((ip,api_port),make_handler(self))
        self.commands = commands
        self.python_path = python_path
        self.ip = ip
        self.server_port = server_port
        self.directory = directory
        self.server_path = server_path
    
    def serve_forever(self):
        self.server = Popen([self.python_path,self.server_path,self.ip,str(self.server_port),str(self.directory)])
        self.logger.debug('Webserver launched, launching API server')
        self.api.serve_forever()
