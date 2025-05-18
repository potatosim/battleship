import { WebSocketActionTypes } from '../enums/WebSocketActionTypes';
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
      roomUsers: [user],
    };

    this.rooms.set(roomId, room);
    user.update({ currentRoomId: roomId });
    this.sendCurrentRooms();

    return room;
  }

  sendCurrentRooms(currentConnection?: WebSocket): void {
    const roomsToSend = Array.from(this.rooms.values())
      .filter((room) => room.roomUsers.length === 1)
      .map((room) => ({
        roomId: room.roomId,
        roomUsers: room.roomUsers,
      }));

    const roomsMessage = createOutgoingMessage(WebSocketActionTypes.UpdateRoom, roomsToSend);

    if (currentConnection) {
      currentConnection.send(roomsMessage);
      return;
    }

    [...this.connections.keys()].forEach((connection) => connection.send(roomsMessage));
    return;
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

  addUserToRoom(room: Room | null, user: User | null): Room | null {
    // attempt to join in room, when already here
    if (!room || !user || room.roomId === user.currentRoomId) {
      return null;
    }

    // attempt to join in another room, when already in room;
    if (user.currentRoomId) {
      this.deleteRoom(user.currentRoomId as string);
      user.update({ currentRoomId: room.roomId });
    }

    const updatedRoom = this.updateRoom(room, {
      roomUsers: [...room.roomUsers, user],
    });

    this.sendCurrentRooms();

    return updatedRoom;
  }
}
