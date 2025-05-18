import { BattleField, Game, Players } from '../types/Game';
import WebSocket from 'ws';
import { User } from '../types/User';
import { createOutgoingMessage } from '../types/Outgoingmessages';
import { WebSocketActionTypes } from '../enums/WebSocketActionTypes';
import { Ship } from '../types/IncomingMessages';

export default class GameService {
  private readonly games: Map<Game['id'], Game>;

  constructor(private readonly connection: Map<WebSocket, string>) {
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
      };

      return acc;
    }, {} as Players);

    const targetCell = target.battleField[y][x];

    console.log(attacker.user.name, { x, y, targetCell });
    console.table(target.battleField);

    // miss
    if (!targetCell) {
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

      return;
    }
    // shot or kill
    const updatedShipLives = target.shipState[targetCell] - 1;
    target.shipState[targetCell] = updatedShipLives;

    if (updatedShipLives > 0) {
      // shot
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
      return;
    }

    // killed
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

      console.table(target.shipState);

      if (!Object.values(target.shipState).some((lives) => lives !== 0)) {
        // finish
        player.connection.send(
          createOutgoingMessage(WebSocketActionTypes.Finish, {
            winPlayer: attacker.user.id,
          }),
        );
        player.update({ currentGameId: null, currentRoomId: null });
      }
    });
  }
}

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
