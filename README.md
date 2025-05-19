# 🛡️ Battleship WebSocket Server

## Game description

A WebSocket-based backend for a multiplayer Battleship game. Supports player registration, room management, game flow, and real-time communication.

- There is an inmemory DB with player data (login and password) storage
- Player can create game room or connect to the game room after login
- Player room data (players, game board, ships positions) storages in the server
- Game starts after 2 players are connected to the room and sent ships positions to the server
- Server sends move order
- Players should shoot in their's turn
- Server send back shot result
- If player hits or kills the ship, player should make one more shoot
- Player wins if he have killed all enemies ships
- It's possible to play with bot
- The player can create only one room and he can't enter this room until the other player joins it.
- If the player is in the one of the existing rooms, his room and his enemy's room are deleted.
- It's possible to choose already attacked cell, nothing happens, turn is still yours.

## 📦 Tech Stack

- **Node.js** v22.14.0+
- **TypeScript**
- **ws** (WebSocket library)

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/potatosim/battleship.git
cd battleship
git co development
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run the server

```bash
npm run start
```

## 📡 WebSocket Connection

- URL: ws://localhost:3000
- data value should be a json string

## Action types

- _reg_ - player registration/login(personal response)

- _create_game_ - game id and player id (unique id for user in this game)
- _start_game_ - information about game and player's ships positions
- _turn_ - who is shooting now
- _attack_ - coordinates of shot and status
- _finish_ - id of the winner

- _update_room_ - list of rooms and players in rooms(for all)
- _update_winners_ - send score table to players(for all)

- _single_play_ - play with bot
