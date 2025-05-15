import WebSocket, { WebSocketServer } from 'ws';
import { parseIncomingMessageData, parseIncomingMessageType } from './types/IncomingMessages';
import { WebSocketActionTypes } from './enums/WebSocketActionTypes';
import { User } from './types/User';
import { createOutgoingMessage } from './types/Outgoingmessages';
import { Room } from './types/Room';

const players = new Map<string, User>();
const rooms = new Map<string, Room>();

export const createWSS = () => {
  const wss = new WebSocketServer({
    port: 3000,
  });

  wss.on('connection', (ws, req) => {
    console.log('Connected');

    ws.on('message', (message) => {
      console.log(req.headers);
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
                  index: name,
                  error: true,
                  errorText: 'Invalid password',
                }),
              );
            }

            if (!existedUser) {
              players.set(name, { name, password });
            }

            ws.send(
              createOutgoingMessage(WebSocketActionTypes.Reg, {
                name: name,
                index: name,
                error: false,
                errorText: '',
              }),
            );
            sendCurrentRooms(ws);
            return;
          }
          case WebSocketActionTypes.CreateRoom: {
            const uid = crypto.randomUUID();
            rooms.set(uid, {
              roomId: uid,
              roomUsers: [],
            });
            sendCurrentRooms(ws);
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
