# ##### BEGIN GPL LICENSE BLOCK #####
#
#  This program is free software; you can redistribute it and/or
#  modify it under the terms of the GNU General Public License
#  as published by the Free Software Foundation; either version 2
#  of the License, or (at your option) any later version.
#
#  This program is distributed in the hope that it will be useful,
#  but WITHOUT ANY WARRANTY; without even the implied warranty of
#  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#  GNU General Public License for more details.
#
#  You should have received a copy of the GNU General Public License
#  along with this program; if not, write to the Free Software Foundation,
#  Inc., 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301, USA.
#
# ##### END GPL LICENSE BLOCK #####
import ConfigParser
import json
import os
from threading import Thread
import smtplib

import tornado.ioloop
import tornado.web
import tornado.websocket

DEFAULT_CFG_PATH = "%s%spmchat.cfg" % \
  (os.path.dirname(os.path.abspath(__file__)), os.sep)

enable_notify = False
enable_dbg = True
clients = []
cfg = None

def dbg(*args):
    if not enable_dbg:
        return
    print(args)

def load_config(cfg_name = DEFAULT_CFG_PATH):
    cfg = ConfigParser.RawConfigParser()
    cfg.readfp(open(cfg_name))
    cfg.read(cfg_name)
    return cfg

def notify_me(username):
    if not enable_notify:
        return
    host = cfg.get('SMSNotification', 'SMTPHost')
    port = cfg.getint('SMSNotification', 'SMTPPort')
    login = cfg.get('SMSNotification', 'SMTPLogin')
    password = cfg.get('SMSNotification', 'SMTPPassword')
    notify_from = cfg.get('SMSNotification', 'From')
    gateway_email = cfg.get('SMSNotification', 'GatewayEmail')

    server = smtplib.SMTP(host, port)
    server.starttls()
    server.login(login, password)
    server.sendmail(notify_from, gateway_email, \
      "%s has joined your chat. http://josephhowes.com/mobilechat.php" % \
      username)

class WebSocketChatHandler(tornado.websocket.WebSocketHandler):

    def open(self, *args):
        dbg("open", "WebSocketChatHandler")
        dbg("new client")
        clients.append(self)

    def check_origin(self, origin):
        allowed = cfg.get('Chat', 'AllowedOrigins')
        for ostr in allowed.split(","):
            if ostr == origin:
                return True
        return False;

    def on_message(self, message):        
        dbg(message)
        mobj = json.loads(message)
        dbg(mobj)
        typ = mobj["type"]
        if typ == "control":
            self.handle_control(mobj)
        elif typ == "message":
            self.handle_message(message)
        else:
            dbg("BAD MESSAGE")

    def handle_control(self, mobj):
        ctrlType = mobj["ctrlType"]
        if ctrlType == "new_user":
            self.handle_control_new_user(mobj)

    def handle_control_new_user(self, mobj):
        self.username = mobj["value"]
        self.announce_username()
        if enable_notify:
            thread = Thread(target=notify_me, args=(self.username,))
            thread.start()

    def announce_username(self):
        dao = { 'type':'announce', 'value':self.username }
        for client in clients:
            client.write_message(json.dumps(dao))

    def announce_username_left(self):
        dao = { 'type':'announceLeft', 'value':self.username }
        for client in clients:
            client.write_message(json.dumps(dao))

    def handle_message(self, message):
        for client in clients:
            client.write_message(message)
        
    def on_close(self):
        dbg('%s left' % self.username)
        clients.remove(self)
        self.announce_username_left()

cfg = load_config()
enable_notify = cfg.getboolean('SMSNotification', 'Enable')

app = tornado.web.Application([
    (r'/chat', WebSocketChatHandler),
])

app.listen(8888)
tornado.ioloop.IOLoop.instance().start()
