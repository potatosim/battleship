import { WebSocketActionTypes } from '../enums/WebSocketActionTypes';
import { Game } from '../types/Game';
import { Ship } from '../types/IncomingMessages';
import { createOutgoingMessage } from '../types/Outgoingmessages';
import { Room } from '../types/Room';
import { User } from '../types/User';

import WebSocket from 'ws';

export default class RoomsService {
  private readonly rooms: Map<string, Room>;

  constructor(private readonly connections: Map<WebSocket, string>) {
    this.rooms = new Map();
  }

  getByRoomId(roomId: string): Room | null {
    const room = this.rooms.get(roomId);

    if (!room) {
      return null;
    }

    return room;
  }

  createRoom(user: User): Room {
    const roomId = crypto.randomUUID();
    const room: Room = {
      roomId,
      roomUsers: [
        {
          index: user.id,
          name: user.name,
        },
      ],
      game: null,
    };

    this.rooms.set(roomId, room);

    this.sendCurrentRooms(user.connection, true);
    return room;
  }

  sendCurrentRooms(currentConnection: WebSocket, broadcast: boolean = false): void {
    const roomsToSend = Array.from(this.rooms.values())
      .filter((room) => room.roomUsers.length === 1)
      .map((room) => ({
        roomId: room.roomId,
        roomUsers: room.roomUsers,
      }));

    const roomsMessage = createOutgoingMessage(WebSocketActionTypes.UpdateRoom, roomsToSend);

    return broadcast
      ? [...this.connections.keys()].forEach((connection) => connection.send(roomsMessage))
      : currentConnection.send(roomsMessage);
  }

  deleteRoom(roomId: string): void {
    this.rooms.delete(roomId);
  }

  updateRoom(room: Room, dto: Partial<Room>): Room {
    const updatedRoom = {
      ...room,
      ...dto,
    };

    this.rooms.set(room.roomId, updatedRoom);

    return updatedRoom;
  }

  createGame(room: Room, users: [User, User]) {
    const [firstUser, secondUser] = users;

    const game: Game = {
      id: room.roomId,
      players: [firstUser.name, secondUser.name],
      readyPlayers: 0,
      shipsMap: new Map(),
    };

    this.updateRoom(room, {
      roomUsers: [
        ...room.roomUsers,
        {
          name: secondUser.name,
          index: secondUser.id,
        },
      ],
      game,
    });

    users.forEach((user) =>
      user.connection.send(
        createOutgoingMessage(WebSocketActionTypes.CreateGame, {
          idGame: game.id,
          idPlayer: user.id,
        }),
      ),
    );

    this.sendCurrentRooms(secondUser.connection, true);
  }

  addShips(gameId: string, ships: Ship[], user: User | null): Room | null {
    const currentRoom = this.getByRoomId(gameId);

    if (!currentRoom || !currentRoom.game || !user) {
      return null;
    }

    const updatedReadyPlayers = currentRoom.game.readyPlayers + 1;

    const updatedRoom = this.updateRoom(currentRoom, {
      game: {
        ...currentRoom.game,
        readyPlayers: updatedReadyPlayers,
        shipsMap: currentRoom.game.shipsMap.set(user.name, ships),
      },
    });

    return updatedRoom;
  }
}

// const parseShipsToMatrixField = (ships: Ship[]) => {
//   const field = []

// };
