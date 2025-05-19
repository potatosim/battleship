import { Ship } from '../types/Ship';

export const cellsAround = (ship: Ship) => {
  const {
    position: { x, y },
    length,
    direction,
  } = ship;
  const [dx, dy] = direction ? [0, 1] : [1, 0];
  const around = [];
  around.push([x - dx, y - dy], [x + dx * length, y + dy * length]);
  for (let i = -1; i < length + 1; ++i)
    around.push([x - dy + i * dx, y - dx + i * dy], [x + dy + i * dx, y + dx + i * dy]);
  return around.filter(([x, y]) => 0 <= x && x < 10 && 0 <= y && y < 10);
};
