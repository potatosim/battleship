import WebSocket, { WebSocketServer } from 'ws';
import { parseIncomingMessageData, parseIncomingMessageType } from './types/IncomingMessages';
import { WebSocketActionTypes } from './enums/WebSocketActionTypes';
import { User } from './types/User';
import { createOutgoingMessage, Winner } from './types/Outgoingmessages';
import UsersService from './services/Users.service';
import RoomsService from './services/Rooms.service';
import GameService from './services/Game.service';

const connections = new Map<WebSocket, User['name']>();
const winners = new Map<User['name'], number>();

export const createWSS = () => {
  const usersService = new UsersService(connections);
  const roomsService = new RoomsService(connections);
  const gameService = new GameService(connections, winners);

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

        console.log(`Incoming: [${type}:${id}]`); // ${JSON.stringify(data, null, 2)}

        switch (type) {
          case WebSocketActionTypes.Reg: {
            const { name, password } = parseIncomingMessageData<WebSocketActionTypes.Reg>(data);

            const existedUser = usersService.getByUserName(name);

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

            const user = existedUser || usersService.createUser({ connection: ws, name, password });

            ws.send(
              createOutgoingMessage(WebSocketActionTypes.Reg, {
                name: user.name,
                index: user.id,
                error: false,
                errorText: '',
              }),
            );
            connections.set(ws, name);
            roomsService.sendCurrentRooms(ws);

            const winnersToSend: Winner[] = Array.from(winners.entries()).map(([name, wins]) => ({
              name,
              wins,
            }));
            ws.send(createOutgoingMessage(WebSocketActionTypes.UpdateWinners, winnersToSend));
            return;
          }
          case WebSocketActionTypes.CreateRoom: {
            const user = usersService.getByConnection(ws);

            if (!user || !!user.currentRoomId) {
              return;
            }

            return roomsService.createRoom(user);
          }
          case WebSocketActionTypes.AddUserToRoom: {
            const { indexRoom } =
              parseIncomingMessageData<WebSocketActionTypes.AddUserToRoom>(data);
            const targetRoom = roomsService.getByRoomId(indexRoom.toString()); // At least one member in room
            const user = usersService.getByConnection(ws); // User who's sends action

            const updatedRoom = roomsService.addUserToRoom(targetRoom, user);

            // user was added to room
            if (updatedRoom?.roomUsers.length === 2) {
              gameService.createGame(updatedRoom.roomUsers);
            }

            return;
          }
          case WebSocketActionTypes.AddShips: {
            const { gameId, ships, indexPlayer } =
              parseIncomingMessageData<WebSocketActionTypes.AddShips>(data);

            const updatedGame = gameService.addShips(
              gameId as string,
              ships,
              indexPlayer as string,
            );

            if (!updatedGame) {
              return;
            }

            if (updatedGame.readyPlayers === updatedGame.players.length) {
              gameService.startGame(updatedGame);
            }

            return;
          }
          case WebSocketActionTypes.Attack: {
            const { x, y, gameId, indexPlayer } =
              parseIncomingMessageData<WebSocketActionTypes.Attack>(data);
            gameService.attack(gameId as string, indexPlayer as string, x, y);

            return;
          }
          case WebSocketActionTypes.RandomAttack: {
            const { gameId, indexPlayer } =
              parseIncomingMessageData<WebSocketActionTypes.RandomAttack>(data);

            gameService.randomAttack(gameId as string, indexPlayer as string);

            return;
          }
          default:
            return null as never;
        }
      } catch (e) {
        console.error('JSON parse error:', e);
      }
    });
  });
};
