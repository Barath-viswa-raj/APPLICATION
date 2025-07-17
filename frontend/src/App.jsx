import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";

const socket = io("http://192.168.1.18:9010");
let pc = new RTCPeerConnection({
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
});

export default function Frontend() {
  const [msg, setMsg] = useState("");
  const [log, setLog] = useState([]);
  const channelRef = useRef(null);

  useEffect(() => {
    socket.emit("register-frontend");

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", {
          candidate: event.candidate.candidate,
          sdpMid: event.candidate.sdpMid,
          sdpMLineIndex: event.candidate.sdpMLineIndex
        });
      }
    };

    const channel = pc.createDataChannel("chat");
    channelRef.current = channel;

    channel.onopen = () => console.log("DataChannel open");
    channel.onmessage = (e) => {
      setLog((prev) => [...prev, "Robot: " + e.data]);
    };

    pc.createOffer()
      .then(offer => {
        return pc.setLocalDescription(offer);
      })
      .then(() => {
        socket.emit("offer", {
          sdp: pc.localDescription.sdp,
          type: pc.localDescription.type
        });
      });

    socket.on("answer", (data) => {
      const answerDesc = new RTCSessionDescription(data);
      pc.setRemoteDescription(answerDesc);
    });

    socket.on("ice-candidate", (data) => {
      const candidate = new RTCIceCandidate({
        candidate: data.candidate,
        sdpMid: data.sdpMid,
        sdpMLineIndex: data.sdpMLineIndex
      });
      pc.addIceCandidate(candidate);
    });
  }, []);

  const sendMessage = () => {
    if (channelRef.current?.readyState === "open") {
      channelRef.current.send(msg);
      setLog((prev) => [...prev, "You: " + msg]);
      setMsg("");
    }
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h2>Frontend DataChannel</h2>
      <div>
        <input
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          placeholder="Type a message"
        />
        <button onClick={sendMessage}>Send</button>
      </div>
      <div>
        <h3>Chat Log</h3>
        <ul>
          {log.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
