import socketio
import sys

sio = socketio.Client()

@sio.event
def connect():
    print("connected to bridge")

@sio.event
def message(data):
    print(f"\n[browser] {data['body']}\n> ", end="", flush=True)

sio.connect("http://172.16.138.188:9010")

try:
    while True:
        msg = input("> ").strip()
        if not msg:
            continue
        sio.emit("bridge-message", {"author": "python", "body": msg})
except (KeyboardInterrupt, EOFError):
    print("\nbye!")
finally:
    sio.disconnect()
