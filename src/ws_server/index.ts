import WebSocket, { WebSocketServer } from 'ws';

import GameService from './services/Game.service';
import { LoggerService } from './services/Logger.service';
import ParserService from './services/Parser.service';
import RoomsService from './services/Rooms.service';
import { User } from './types/User';
import UsersService from './services/Users.service';
import { WebSocketActionTypes } from './enums/WebSocketActionTypes';
import WinnersService from './services/Winners.service';
import { delayedBotAttack } from './utils/delayedBotAttack';

const connections = new Map<WebSocket, User['name']>();

const PORT = 3000;

export const createWSS = () => {
  const loggerService = new LoggerService();
  const parserService = new ParserService(connections, loggerService);

  const usersService = new UsersService(connections);
  const roomsService = new RoomsService(connections, parserService);
  const gameService = new GameService(parserService);
  const winnersService = new WinnersService(connections, parserService);

  const wss = new WebSocketServer({
    port: PORT,
  });

  wss.on('connection', (ws) => {
    loggerService.info(`WebSocket server is listening on ws://localhost:${PORT}`);

    process.on('SIGINT', () => {
      loggerService.info('SIGINT received. Closing WebSocket...');

      connections.keys().forEach((connection) => connection.close(1000, 'Client shutting down'));
      setTimeout(() => {
        process.exit(0);
      }, 2000);
    });

    ws.on('close', () => {
      const leavedUser = usersService.getByConnection(ws);
      loggerService.info('Connection is closed');
      if (leavedUser && leavedUser.currentRoomId) {
        roomsService.deleteRoom(leavedUser.currentRoomId);
      }

      if (leavedUser && leavedUser.currentGameId) {
        const result = gameService.finishWhenLeave(leavedUser.currentGameId, leavedUser.id);

        if (result) {
          winnersService.update(result.winner);
          winnersService.sendWinners();
        }
      }
      loggerService.info(`User ${leavedUser?.name} lost the connection`);
      connections.delete(ws);
    });

    ws.on('message', (message) => {
      try {
        const { type, data } = parserService.parseIncomingMessageType(message, ws);

        // loggerService.log(`'Incoming data on ${type}:`, data);

        switch (type) {
          case WebSocketActionTypes.Reg: {
            const { name, password } =
              parserService.parseIncomingMessageData<WebSocketActionTypes.Reg>(data);

            const existedUser = usersService.getByUserName(name);

            if (existedUser && existedUser.password !== password) {
              return ws.send(
                parserService.createOutgoingMessage(WebSocketActionTypes.Reg, {
                  name: name,
                  index: '',
                  error: true,
                  errorText: 'Invalid login or password!',
                }),
              );
            }

            const user = existedUser
              ? existedUser.update({ connection: ws })
              : usersService.createUser({ connection: ws, name, password });

            ws.send(
              parserService.createOutgoingMessage(WebSocketActionTypes.Reg, {
                name: user.name,
                index: user.id,
                error: false,
                errorText: '',
              }),
            );
            connections.set(ws, name);
            roomsService.sendCurrentRooms(ws);
            winnersService.sendWinners(ws);
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
              parserService.parseIncomingMessageData<WebSocketActionTypes.AddUserToRoom>(data);
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
              parserService.parseIncomingMessageData<WebSocketActionTypes.AddShips>(data);

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
              parserService.parseIncomingMessageData<WebSocketActionTypes.Attack>(data);

            const result = gameService.attack(gameId as string, indexPlayer as string, x, y);

            if (!result) {
              return;
            }

            if (result.isSingleGame && result.status === 'miss') {
              delayedBotAttack(gameService, gameId as string);
              return;
            }

            if (result.status === 'finish' && result.winner) {
              winnersService.update(result.winner);
              winnersService.sendWinners();
            }

            return;
          }
          case WebSocketActionTypes.RandomAttack: {
            const { gameId, indexPlayer } =
              parserService.parseIncomingMessageData<WebSocketActionTypes.RandomAttack>(data);

            const result = gameService.randomAttack(gameId as string, indexPlayer as string);

            if (!result) {
              return;
            }

            if (result.isSingleGame && result.status === 'miss') {
              delayedBotAttack(gameService, gameId as string);
              return;
            }

            if (result.status === 'finish' && result.winner) {
              winnersService.update(result.winner);
              winnersService.sendWinners();
            }

            return;
          }
          case WebSocketActionTypes.SinglePlay: {
            const user = usersService.getByConnection(ws);

            if (!user) {
              return;
            }

            gameService.createSingleGame(user);

            return;
          }
          default:
            return null as never;
        }
      } catch (e) {
        loggerService.error('JSON parse error:', e);
      }
    });
  });
};
