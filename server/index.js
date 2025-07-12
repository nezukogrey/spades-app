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
const gameState = {};

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

    gameState[roomId] = {
    currentTurn: players[0].id,
    playedCards: []
  };

  io.to(roomId).emit("game-start", player.map(p => ({
    name: p.name,
    isBot: p.isBot,
    hand: p.isBot ? [] : p.hand,
  })));

  io.to(roomId).emit("turn-update", gameState[roomId]);
}

socket.on("play-card", ({ roomId, card }) => {
  const state = gameState[roomId];
  if (!state) return;

  const player = rooms[roomId].find(p => p.id === socket.id);
  if (!player || socket.id !== state.currentTurn) return;

  // Remove card from hand
  const cardIndex = player.hand.indexOf(card);
  if (cardIndex === -1) return;

  player.hand.splice(cardIndex, 1);
  state.playedCards.push({ player: player.name, card });

  // Rotate turn
  const currentIndex = rooms[roomId].findIndex(p => p.id === socket.id);
  const nextIndex = (currentIndex + 1) % rooms[roomId].length;
  state.currentTurn = rooms[roomId][nextIndex].id;

  io.to(roomId).emit("card-played", { player: player.name, card });
  io.to(roomId).emit("turn-update", state);
});


const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

