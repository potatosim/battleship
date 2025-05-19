import { Ship } from '../types/Ship';

export const generateShips = (gridSize = 10): Ship[] => {
  const fleetConfig = {
    small: { length: 1, count: 4 },
    medium: { length: 2, count: 3 },
    large: { length: 3, count: 2 },
    huge: { length: 4, count: 1 },
  };

  const matrix = Array.from({ length: gridSize }, () => Array(gridSize).fill(0));
  const ships: Ship[] = [];

  const isInBounds = (x: number, y: number) => x >= 0 && x < gridSize && y >= 0 && y < gridSize;

  const isAreaFree = (x: number, y: number, direction: boolean, length: number) => {
    for (let i = -1; i <= length; i++) {
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const nx = direction ? x + dx : x + i;
          const ny = direction ? y + i : y + dy;

          if (!isInBounds(nx, ny)) continue;
          if (matrix[ny][nx] !== 0) return false;
        }
      }
    }
    return true;
  };

  const placeShip = (x: number, y: number, direction: boolean, length: number, marker: number) => {
    for (let i = 0; i < length; i++) {
      const nx = direction ? x : x + i;
      const ny = direction ? y + i : y;
      matrix[ny][nx] = marker;
    }
  };

  for (const [type, { length, count }] of Object.entries(fleetConfig)) {
    let placed = 0;
    let attempts = 0;

    while (placed < count && attempts < 1000) {
      const direction = Math.random() < 0.5; // true = vertical
      const maxX = direction ? gridSize : gridSize - length;
      const maxY = direction ? gridSize - length : gridSize;

      const x = Math.floor(Math.random() * maxX);
      const y = Math.floor(Math.random() * maxY);

      if (isAreaFree(x, y, direction, length)) {
        placeShip(x, y, direction, length, 1); // mark occupied
        ships.push({ position: { x, y }, direction, length, type: type as Ship['type'] });
        placed++;
      }

      attempts++;
    }

    if (placed < count) {
      throw new Error(`Can't set ships "${type}"`);
    }
  }

  return ships;
};
