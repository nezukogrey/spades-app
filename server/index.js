const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Update with your frontend URL if needed
    methods: ["GET", "POST"]
  }
});

const rooms = {};
const gameState = {};

function generateDeck() {
  const suits = ["♠", "♥", "♦", "♣"];
  const ranks = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
  const deck = [];

  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push(`${rank}${suit}`);
    }
  }

  // Shuffle deck
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
}

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

  io.to(roomId).emit("game-start", players.map(p => ({
    name: p.name,
    isBot: p.isBot,
    hand: p.isBot ? [] : p.hand,
    id: p.id
  })));

  io.to(roomId).emit("turn-update", gameState[roomId]);
}

io.on("connection", (socket) => {
  console.log("New connection:", socket.id);

  socket.on("join-room", ({ roomId, name }) => {
    socket.join(roomId);

    if (!rooms[roomId]) {
      rooms[roomId] = [];
    }

    rooms[roomId].push({ id: socket.id, name, isBot: false });
    io.to(roomId).emit("player-joined", name);

    const realPlayers = rooms[roomId].filter(p => !p.isBot);
    if (realPlayers.length === 2 && rooms[roomId].length < 4) {
      const bot1 = { id: `bot-${Math.random()}`, name: "Bot 1", isBot: true };
      const bot2 = { id: `bot-${Math.random()}`, name: "Bot 2", isBot: true };
      rooms[roomId].push(bot1, bot2);

      startGame(roomId);
    }
  });

  socket.on("play-card", ({ roomId, card }) => {
    const state = gameState[roomId];
    if (!state) return;

    const player = rooms[roomId].find(p => p.id === socket.id);
    if (!player || socket.id !== state.currentTurn) return;

    const cardIndex = player.hand.indexOf(card);
    if (cardIndex === -1) return;

    player.hand.splice(cardIndex, 1);
    state.playedCards.push({ player: player.name, card });

    const currentIndex = rooms[roomId].findIndex(p => p.id === socket.id);
    const nextIndex = (currentIndex + 1) % rooms[roomId].length;
    state.currentTurn = rooms[roomId][nextIndex].id;

    io.to(roomId).emit("card-played", { player: player.name, card });
    io.to(roomId).emit("turn-update", state);
  });

  socket.on("disconnect", () => {
    console.log("Disconnected:", socket.id);
    for (const roomId in rooms) {
      const index = rooms[roomId].findIndex(p => p.id === socket.id);
      if (index !== -1) {
        rooms[roomId].splice(index, 1);
        break;
      }
    }
  });
});

// Listen on dynamic port for Render, fallback to 3001 locally
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

