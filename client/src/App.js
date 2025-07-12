import React, { useState, useEffect } from "react";
import io from "socket.io-client";

// Connect to backend server
const socket = io("process.env.REACT_APP_BACKEND_URL");

function App() {
  const [name, setName] = useState("");
  const [players, setPlayers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [hand, setHand] = useState([]);
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
    // When someone joins, log it
    socket.on("player-joined", (name) => {
      setMessages(prev => {
        if (prev.includes(`${name} has joined the game`)) return prev;
        return [...prev, `${name} has joined the game`];
      });
    });

    // When the game starts, get players + hand
    socket.on("game-start", (playersInRoom) => {
      setPlayers(playersInRoom);

      const me = playersInRoom.find(p => !p.isBot && p.name === name);
      setHand(me ? me.hand : []);

      setMessages(prev => [...prev, "Game is starting!"]);
    });
  }, [name]);

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
          <div key={i} style={{
            border: '1px solid black',
            padding: '8px',
            minWidth: '30px',
            textAlign: 'center',
            backgroundColor: '#f9f9f9',
            borderRadius: '5px'
          }}>
            {card}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;

