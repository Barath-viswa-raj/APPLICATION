import socketio
import asyncio
import base64
import cv2
from aiortc import RTCPeerConnection, RTCConfiguration, RTCIceServer

SIGNALING_SERVER_URL = "https://application-8mai.onrender.com/"

sio = socketio.AsyncClient()
pc = RTCPeerConnection(configuration=RTCConfiguration(iceServers=[
    RTCIceServer(urls=["stun:bn-turn1.xirsys.com"])
]))

@sio.event
async def connect():
    print("🔌 Connected to signaling server.")
    await sio.emit("register-robot")
    print("Waiting for 'take_snapshot' events...")

@sio.event
async def disconnect():
    print("🔌 Disconnected from signaling server.")

@sio.event
async def take_snapshot():
    print("📸 Snapshot request received.")
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("❌ Failed to open camera.")
        return

    ret, frame = cap.read()
    cap.release()

    if not ret:
        print("❌ Failed to read frame.")
        return

    _, jpeg = cv2.imencode('.jpg', frame)
    b64_img = base64.b64encode(jpeg.tobytes()).decode("utf-8")

    await sio.emit("snapshot", {"image": b64_img})
    print("📤 Snapshot sent to frontend.")

async def main():
    await sio.connect(SIGNALING_SERVER_URL)
    await sio.wait()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("🛑 Exiting...")
