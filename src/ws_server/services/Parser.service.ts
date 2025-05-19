import WebSocket, { RawData } from 'ws';
import { User } from '../types/User';
import { LoggerService } from './Logger.service';
import {
  IncomingMessageTypes,
  OutgoingMessageTypes,
  WebSocketActionTypes,
} from '../enums/WebSocketActionTypes';
import { IncomingDataByActionType, WebSocketIncomingMessage } from '../types/IncomingMessages';
import { OutgoingDataByActionType } from '../types/Outgoingmessages';

export default class ParserService {
  constructor(
    private readonly connections: Map<WebSocket, User['name']>,
    private readonly logger: LoggerService,
  ) {}

  parseIncomingMessageType<ActionType extends IncomingMessageTypes>(
    incomingMessage: RawData,
    ws?: WebSocket,
  ): WebSocketIncomingMessage<ActionType> {
    const action = JSON.parse(incomingMessage.toString()) as WebSocketIncomingMessage<ActionType>;
    const username = ws && this.connections.get(ws);
    this.logger.logIncoming(
      action.type,
      `Received message from - ${username ?? 'Unknown user'}!`,
      'info',
    );

    return action;
  }

  parseIncomingMessageData = <ActionType extends IncomingMessageTypes>(
    data: string,
  ): IncomingDataByActionType[ActionType] => {
    const parsedData = JSON.parse(data) as IncomingDataByActionType[ActionType];

    return parsedData;
  };

  createOutgoingMessage<ActionType extends OutgoingMessageTypes>(
    type: ActionType,
    data: OutgoingDataByActionType[ActionType],
  ): string {
    switch (type) {
      case WebSocketActionTypes.Reg: {
        const { error, index, name } = data as OutgoingDataByActionType[WebSocketActionTypes.Reg];

        if (error) {
          this.logger.logOutgoing(type, `Incorrect password for user - ${name}`, 'error');
          break;
        }
        this.logger.logOutgoing(
          type,
          `Successfully login/register user - ${name}, userId - ${index}`,
          'log',
        );
        break;
      }
      case WebSocketActionTypes.UpdateRoom: {
        const rooms = data as OutgoingDataByActionType[WebSocketActionTypes.UpdateRoom];
        this.logger.logOutgoing(
          type,
          `The list of rooms and players have been sent to users!`,
          'info',
        );
        if (rooms.length) {
          console.table(
            rooms.map((item) => ({ ...item, roomUsers: JSON.stringify(item.roomUsers) })),
          );
        }
        break;
      }
      case WebSocketActionTypes.CreateGame: {
        const { idGame, idPlayer } =
          data as OutgoingDataByActionType[WebSocketActionTypes.CreateGame];

        this.logger.logOutgoing(
          type,
          `Game created, gameId - ${idGame}. Sending game data to user, userId - ${idPlayer}`,
          'log',
        );
        break;
      }
      case WebSocketActionTypes.StartGame: {
        const { currentPlayerIndex } =
          data as OutgoingDataByActionType[WebSocketActionTypes.StartGame];
        this.logger.logOutgoing(
          type,
          `All ships are here! The game is started! Sending to user, userId - ${currentPlayerIndex}`,
          'log',
        );
        break;
      }
      case WebSocketActionTypes.Turn: {
        const { currentPlayer } = data as OutgoingDataByActionType[WebSocketActionTypes.Turn];
        this.logger.logOutgoing(
          type,
          `Turn changed! Current player is, userId - ${currentPlayer}`,
          'info',
        );
        break;
      }
      case WebSocketActionTypes.Finish: {
        const { winPlayer } = data as OutgoingDataByActionType[WebSocketActionTypes.Finish];
        this.logger.logOutgoing(
          type,
          `The game is over! Player with userId - ${winPlayer} won!`,
          'log',
        );
        break;
      }
      case WebSocketActionTypes.UpdateWinners: {
        const winners = data as OutgoingDataByActionType[WebSocketActionTypes.UpdateWinners];
        this.logger.logOutgoing(type, `The winners' table has been sent to users!`, 'info');
        if (winners.length) {
          console.table(winners);
        }
        break;
      }
      case WebSocketActionTypes.Attack: {
        const { status, position, currentPlayer } =
          data as OutgoingDataByActionType[WebSocketActionTypes.Attack];
        this.logger.logOutgoing(
          type,
          `Player(${currentPlayer}) attack result is - ${status}, attacked position is x:${position.x} y:${position.y}`,
          'log',
        );
        break;
      }
      default:
        this.logger.info('Unknown command!');
        break;
    }

    return JSON.stringify({
      type,
      id: 0,
      data: JSON.stringify(data),
    });
  }
}
