import { RawData } from 'ws';
import { IncomingMessageTypes, WebSocketActionTypes } from '../enums/WebSocketActionTypes';

export type Ship = {
  position: {
    x: number;
    y: number;
  };
  direction: boolean;
  length: number;
  type: 'small' | 'medium' | 'large' | 'huge';
};

type IncomingDataByActionType = {
  [WebSocketActionTypes.Reg]: {
    name: string;
    password: string;
  };
  [WebSocketActionTypes.CreateRoom]: null;
  [WebSocketActionTypes.AddUserToRoom]: { indexRoom: string | number };
  [WebSocketActionTypes.AddShips]: {
    gameId: number | string;
    ships: Ship[];
    indexPlayer: number | string;
  };
};

type WebSocketIncomingMessage<ActionType extends IncomingMessageTypes> = {
  type: ActionType;
  data: string;
  id: 0;
};

type ParsedIncomingMessage<ActionType extends IncomingMessageTypes> = {
  type: ActionType;
  data: IncomingDataByActionType[ActionType];
  id: 0;
};

export type WebSocketIncomingMessages = WebSocketIncomingMessage<WebSocketActionTypes.Reg>;
export type ParsedWebSocketIncomingMessage = ParsedIncomingMessage<WebSocketActionTypes.Reg>;

export const parseIncomingMessageType = <ActionType extends IncomingMessageTypes>(
  incomingMessage: RawData,
): WebSocketIncomingMessage<ActionType> => {
  const action = JSON.parse(incomingMessage.toString()) as WebSocketIncomingMessage<ActionType>;

  return action;
};

export const parseIncomingMessageData = <ActionType extends IncomingMessageTypes>(
  data: string,
): IncomingDataByActionType[ActionType] => {
  return JSON.parse(data) as IncomingDataByActionType[ActionType];
};
