import { Ship } from './IncomingMessages';

export type Game = {
  id: number | string; // game id
  players: string[]; // usernames
  readyPlayers: number; // number of players who send a add_ships event
  shipsMap: Map<string, Ship[]>; // username and his ships
};
