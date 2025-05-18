import { Ship } from './IncomingMessages';
import { User } from './User';

export type Game = {
  id: number | string; // game id
  players: User[]; // users
  readyPlayers: number; // number of players who send a add_ships event
  currentPlayer: string | null;
  shipsMap: Map<User['id'], Ship[]>; // userId and his ships
  battleField: Map<User['id'], BattleField>;
  shipsState: Map<
    User['id'],
    {
      [key: string]: number;
    }
  >;
  neighborsState: Map<User['id'], Record<string, number[][]>>;
  shipCoordinates: Map<User['id'], Record<string, number[][]>>;
};

type Player = {
  user: User;
  ships: Ship[];
  battleField: BattleField;
  shipState: Record<string, number>;
  neighborsState: Record<string, number[][]>;
  shipCoordinates: Record<string, number[][]>;
};

export type Players = {
  attacker: Player;
  target: Player;
};

export type BattleField = (string | null)[][];
