import WebSocket, { WebSocketServer } from 'ws';
import { parseIncomingMessageData, parseIncomingMessageType, Ship } from './types/IncomingMessages';
import { WebSocketActionTypes } from './enums/WebSocketActionTypes';
import { User } from './types/User';
import { createOutgoingMessage } from './types/Outgoingmessages';
import { Room } from './types/Room';
import { Game } from './types/Game';

const players = new Map<User['name'], User>();
const rooms = new Map<string, Room>();
const connections = new Map<WebSocket, User['name']>();

export const createWSS = () => {
  const wss = new WebSocketServer({
    port: 3000,
  });

  wss.on('connection', (ws) => {
    console.log('Connected');

    ws.on('close', () => {
      connections.delete(ws);
    });

    ws.on('message', (message) => {
      try {
        const { type, data, id } = parseIncomingMessageType(message);

        console.log(`Incoming: [${type}:${id}] ${JSON.stringify(data, null, 2)}`);

        switch (type) {
          case WebSocketActionTypes.Reg: {
            const { name, password } = parseIncomingMessageData<WebSocketActionTypes.Reg>(data);

            const existedUser = players.get(name);

            if (existedUser && existedUser.password !== password) {
              return ws.send(
                createOutgoingMessage(WebSocketActionTypes.Reg, {
                  name: name,
                  index: '',
                  error: true,
                  errorText: 'Invalid login or password!',
                }),
              );
            }

            const userId = crypto.randomUUID();

            if (!existedUser) {
              const user: User = {
                name,
                password,
                id: userId,
                connection: ws,
                currentRoomId: null,
              };
              players.set(name, user);
            }

            ws.send(
              createOutgoingMessage(WebSocketActionTypes.Reg, {
                name: existedUser?.name ?? name,
                index: existedUser?.id ?? userId,
                error: false,
                errorText: '',
              }),
            );
            connections.set(ws, name);
            sendCurrentRooms(ws);
            return;
          }
          case WebSocketActionTypes.CreateRoom: {
            const user = players.get(connections.get(ws) as string);

            if (!user || !!user.currentRoomId) {
              return;
            }

            const roomId = crypto.randomUUID();

            const room: Room = {
              roomId,
              game: null,
              roomUsers: [
                {
                  index: user.id,
                  name: user.name,
                },
              ],
            };

            players.set(user.name, { ...user, currentRoomId: roomId });
            rooms.set(roomId, room);
            sendCurrentRooms(ws, true);
            return;
          }
          case WebSocketActionTypes.AddUserToRoom: {
            const { indexRoom } =
              parseIncomingMessageData<WebSocketActionTypes.AddUserToRoom>(data);
            const targetRoom = rooms.get(indexRoom.toString()); // At least one member in room

            if (!targetRoom) {
              return;
            }

            const user = players.get(connections.get(ws) as string); // User who's sends action

            // attempt to join in room, when already here
            if (!user || targetRoom.roomId === user.currentRoomId) {
              return;
            }

            // attempt to join in another room, when already in room;
            if (user.currentRoomId) {
              rooms.delete(user.currentRoomId as string);
              players.set(user.name, { ...user, currentRoomId: indexRoom });
            }

            const userInTargetRoom = players.get(targetRoom.roomUsers[0].name) as User;

            const game: Game = {
              id: indexRoom,
              players: [user.name, userInTargetRoom.name],
              readyPlayers: 0,
              shipsMap: new Map(),
            };

            rooms.set(indexRoom as string, {
              ...targetRoom,
              roomUsers: [
                ...targetRoom.roomUsers,
                {
                  name: user.name,
                  index: user.id,
                },
              ],
              game,
            });

            ws.send(
              createOutgoingMessage(WebSocketActionTypes.CreateGame, {
                idGame: game.id,
                idPlayer: user.id,
              }),
            );

            userInTargetRoom.connection.send(
              createOutgoingMessage(WebSocketActionTypes.CreateGame, {
                idGame: game.id,
                idPlayer: userInTargetRoom.id,
              }),
            );

            sendCurrentRooms(ws, true);
            return;
          }
          case WebSocketActionTypes.AddShips: {
            const { gameId, ships } = parseIncomingMessageData<WebSocketActionTypes.AddShips>(data);
            const currentRoom = rooms.get(gameId as string);

            if (!currentRoom || !currentRoom.game) {
              return;
            }

            const userName = connections.get(ws) as string;
            const updatedReadyPlayers = currentRoom.game.readyPlayers + 1;

            rooms.set(gameId as string, {
              ...currentRoom,
              game: {
                ...currentRoom.game,
                readyPlayers: updatedReadyPlayers,
                shipsMap: currentRoom.game.shipsMap.set(userName, ships),
              },
            });

            if (updatedReadyPlayers === currentRoom.roomUsers.length) {
              // game start;
              const users = currentRoom.game.players.map(
                (username) => players.get(username) as User,
              );

              users.forEach((user) => {
                user.connection.send(
                  createOutgoingMessage(WebSocketActionTypes.StartGame, {
                    currentPlayerIndex: user.id,
                    ships: currentRoom.game?.shipsMap.get(user.name) as Ship[],
                  }),
                );
                user.connection.send(
                  createOutgoingMessage(WebSocketActionTypes.Turn, {
                    currentPlayer: users[0].id,
                  }),
                );
              });
              return;
            }

            return;
          }
          default:
            return null as never;
        }
      } catch (e) {
        console.error('Ошибка при разборе JSON:', e);
      }
    });
  });
};

const getCurrentRooms = () =>
  createOutgoingMessage(
    WebSocketActionTypes.UpdateRoom,
    Array.from(rooms.values())
      .filter((room) => room.roomUsers.length === 1)
      .map((room) => ({
        roomId: room.roomId,
        roomUsers: room.roomUsers,
      })),
  );

const sendCurrentRooms = (ws: WebSocket, broadcast: boolean = false): void => {
  return broadcast
    ? [...connections.keys()].forEach((connection) => connection.send(getCurrentRooms()))
    : ws.send(getCurrentRooms());
};
