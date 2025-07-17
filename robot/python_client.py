import socketio
import sys
import asyncio
from aiortc import RTCPeerConnection, RTCSessionDescription
from aiortc.sdp import candidate_from_sdp

sio = socketio.AsyncClient()
pc = RTCPeerConnection()
channel = None

server = "ws://192.168.1.18:9010"


@sio.event 
async def connect():
    await sio.emit('register-robot')
    print('Connection established')

@sio.on("ice-candidate")
async def on_ice_candidate(data):
    try:
        candidate = candidate_from_sdp(data["candidate"])
        candidate.sdpMid = data["sdpMid"]
        candidate.sdpMLineIndex = data["sdpMLineIndex"]

        await pc.addIceCandidate(candidate)
        print("Added ICE candidate")
    except Exception as e:
        print("Failed to add ICE:", e)

@pc.on("datachannel")
def on_datachannel(dc):
    global channel
    channel = dc
    print(f"DataChannel opened:{channel.label}")

    @channel.on("message")
    def on_message(msg):
        print(f"Received message: {msg}")
        if isinstance(msg, str):
            channel.send(f"Robot Received:{msg}")

@sio.on("offer")
async def on_offer(data):
    print("Received offer from browser")
    offer = RTCSessionDescription(sdp = data["sdp"], type = data['type'])
    await pc.setRemoteDescription(offer)

    answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)

    await sio.emit("answer",{
        "sdp" : pc.localDescription.sdp,
        "type" : pc.localDescription.type
    })

    print("set answer to browser")


@sio.event
def disconnect():
    print("Disconnected from server")

async def main():
    await sio.connect(server)
    await sio.wait()

if __name__  == "__main__":
    asyncio.run(main())