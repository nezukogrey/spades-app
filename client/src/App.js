import React, { useState, useEffect } from "react";
import io from "socket.io-client";

// Connect to backend using environment variable
const socket = io(process.env.REACT_APP_BACKEND_URL);

function App() {
  const [name, setName] = useState("");
  const [players, setPlayers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [hand, setHand] = useState([]);
  const [playedCards, setPlayedCards] = useState([]);
  const [currentTurn, setCurrentTurn] = useState(null);
  const [socketId, setSocketId] = useState(null);
  const roomId = "room1";

  const joinRoom = () => {
    if (!name.trim()) {
      alert("Please enter your name before joining!");
      return;
    }
    console.log("Joining room with name:", name);
    socket.emit("join-room", { roomId, name });
  };

  useEffect(() => {
    setSocketId(socket.id);

    socket.on("player-joined", (joinedName) => {
      setMessages(prev => {
        if (prev.includes(`${joinedName} has joined the game`)) return prev;
        return [...prev, `${joinedName} has joined the game`];
      });
    });

    socket.on("game-start", (playersInRoom) => {
      setPlayers(playersInRoom);

      const me = playersInRoom.find(p => !p.isBot && p.name === name);
      setHand(me ? me.hand : []);

      setMessages(prev => [...prev, "Game is starting!"]);
    });

    socket.on("turn-update", (state) => {
      setCurrentTurn(state.currentTurn);
    });

    socket.on("card-played", ({ player, card }) => {
      setPlayedCards(prev => [...prev, { player, card }]);
    });

    return () => {
      socket.off("player-joined");
      socket.off("game-start");
      socket.off("turn-update");
      socket.off("card-played");
    };
  }, [name]);

  const playCard = (card) => {
    if (currentTurn !== socketId) return;
    socket.emit("play-card", { roomId, card });
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "Arial" }}>
      <h1>Join Spades Game</h1>
      <input
        placeholder="Your Name"
        onChange={e => setName(e.target.value)}
        value={name}
      />
      <button type="button" onClick={joinRoom} style={{ marginLeft: "10px" }}>
        Join
      </button>

      <h2>Players in Game:</h2>
      <ul>
        {players.map((p, i) => (
          <li key={i}>
            {p.name} {p.isBot ? "(Bot)" : ""}
            {p.id === currentTurn && " ← current turn"}
          </li>
        ))}
      </ul>

      <h2>Messages:</h2>
      <ul>
        {messages.map((msg, i) => <li key={i}>{msg}</li>)}
      </ul>

      <h2>Your Hand:</h2>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {hand.map((card, i) => (
          <div
            key={i}
            style={{
              border: '1px solid black',
              padding: '8px',
              minWidth: '30px',
              textAlign: 'center',
              backgroundColor: currentTurn === socketId ? '#f9f9f9' : '#ccc',
              borderRadius: '5px',
              cursor: currentTurn === socketId ? 'pointer' : 'not-allowed'
            }}
            onClick={() => playCard(card)}
          >
            {card}
          </div>
        ))}
      </div>

      <h2>Table:</h2>
      <ul>
        {playedCards.slice(-4).map((p, i) => (
          <li key={i}>
            {p.player} played {p.card}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;

