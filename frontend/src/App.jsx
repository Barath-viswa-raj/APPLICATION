import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const socket = io('http://192.168.1.18:9010');

export default function App() {
  const [log, setLog] = useState([]);
  const [text, setText] = useState('');
  const [dc, setDc] = useState(null);
  const [channelReady, setChannelReady] = useState(false);

  useEffect(() => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    const channel = pc.createDataChannel('data');
    setDc(channel);

    const logMessage = (msg) => {
      setLog((prev) => [...prev, msg]);
      console.log(msg);
    };

    channel.onopen = () => {
      logMessage('DataChannel is open');
      setChannelReady(true);
    };

    channel.onmessage = (e) => {
      logMessage(`Robot: ${e.data}`);
    };

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit('ice-candidate', e.candidate.toJSON());
      }
    };

    socket.on('answer', async (answer) => {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        logMessage('Received answer from robot');
      } catch (err) {
        console.error('Failed to set answer:', err);
      }
    });

    socket.on('ice-candidate', async (candidate) => {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
        logMessage('Added ICE candidate from robot');
      } catch (err) {
        console.error('ICE candidate error:', err);
      }
    });

    socket.on('connect', () => {
      console.log('Connected to signaling server', socket.id);
      socket.emit('register-frontend');
      startConnection();
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from signaling server');
    });

    const startConnection = async () => {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('offer', offer);
        logMessage('Sent offer to robot');
      } catch (err) {
        console.error('Offer creation failed:', err);
      }
    };

    return () => {
      socket.disconnect();
      pc.close();
    };
  }, []);

  const send = () => {
    if (!text.trim()) return;

    if (!dc || dc.readyState !== 'open') {
      setLog((prev) => [...prev, 'DataChannel is not open']);
      return;
    }

    dc.send(text);
    setLog((prev) => [...prev, `You: ${text}`]);
    setText('');
  };

  return (
    <main style={{ fontFamily: 'sans-serif', maxWidth: 600, margin: '2rem auto' }}>
      <h2>WebRTC Robot Control</h2>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        style={{ width: '100%' }}
        placeholder="Type message for robot..."
      />
      <button
        onClick={send}
        disabled={!channelReady}
        style={{ marginTop: 10, padding: '6px 12px' }}
      >
        Send
      </button>

      <hr />
      <ul style={{ whiteSpace: 'pre-wrap', paddingLeft: '1rem' }}>
        {log.map((msg, i) => (
          <li key={i}>{msg}</li>
        ))}
      </ul>
    </main>
  );
}
