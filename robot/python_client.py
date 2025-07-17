import asyncio
import socketio
from aiortc import RTCPeerConnection, RTCSessionDescription, RTCDataChannel
from aiortc.sdp import candidate_from_sdp
import aioconsole

SIGNALING_SERVER = "http://192.168.1.18:9010"

sio = socketio.AsyncClient()
pc = RTCPeerConnection()
data_channel = None
message_queue = asyncio.Queue()

@sio.event
async def connect():
    print("Connected to signaling server")
    await sio.emit("register-robot")

@sio.on("offer")
async def on_offer(data):
    global data_channel

    print("Received offer from frontend")
    offer = RTCSessionDescription(sdp=data["sdp"], type=data["type"])
    await pc.setRemoteDescription(offer)

    @pc.on("datachannel")
    def on_datachannel(channel: RTCDataChannel):
        global data_channel
        data_channel = channel
        print("DataChannel received from frontend")

        @channel.on("message")
        def on_message(message):
            print("Message from frontend:", message)

    answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)
    await sio.emit("answer", {
        "sdp": pc.localDescription.sdp,
        "type": pc.localDescription.type
    })
    print("Sent answer to frontend")

@sio.on("ice-candidate")
async def on_ice(data):
    try:
        candidate = candidate_from_sdp(f"a={data['candidate']}")
        candidate.sdpMid = data["sdpMid"]
        candidate.sdpMLineIndex = data["sdpMLineIndex"]
        await pc.addIceCandidate(candidate)
        print("Added ICE candidate")
    except Exception as e:
        print("Failed to add ICE:", e)

async def send_loop():
    while True:
        if data_channel and data_channel.readyState == "open":
            msg = await aioconsole.ainput("Type message to send to frontend: ")
            if msg.strip():
                data_channel.send(msg)
        await asyncio.sleep(0.1)

async def main():
    await sio.connect(SIGNALING_SERVER)
    await sio.wait()

if __name__ == "__main__":
    loop = asyncio.get_event_loop()
    loop.create_task(send_loop())
    loop.run_until_complete(main())
