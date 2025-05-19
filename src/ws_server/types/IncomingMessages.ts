import { IncomingMessageTypes, WebSocketActionTypes } from '../enums/WebSocketActionTypes';
import { Ship } from './Ship';

export type IncomingDataByActionType = {
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
  [WebSocketActionTypes.Attack]: {
    gameId: number | string;
    x: number;
    y: number;
    indexPlayer: number | string; //userID of user, who attacked
  };
  [WebSocketActionTypes.RandomAttack]: {
    gameId: number | string;
    indexPlayer: number | string;
  };
  [WebSocketActionTypes.SinglePlay]: null;
};

export type WebSocketIncomingMessage<ActionType extends IncomingMessageTypes> = {
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
