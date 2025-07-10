import React, { useEffect, useRef, useState } from "react";

const SIGNALING_SERVER = "ws://192.168.1.4:9010";
const ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];

function Viewer() {
  const socketRef = useRef(null);
  const pcRef = useRef(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const videoRef = useRef(null);
  const [ setIsConnected] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

  useEffect(() => {
    const initWebSocket = () => {
      if (socketRef.current && (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING)) {
        return; 
      }

      const socket = new WebSocket(SIGNALING_SERVER);
      socketRef.current = socket;

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pcRef.current = pc;

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.send(
            JSON.stringify({
              type: "ice",
              data: {
                candidate: event.candidate.candidate,
                sdpMid: event.candidate.sdpMid,
                sdpMLineIndex: event.candidate.sdpMLineIndex,
              },
            })
          );
          console.log("Sent ICE candidate");
        }
      };

      pc.ontrack = (event) => {
        console.log("Got remote stream");
        const [stream] = event.streams;
        setRemoteStream(stream);
      };

      socket.onopen = () => {
        console.log("Connected to signaling server");
        socket.send(JSON.stringify({ type: "register", role: "viewer" }));
        socket.send(JSON.stringify({ type: "viewer-request" }));
      };

      socket.onmessage = async (event) => {
        const message = JSON.parse(event.data);
        const { type, data } = message;
        console.log(type)

        if (type === "offer") {
          console.log("Received offer");
          await pc.setRemoteDescription(
            new RTCSessionDescription({
              type: data.sdpType,
              sdp: data.sdp,
            })
          );

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          socket.send(
            JSON.stringify({
              type: "answer",
              data: {
                sdp: answer.sdp,
                sdpType: answer.type,
              },
            })
          );
          console.log("Sent SDP answer");
        } else if (type === "ice") {
          console.log("Received ICE candidate");
          try {
            await pc.addIceCandidate({
              candidate: data.candidate,
              sdpMid: data.sdpMid,
              sdpMLineIndex: data.sdpMLineIndex,
            });
          } catch (e) {
            console.error("Error adding ICE candidate:", e);
          }
        }
      };

      socket.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      socket.onclose = (event) => {
        console.log("WebSocket closed:", event.code, event.reason || "No reason provided", "Was clean:", event.wasClean);
        setIsConnected(false);
        if (retryCount < MAX_RETRIES && !event.wasClean) {
          setRetryCount((prev) => prev + 1);
          console.log(`Reconnecting... Attempt ${retryCount + 1}/${MAX_RETRIES}`);
          setTimeout(initWebSocket, 3000); 
        } else {
          console.log("Max retries reached or clean close, stopping reconnection");
        }
      };
    };

    initWebSocket();
    return () => {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) socketRef.current.close();
      if (pcRef.current) pcRef.current.close();
    };
  }, ); 

  useEffect(() => {
    if (videoRef.current && remoteStream) {
      videoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  return (
    <div>
      <h2>Viewer</h2>
      <video ref={videoRef} autoPlay playsInline controls width="600" />
    <div>
      
    </div>
    </div>
  );
}

export default Viewer;