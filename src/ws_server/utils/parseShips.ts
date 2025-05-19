import { BattleField } from '../types/Game';
import { Ship } from '../types/Ship';
import { cellsAround } from './cellsAround';

export const parseShipsToMatrixField = (ships: Ship[]) => {
  const field: BattleField = Array.from({ length: 10 }, () => Array(10).fill(null));

  const counters: Record<Ship['type'], number> = {
    small: 1,
    medium: 1,
    large: 1,
    huge: 1,
  };

  const typePrefix: Record<Ship['type'], string> = {
    small: '1',
    medium: '2',
    large: '3',
    huge: '4',
  };

  const shipState: Record<string, number> = {};
  const neighborsState: Record<string, number[][]> = {};
  const shipCoordinates: Record<string, number[][]> = {};

  for (const ship of ships) {
    const { x, y } = ship.position;
    const { direction, length, type } = ship;

    const prefix = typePrefix[type];
    const number = counters[type]++;
    const label = `${prefix}-${number}`;

    shipState[label] = length;
    neighborsState[label] = cellsAround(ship);
    shipCoordinates[label] = [];

    for (let i = 0; i < length; i++) {
      const row = direction ? y + i : y;
      const col = direction ? x : x + i;

      field[row][col] = label;
      shipCoordinates[label].push([row, col]);
    }
  }

  return { battleField: field, shipState, neighborsState, shipCoordinates };
};
