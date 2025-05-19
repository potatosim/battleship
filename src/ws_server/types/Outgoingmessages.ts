import { WebSocketActionTypes } from '../enums/WebSocketActionTypes';
import { Room } from './Room';
import { Ship } from './Ship';

export type Winner = { name: string; wins: number };

export type OutgoingDataByActionType = {
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
