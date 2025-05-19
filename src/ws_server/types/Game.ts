import { Ship } from './Ship';
import { Bot, User } from './User';

export type Game = {
  id: number | string; // game id
  players: (User | Bot)[]; // users
  readyPlayers: number; // number of players who send a add_ships event
  currentPlayer: string | null;
  shipsMap: Map<User['id'], Ship[]>; // userId and his ships
  battleField: Map<User['id'], BattleField>; // parsed ships to matrix
  shipsState: Map<
    User['id'],
    {
      [key: string]: number;
    }
  >;
  neighborsState: Map<User['id'], Record<string, number[][]>>;
  shipCoordinates: Map<User['id'], Record<string, number[][]>>;
  touchedCells: Map<User['id'], Set<string>>;
  isSingleGame: boolean;
};

type Player = {
  user: User | Bot;
  ships: Ship[];
  battleField: BattleField;
  shipState: Record<string, number>;
  neighborsState: Record<string, number[][]>;
  shipCoordinates: Record<string, number[][]>;
  touchedCells: Set<string>;
};

export type Players = {
  attacker: Player;
  target: Player;
};

export type BattleField = (string | null)[][];
