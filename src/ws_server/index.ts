import WebSocket, { WebSocketServer } from 'ws';
import { parseIncomingMessageData, parseIncomingMessageType } from './types/IncomingMessages';
import { WebSocketActionTypes } from './enums/WebSocketActionTypes';
import { User } from './types/User';
import { createOutgoingMessage } from './types/Outgoingmessages';
import { Room } from './types/Room';

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

        console.log(`Incoming: [${type}:${id}]: ${JSON.stringify(data, null, 2)}`);

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
            const userName = connections.get(ws);
            const user = players.get(userName as string);

            const roomId = crypto.randomUUID();

            rooms.set(roomId, {
              roomId,
              roomUsers: user
                ? [
                    {
                      index: user.id,
                      name: user.name,
                    },
                  ]
                : [],
            });
            sendCurrentRooms(ws);
            return;
          }
          case WebSocketActionTypes.AddUserToRoom: {
            const { indexRoom } =
              parseIncomingMessageData<WebSocketActionTypes.AddUserToRoom>(data);
            const userName = connections.get(ws);
            const user = players.get(userName as string); // User who's sends action

            const targetRoom = rooms.get(indexRoom);

            if (
              !targetRoom ||
              !user ||
              targetRoom.roomUsers.some((item) => item.index === user.id)
            ) {
              return;
            }

            const userInRoomName = targetRoom.roomUsers[0].name;
            const userInRoom = players.get(userInRoomName);

            ws.send(
              createOutgoingMessage(WebSocketActionTypes.CreateGame, {
                idGame: indexRoom,
                idPlayer: user.id,
              }),
            );

            userInRoom?.connection?.send(
              createOutgoingMessage(WebSocketActionTypes.CreateGame, {
                idGame: indexRoom,
                idPlayer: userInRoom.id,
              }),
            );

            rooms.delete(indexRoom);
            [...connections.keys()].forEach((connection) => sendCurrentRooms(connection));
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

const sendCurrentRooms = (ws: WebSocket): void =>
  ws.send(createOutgoingMessage(WebSocketActionTypes.UpdateRoom, Array.from(rooms.values())));
