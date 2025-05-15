import { OutgoingMessageTypes, WebSocketActionTypes } from '../enums/WebSocketActionTypes';
import { Room } from './Room';

type OutgoingDataByActionType = {
  [WebSocketActionTypes.Reg]: {
    name: string;
    index: number | string;
    error: boolean;
    errorText: string;
  };
  [WebSocketActionTypes.UpdateRoom]: Array<Room>;
  [WebSocketActionTypes.CreateGame]: {
    idGame: string | number;
    idPlayer: string | number;
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
