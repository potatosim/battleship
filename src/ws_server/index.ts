import WebSocket, { WebSocketServer } from 'ws';
import { parseIncomingMessageData, parseIncomingMessageType, Ship } from './types/IncomingMessages';
import { WebSocketActionTypes } from './enums/WebSocketActionTypes';
import { User } from './types/User';
import { createOutgoingMessage, Winner } from './types/Outgoingmessages';
import UsersService from './services/Users.service';
import RoomsService from './services/Rooms.service';

const connections = new Map<WebSocket, User['name']>();
const winners = new Map<User['name'], Winner>();

export const createWSS = () => {
  const usersService = new UsersService(connections);
  const roomsService = new RoomsService(connections);

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
            ws.send(createOutgoingMessage(WebSocketActionTypes.UpdateWinners, []));
            return;
          }
          case WebSocketActionTypes.CreateRoom: {
            const user = usersService.getByConnection(ws);

            if (!user || !!user.currentRoomId) {
              return;
            }

            const room = roomsService.createRoom(user);

            usersService.updateUserByUserName(user.name, { currentRoomId: room.roomId });

            return;
          }
          case WebSocketActionTypes.AddUserToRoom: {
            const { indexRoom } =
              parseIncomingMessageData<WebSocketActionTypes.AddUserToRoom>(data);
            const targetRoom = roomsService.getByRoomId(indexRoom.toString()); // At least one member in room

            if (!targetRoom) {
              return;
            }

            const user = usersService.getByConnection(ws); // User who's sends action

            // attempt to join in room, when already here
            if (!user || targetRoom.roomId === user.currentRoomId) {
              return;
            }

            // attempt to join in another room, when already in room;
            if (user.currentRoomId) {
              roomsService.deleteRoom(user.currentRoomId as string);
              usersService.updateUserByUserName(user.name, { currentRoomId: indexRoom });
            }

            const userInTargetRoom = usersService.getByUserName(
              targetRoom.roomUsers[0].name,
            ) as User;

            roomsService.createGame(targetRoom, [user, userInTargetRoom]);
            return;
          }
          case WebSocketActionTypes.AddShips: {
            const { gameId, ships } = parseIncomingMessageData<WebSocketActionTypes.AddShips>(data);
            const user = usersService.getByConnection(ws);
            // const currentRoom = roomsService.getByRoomId(gameId as string);

            // if (!currentRoom || !currentRoom.game) {
            //   return;
            // }

            // const updatedReadyPlayers = currentRoom.game.readyPlayers + 1;

            // roomsService.updateRoom(currentRoom, {
            //   game: {
            //     ...currentRoom.game,
            //     readyPlayers: updatedReadyPlayers,
            //     shipsMap: currentRoom.game.shipsMap.set(userName, ships),
            //   },
            // });
            const room = roomsService.addShips(gameId as string, ships, user);

            if (!room) {
              return;
            }

            if (room.game?.readyPlayers === room.roomUsers.length) {
              // game start;
              const users = room.game.players.map(
                (username) => usersService.getByUserName(username) as User,
              );

              const currentPlayer = Math.random() > 0.5 ? users[0].id : users[1].id;

              users.forEach((user) => {
                user.connection.send(
                  createOutgoingMessage(WebSocketActionTypes.StartGame, {
                    currentPlayerIndex: user.id,
                    ships: room.game?.shipsMap.get(user.name) as Ship[],
                  }),
                );
                user.connection.send(
                  createOutgoingMessage(WebSocketActionTypes.Turn, {
                    currentPlayer,
                  }),
                );
              });
              return;
            }

            return;
          }
          case WebSocketActionTypes.Attack: {
            // const { x, y, gameId, indexPlayer } =
            //   parseIncomingMessageData<WebSocketActionTypes.Attack>(data);
            // const currentRoom = rooms.get(gameId.toString());

            // if (!currentRoom || !currentRoom.game) {
            //   return;
            // }
            // const attackedUserName = players.values().find(({ id }) => id === indexPlayer)?.name;

            // const victimName = currentRoom.game.players.filter(
            //   (userName) => userName !== attackedUserName,
            // )[0];

            // const attackedUserShips = currentRoom?.game.shipsMap.get(victimName);
            // console.log({ data, attackedUserShips });
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
