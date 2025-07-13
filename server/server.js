import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const HOST = "172.16.138.188";

const app = express();
app.use(cors());        

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '9010',         
    methods: ['GET', 'POST']
  }
});

io.on('connection', socket => {
  console.log(' Client connected', socket.id);

  socket.on('message', data => {
    console.log('relay:', data);
    socket.broadcast.emit('message', data);
  });

  socket.on('disconnect', () => console.log( socket.id, 'left'));
});

const PORT = 9010;
httpServer.listen(PORT,HOST, () =>
  console.log(`Socket bridge running on http://${HOST}:${PORT}`)
);
