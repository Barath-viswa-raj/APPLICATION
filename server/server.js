// server.js
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());
const http = createServer(app);
const io = new Server(http, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

let robotSocket = null;
let frontendSocket = null;

io.on('connection', (socket) => {
  console.log('New connection:', socket.id);

  socket.on('register-robot', () => {
    robotSocket = socket;
    console.log('Robot registered:', socket.id);
  });

  socket.on('register-frontend', () => {
    frontendSocket = socket;
    console.log('Frontend registered:', socket.id);
  });

  socket.on('offer', (data) => {
    console.log('Offer → robot');
    robotSocket?.emit('offer', data);
  });

  socket.on('answer', (data) => {
    console.log('Answer → frontend');
    frontendSocket?.emit('answer', data);
  });

  socket.on('ice-candidate', (candidate) => {
    if (socket === frontendSocket) {
      robotSocket?.emit('ice-candidate', candidate);
    } else {
      frontendSocket?.emit('ice-candidate', candidate);
    }
  });

  socket.on('disconnect', () => {
    console.log('Disconnected:', socket.id);
    if (socket === robotSocket) robotSocket = null;
    if (socket === frontendSocket) frontendSocket = null;
  });
});

const port = 9010;
http.listen(port, '0.0.0.0', () => console.log(`Server listening on :${port}`));
