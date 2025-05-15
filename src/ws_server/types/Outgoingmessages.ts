import { OutgoingMessageTypes, WebSocketActionTypes } from '../enums/WebSocketActionTypes';
import { Ship } from './IncomingMessages';
import { Room } from './Room';

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
};

export const createOutgoingMessage = <ActionType extends OutgoingMessageTypes>(
  type: ActionType,
  data: OutgoingDataByActionType[ActionType],
): string => {
  return JSON.stringify({
    type,
    id: 0,
    data: JSON.stringify(data),
  });
};
