const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

// Card 
const suits = ['♠', '♥', '♦', '♣'];
const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

const app = express();
app.use(cors());
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const rooms = {};

function generateDeck() {
  const deck = [];
  for (const suit of suits) {
    for (const value of values) {
      deck.push(`${value}${suit}`);
    }
  }
  return shuffle(deck);
}

function shuffle(array) {
  return array.sort(() => Math.random() - 0.5);
}


io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join-room", ({ roomId, name }) => {
    if (!rooms[roomId]) rooms[roomId] = [];
    rooms[roomId].push({ id: socket.id, name, isBot: false });
    socket.join(roomId);

    io.to(roomId).emit("player-joined", name);

    if (rooms[roomId].length === 4) {
      startGame(roomId);
    } else if (rooms[roomId].length >= 2) {
      setTimeout(() => {
        if (rooms[roomId].length < 4) {
          while (rooms[roomId].length < 4) {
            rooms[roomId].push({ id: `bot-${Math.random()}`, name: 'Bot', isBot: true });
          }
          startGame(roomId);
        }
      }, 10000);
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

function startGame(roomId) {
    const deck = generateDeck();
    const players = rooms[roomId];

    players.forEach((player, i) => {
        player.hand = deck.slice(i * 13, (i + 1) * 13);
    });
  io.to(roomId).emit("game-start", player.map(p => ({
    name: p.name,
    isBot: p.isBot,
    hand: p.isBot ? [] : p.hand,
  })));
}

server.listen(3001, () => console.log("Server running on port 3001"));
