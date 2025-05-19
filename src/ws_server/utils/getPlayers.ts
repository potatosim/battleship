import { BattleField, Game, Players } from '../types/Game';
import { Ship } from '../types/Ship';

export const getPlayers = (game: Game, currentPlayerId: string) =>
  game.players.reduce<Players>((acc, current) => {
    acc[currentPlayerId === current.id ? 'attacker' : 'target'] = {
      user: current,
      ships: game.shipsMap.get(current.id) as Ship[],
      battleField: game.battleField.get(current.id) as BattleField,
      shipState: game.shipsState.get(current.id) as Record<string, number>,
      neighborsState: game.neighborsState.get(current.id) as Record<string, number[][]>,
      shipCoordinates: game.shipCoordinates.get(current.id) as Record<string, number[][]>,
      touchedCells: game.touchedCells.get(current.id) as Set<string>,
    };

    return acc;
  }, {} as Players);
