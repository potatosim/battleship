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
    this.logger.log(`Received action: [${action.type}] from - ${username ?? 'Unknown user'}!`);

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
    console.log({ type });
    switch (type) {
      case WebSocketActionTypes.Reg: {
        const { error, index, name } = data as OutgoingDataByActionType[WebSocketActionTypes.Reg];

        if (error) {
          this.logger.error(`Incorrect password for user - ${name}`);
          break;
        }

        this.logger.info(`Successfully login/register user - ${name}, userId - ${index}`);

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
