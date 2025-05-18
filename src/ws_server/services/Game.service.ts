import { BattleField, Game, Players } from '../types/Game';
import WebSocket from 'ws';
import { User } from '../types/User';
import { createOutgoingMessage, Winner } from '../types/Outgoingmessages';
import { WebSocketActionTypes } from '../enums/WebSocketActionTypes';
import { Ship } from '../types/IncomingMessages';

export default class GameService {
  private readonly games: Map<Game['id'], Game>;

  constructor(
    private readonly connection: Map<WebSocket, string>,
    private readonly winners: Map<User['name'], number>,
  ) {
    this.games = new Map();
  }

  getGameByGameId(gameId: string): Game | null {
    const game = this.games.get(gameId);

    if (!game) {
      return null;
    }

    return game;
  }

  createGame(users: User[]): Game {
    const gameId = crypto.randomUUID();

    const game: Game = {
      id: gameId,
      players: users,
      readyPlayers: 0,
      shipsMap: new Map(),
      battleField: new Map(),
      shipsState: new Map(),
      currentPlayer: null,
      neighborsState: new Map(),
      shipCoordinates: new Map(),
      touchedCells: new Map(),
    };

    users.forEach((user) =>
      user.connection.send(
        createOutgoingMessage(WebSocketActionTypes.CreateGame, {
          idGame: game.id,
          idPlayer: user.id,
        }),
      ),
    );

    this.games.set(gameId, game);

    return game;
  }

  updateGame(game: Game, dto: Partial<Game>): Game {
    const updatedGame = {
      ...game,
      ...dto,
    };

    this.games.set(game.id, updatedGame);

    return updatedGame;
  }

  addShips(gameId: string, ships: Ship[], userId: string) {
    const targetGame = this.games.get(gameId);

    if (!targetGame) {
      return null;
    }

    const updatedReadyPlayers = targetGame.readyPlayers + 1;

    const { battleField, shipState, neighborsState, shipCoordinates } =
      parseShipsToMatrixField(ships);

    const updatedGame = this.updateGame(targetGame, {
      readyPlayers: updatedReadyPlayers,
      shipsMap: targetGame.shipsMap.set(userId, ships),
      battleField: targetGame.battleField.set(userId, battleField),
      shipsState: targetGame.shipsState.set(userId, shipState),
      neighborsState: targetGame.neighborsState.set(userId, neighborsState),
      shipCoordinates: targetGame.shipCoordinates.set(userId, shipCoordinates),
      touchedCells: targetGame.touchedCells.set(userId, new Set()),
    });

    return updatedGame;
  }

  startGame(game: Game) {
    const currentPlayer = Math.random() > 0.5 ? game.players[0].id : game.players[1].id;

    game.players.forEach((user) => {
      user.connection.send(
        createOutgoingMessage(WebSocketActionTypes.StartGame, {
          currentPlayerIndex: user.id,
          ships: game.shipsMap.get(user.id as string) as Ship[],
        }),
      );

      user.connection.send(
        createOutgoingMessage(WebSocketActionTypes.Turn, {
          currentPlayer,
        }),
      );
    });

    this.updateGame(game, { currentPlayer });
  }

