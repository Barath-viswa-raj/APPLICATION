import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const socket = io('http://172.16.138.188:9010');  

export default function App() {
  const [log, setLog] = useState([]);
  const [text, setText] = useState('');

  useEffect(() => {
    socket.on('message', data =>
      setLog(prev => [...prev, { ...data, side: 'remote' }])
    );
    return () => socket.off('message');
  }, []);

  const send = () => {
    if (!text.trim()) return;
    const msg = { author: 'browser', body: text.trim() };
    socket.emit('message', msg);
    setLog(prev => [...prev, { ...msg, side: 'local' }]);
    setText('');
  };

  return (
    <main style={{ maxWidth: 600, margin: '2rem auto', fontFamily: 'sans-serif' }}>
      <h2>Socket</h2>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        rows={3}
        style={{ width: '100%' }}
        placeholder="Type here and hit Send"
      />
      <button onClick={send} style={{ marginTop: 8, padding: '6px 12px' }}>
        Send
      </button>

      <hr />
      <h3>Message log</h3>
      <ul>
        {log.map((m, i) => (
          <li key={i}>
            <strong>{m.author}:</strong> {m.body}
          </li>
        ))}
      </ul>
    </main>
  );
}
