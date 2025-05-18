import { OutgoingMessageTypes, WebSocketActionTypes } from '../enums/WebSocketActionTypes';
import { Ship } from './IncomingMessages';
import { Room } from './Room';

export type Winner = { name: string; wins: number };

type OutgoingDataByActionType = {
  [WebSocketActionTypes.Reg]: {
    name: string;
    index: number | string;
    error: boolean;
    errorText: string;
  };
  [WebSocketActionTypes.UpdateRoom]: Array<Omit<Room, 'game'>>;
  [WebSocketActionTypes.CreateGame]: {
    idGame: string | number;
    idPlayer: string | number;
  };
  [WebSocketActionTypes.StartGame]: {
    ships: Ship[];
    currentPlayerIndex: number | string;
  };
  [WebSocketActionTypes.Turn]: {
    currentPlayer: number | string;
  };
  [WebSocketActionTypes.Attack]: {
    position: {
      x: number;
      y: number;
    };
    currentPlayer: number | string;
    status: 'miss' | 'killed' | 'shot';
  };
  [WebSocketActionTypes.Finish]: {
    winPlayer: number | string;
  };
  [WebSocketActionTypes.UpdateWinners]: Winner[];
};

export const createOutgoingMessage = <ActionType extends OutgoingMessageTypes>(
  type: ActionType,
  data: OutgoingDataByActionType[ActionType],
): string => {
  console.log(`Outgoing: [${type}]`);
  return JSON.stringify({
    type,
    id: 0,
    data: JSON.stringify(data),
  });
};