  attack(gameId: string, playerId: string, x: number, y: number) {
    const game = this.getGameByGameId(gameId);

    if (!game || game.currentPlayer !== playerId) {
      console.log('Skip attack');
      return null;
    }

    const { attacker, target } = game.players.reduce<Players>((acc, current) => {
      acc[playerId === current.id ? 'attacker' : 'target'] = {
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

    const targetCell = target.battleField[y][x];
    const isCellTouched = target.touchedCells.has(`${x}-${y}`);

    console.log(attacker.user.name, { x, y, targetCell });
    console.table(target.battleField);

    target.touchedCells.add(`${x}-${y}`);

    // miss
    if (!targetCell) {
      return this.handleMiss(game, attacker, target, x, y);
    }
    // shot or kill
    const updatedShipLives = isCellTouched
      ? target.shipState[targetCell]
      : target.shipState[targetCell] - 1;
    target.shipState[targetCell] = updatedShipLives;

    if (updatedShipLives > 0) {
      return this.handleShot(game, attacker, x, y);
    }

    // killed
    this.handleKill(game, attacker, target, targetCell);
    this.handleFinish(game, attacker, target);
  }

  randomAttack(gameId: string, playerId: string) {
    const game = this.getGameByGameId(gameId);
    if (!game) {
      return null;
    }
    const { target } = game.players.reduce<Players>((acc, current) => {
      acc[playerId === current.id ? 'attacker' : 'target'] = {
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

    let x = getRandomCoordinate();
    let y = getRandomCoordinate();

    let isCellTouched = target.touchedCells.has(`${x}-${y}`);

    while (isCellTouched) {
      x = getRandomCoordinate();
      y = getRandomCoordinate();
      isCellTouched = target.touchedCells.has(`${x}-${y}`);
    }
    this.attack(gameId, playerId, x, y);
  }

  private handleMiss(
    game: Game,
    attacker: Players['attacker'],
    target: Players['target'],
    x: number,
    y: number,
  ) {
    game.players.forEach((player) => {
      player.connection.send(
        createOutgoingMessage(WebSocketActionTypes.Attack, {
          status: 'miss',
          currentPlayer: attacker.user.id,
          position: { x, y },
        }),
      );
      player.connection.send(
        createOutgoingMessage(WebSocketActionTypes.Turn, {
          currentPlayer: target.user.id,
        }),
      );
    });

    this.updateGame(game, { currentPlayer: target.user.id });
  }

  private handleShot(game: Game, attacker: Players['attacker'], x: number, y: number) {
    game.players.forEach((player) => {
      player.connection.send(
        createOutgoingMessage(WebSocketActionTypes.Attack, {
          currentPlayer: attacker.user.id,
          position: { x, y },
          status: 'shot',
        }),
      );
      player.connection.send(
        createOutgoingMessage(WebSocketActionTypes.Turn, {
          currentPlayer: attacker.user.id,
        }),
      );
    });
    this.updateGame(game, { currentPlayer: attacker.user.id });
  }

  private handleKill(
    game: Game,
    attacker: Players['attacker'],
    target: Players['target'],
    targetCell: string,
  ) {
    game.players.forEach((player) => {
      target.shipCoordinates[targetCell].forEach(([y, x]) => {
        player.connection.send(
          createOutgoingMessage(WebSocketActionTypes.Attack, {
            status: 'killed',
            currentPlayer: attacker.user.id,
            position: { x, y },
          }),
        );
      });

      target.neighborsState[targetCell].forEach(([x, y]) => {
        player.connection.send(
          createOutgoingMessage(WebSocketActionTypes.Attack, {
            status: 'miss',
            position: { x, y },
            currentPlayer: attacker.user.id,
          }),
        );
      });
      player.connection.send(
        createOutgoingMessage(WebSocketActionTypes.Turn, {
          currentPlayer: attacker.user.id,
        }),
      );

      this.updateGame(game, { currentPlayer: attacker.user.id });

      console.table(target.shipState);
    });
  }

  private handleFinish(game: Game, attacker: Players['attacker'], target: Players['target']) {
    if (!Object.values(target.shipState).some((lives) => lives !== 0)) {
      // finish
      game.players.forEach((player) => {
        player.connection.send(
          createOutgoingMessage(WebSocketActionTypes.Finish, {
            winPlayer: attacker.user.id,
          }),
        );

        player.update({ currentGameId: null, currentRoomId: null });
      });

      this.winners.set(attacker.user.name, (this.winners.get(attacker.user.name) || 0) + 1);

      const winnersToSend: Winner[] = Array.from(this.winners.entries()).map(([name, wins]) => ({
        name,
        wins,
      }));

      Array.from(this.connection.keys()).forEach((connection) =>
        connection.send(createOutgoingMessage(WebSocketActionTypes.UpdateWinners, winnersToSend)),
      );
    }
  }
}

const getRandomCoordinate = () => {
  return Math.floor(Math.random() * 10);
};

const parseShipsToMatrixField = (ships: Ship[]) => {
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

const cellsAround = (ship: Ship) => {
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
