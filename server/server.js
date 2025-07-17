import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const HOST = "192.168.1.18";
let frontendSocket = null;
let robotSocket = null;

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

io.on('connection', socket => {
  console.log("New connection:", socket.id);

  socket.on("register-frontend", () => {
    frontendSocket = socket;
    console.log("Frontend registered", socket.id);
  });

  socket.on("register-robot", () => {
    robotSocket = socket;
    console.log("Robot registered", socket.id);
  });

  socket.on("offer", (data) => {
    console.log("Offer received from frontend");
    if (robotSocket) {
      robotSocket.emit("offer", data);
      console.log("Offer sent to robot");
    } else {
      console.log("No robot connected");
    }
  });

  socket.on("answer", (data) => {
    if (frontendSocket) {
      frontendSocket.emit("answer", data);
      console.log("Answer sent to frontend");
    } else {
      console.log("No frontend to send answer");
    }
  });

  socket.on("ice-candidate", (data) => {
    if (data.to === "robot" && robotSocket) {
      robotSocket.emit("ice-candidate", data.candidate);
    } else if (data.to === "frontend" && frontendSocket) {
      frontendSocket.emit("ice-candidate", data.candidate);
    }
  });

  socket.on("disconnect", () => {
    if (socket === frontendSocket) frontendSocket = null;
    if (socket === robotSocket) robotSocket = null;
    console.log(socket.id, 'disconnected');
  });
});

const PORT = 9010;
httpServer.listen(PORT, HOST, () =>
  console.log(`Socket bridge running on http://${HOST}:${PORT}`)
);
