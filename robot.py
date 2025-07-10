import asyncio
import websockets
import json
from aiortc import RTCPeerConnection, RTCSessionDescription

SIGNALING_SERVER = "ws://192.168.1.4:9010"
MAX_RETRIES = 5

async def handle_signaling(ws):
    pc = RTCPeerConnection(configuration={
        "iceServers": [{"urls": "stun:stun.l.google.com:19302"}]
    })


    @pc.on("icecandidate")
    async def on_icecandidate(event):
        if event.candidate:
            await ws.send(json.dumps({
                "type": "ice",
                "data": {
                    "candidate": event.candidate.to_sdp(),
                    "sdpMid": event.candidate.sdp_mid,
                    "sdpMLineIndex": event.candidate.sdp_mline_index
                }
            }))
            print("Sent ICE candidate")

    await ws.send(json.dumps({"type": "register", "role": "robot"}))
    print("Sent: register as robot")

    retry_count = 0
    try:
        while retry_count < MAX_RETRIES:
            raw = await ws.recv()
            try:
                message = json.loads(raw)
                print(f"Received message: {message}")
            except json.JSONDecodeError:
                print(f"Warning: Ignoring non-JSON message: {raw}")
                continue

            msg_type = message.get("type")

            if msg_type == "viewer-request":
                print("Viewer requested SDP offer")
                offer = await pc.createOffer()
                await pc.setLocalDescription(offer)
                await ws.send(json.dumps({
                    "type": "offer",
                    "data": {
                        "sdp": pc.localDescription.sdp,
                        "sdpType": pc.localDescription.type
                    }
                }))
                print("Sent offer")

            elif msg_type == "answer":
                print("Got answer from viewer")
                answer = RTCSessionDescription(sdp=message["data"]["sdp"], type=message["data"]["sdpType"])
                await pc.setRemoteDescription(answer)

            elif msg_type == "ice":
                print("Got ICE candidate")
                try:
                    from aiortc.sdp import candidate_from_sdp
                    candidate = candidate_from_sdp(message["data"]["candidate"])
                    candidate.sdpMid = message["data"]["sdpMid"]
                    candidate.sdpMLineIndex = message["data"]["sdpMLineIndex"]
                    await pc.addIceCandidate(candidate)
                except Exception as e:
                    print(f"Error processing ICE candidate: {e}")

            retry_count = 0 
        else:
            print("Max retries reached, exiting signaling loop")

    except websockets.ConnectionClosed:
        print("Disconnected from server")
    except Exception as e:
        print(f"Signaling error: {e}")
    finally: await pc.close()

async def main():
    retry_count = 0
    while retry_count < MAX_RETRIES:
        try:
            print("Connecting to signaling server...")
            async with websockets.connect(SIGNALING_SERVER) as ws:
                await handle_signaling(ws)
                break 
        except Exception as e:
            print(f"Connection failed: {e}")
            retry_count += 1
            if retry_count < MAX_RETRIES:
                print(f"Retrying in 3 seconds... ({retry_count}/{MAX_RETRIES})")
                await asyncio.sleep(3)
            else:
                print("Max retries reached, giving up")

if __name__ == "__main__":
    asyncio.run(main())