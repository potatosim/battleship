import { Game, Players } from '../types/Game';
import { User } from '../types/User';
import { WebSocketActionTypes } from '../enums/WebSocketActionTypes';
import { Ship } from '../types/Ship';
import { getPlayers } from '../utils/getPlayers';
import { getRandomCoordinate } from '../utils/getRandomCoordinate';
import { parseShipsToMatrixField } from '../utils/parseShips';
import { generateShips } from '../utils/generateShips';
import ParserService from './Parser.service';

export const BOT_ID = 'MY_SUPER_BOT';

export default class GameService {
  private readonly games: Map<Game['id'], Game>;

  constructor(private readonly parserService: ParserService) {
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
      isSingleGame: false,
    };

    users.forEach((user) => {
      user.connection.send(
        this.parserService.createOutgoingMessage(WebSocketActionTypes.CreateGame, {
          idGame: game.id,
          idPlayer: user.id,
        }),
      );
      user.update({ currentGameId: game.id as string });
    });

    this.games.set(gameId, game);

    return game;
  }

  createSingleGame(user: User) {
    const gameId = crypto.randomUUID();

    const game: Game = {
      id: gameId,
      players: [
        user,
        {
          type: 'bot',
          id: BOT_ID,
          name: BOT_ID,
        },
      ],
      readyPlayers: 1,
      shipsMap: new Map(),
      battleField: new Map(),
      shipsState: new Map(),
      currentPlayer: null,
      neighborsState: new Map(),
      shipCoordinates: new Map(),
      touchedCells: new Map(),
      isSingleGame: true,
    };

    // generate bot data;
    const { battleField, neighborsState, shipCoordinates, shipState } = parseShipsToMatrixField(
      generateShips(),
    );

    game.battleField.set(BOT_ID, battleField);
    game.neighborsState.set(BOT_ID, neighborsState);
    game.shipCoordinates.set(BOT_ID, shipCoordinates);
    game.shipsState.set(BOT_ID, shipState);
    game.touchedCells.set(BOT_ID, new Set());

    user.connection.send(
      this.parserService.createOutgoingMessage(WebSocketActionTypes.CreateGame, {
        idGame: gameId,
        idPlayer: user.id,
      }),
    );

    user.update({ currentGameId: gameId });
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
    const currentPlayer = game.isSingleGame
      ? game.players[0].id
      : Math.random() > 0.5
      ? game.players[0].id
      : game.players[1].id;

    game.players.forEach((user) => {
      if (user.type === 'user') {
        user.connection.send(
          this.parserService.createOutgoingMessage(WebSocketActionTypes.StartGame, {
            currentPlayerIndex: user.id,
            ships: game.shipsMap.get(user.id as string) as Ship[],
          }),
        );

        user.connection.send(
          this.parserService.createOutgoingMessage(WebSocketActionTypes.Turn, {
            currentPlayer,
          }),
        );
      }
    });

    this.updateGame(game, { currentPlayer });
  }

  attack(
    gameId: string,
    playerId: string,
    x: number,
    y: number,
  ): {
    isSingleGame: boolean;
    status: 'miss' | 'shot' | 'killed' | 'finish';
    winner?: User['name'];
  } | null {
    const game = this.getGameByGameId(gameId);

    if (!game || game.currentPlayer !== playerId) {
      return null;
    }

    const { attacker, target } = getPlayers(game, playerId);

    const targetCell = target.battleField[y][x];
    const isCellTouched = target.touchedCells.has(`${x}-${y}`);

    target.touchedCells.add(`${x}-${y}`);

    // miss
    if (!targetCell) {
      this.handleMiss(game, attacker, target, x, y);
      return {
        status: 'miss',
        isSingleGame: game.isSingleGame,
      };
    }
    // shot or kill
    const updatedShipLives = isCellTouched
      ? target.shipState[targetCell]
      : target.shipState[targetCell] - 1;
    target.shipState[targetCell] = updatedShipLives;

    if (updatedShipLives > 0) {
      this.handleShot(game, attacker, x, y);
      return {
        status: 'shot',
        isSingleGame: game.isSingleGame,
      };
    }

    // killed
    this.handleKill(game, attacker, target, targetCell);

    return (
      this.handleFinish(game, attacker, target) || {
        status: 'killed',
        isSingleGame: game.isSingleGame,
      }
    );
  }

  randomAttack(gameId: string, playerId: string) {
    const game = this.getGameByGameId(gameId);
    if (!game) {
      return null;
    }
    const { target } = getPlayers(game, playerId);

    let x = getRandomCoordinate();
    let y = getRandomCoordinate();

    let isCellTouched = target.touchedCells.has(`${x}-${y}`);

    while (isCellTouched) {
      x = getRandomCoordinate();
      y = getRandomCoordinate();
      isCellTouched = target.touchedCells.has(`${x}-${y}`);
    }
    return this.attack(gameId, playerId, x, y);
  }

  private handleMiss(
    game: Game,
    attacker: Players['attacker'],
    target: Players['target'],
    x: number,
    y: number,
  ) {
    game.players.forEach((player) => {
      if (player.type === 'user') {
        player.connection.send(
          this.parserService.createOutgoingMessage(WebSocketActionTypes.Attack, {
            status: 'miss',
            currentPlayer: attacker.user.id,
            position: { x, y },
          }),
        );
        player.connection.send(
          this.parserService.createOutgoingMessage(WebSocketActionTypes.Turn, {
            currentPlayer: target.user.id,
          }),
        );
      }
    });

    this.updateGame(game, { currentPlayer: target.user.id });
  }

  private handleShot(game: Game, attacker: Players['attacker'], x: number, y: number) {
    game.players.forEach((player) => {
      if (player.type === 'user') {
        player.connection.send(
          this.parserService.createOutgoingMessage(WebSocketActionTypes.Attack, {
            currentPlayer: attacker.user.id,
            position: { x, y },
            status: 'shot',
          }),
        );
        player.connection.send(
          this.parserService.createOutgoingMessage(WebSocketActionTypes.Turn, {
            currentPlayer: attacker.user.id,
          }),
        );
      }
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
        if (player.type === 'user') {
          player.connection.send(
            this.parserService.createOutgoingMessage(WebSocketActionTypes.Attack, {
              status: 'killed',
              currentPlayer: attacker.user.id,
              position: { x, y },
            }),
          );
        }
      });

      target.neighborsState[targetCell].forEach(([x, y]) => {
        target.touchedCells.add(`${x}-${y}`);
        if (player.type === 'user') {
          player.connection.send(
            this.parserService.createOutgoingMessage(WebSocketActionTypes.Attack, {
              status: 'miss',
              position: { x, y },
              currentPlayer: attacker.user.id,
            }),
          );
        }
      });

      if (player.type === 'user') {
        player.connection.send(
          this.parserService.createOutgoingMessage(WebSocketActionTypes.Turn, {
            currentPlayer: attacker.user.id,
          }),
        );
      }
    });
    this.updateGame(game, { currentPlayer: attacker.user.id });
  }

  private handleFinish(
    game: Game,
    attacker: Players['attacker'],
    target: Players['target'],
  ): { winner: User['name']; status: 'finish'; isSingleGame: boolean } | null {
    if (!Object.values(target.shipState).some((lives) => lives !== 0)) {
      // finish
      game.players.forEach((player) => {
        if (player.type === 'user') {
          player.connection.send(
            this.parserService.createOutgoingMessage(WebSocketActionTypes.Finish, {
              winPlayer: attacker.user.id,
            }),
          );

          player.update({ currentGameId: null, currentRoomId: null });
        }
      });

      this.games.delete(game.id);

      return { winner: attacker.user.name, status: 'finish', isSingleGame: game.isSingleGame };
    }

    return null;
  }

  finishWhenLeave(gameId: string, leaveId: string): { winner: User['name'] } | null {
    const game = this.getGameByGameId(gameId);

    if (game) {
      const winner = game.players.find((player) => player.id !== leaveId);
      game.players.forEach((player) => {
        if (player.type === 'user') {
          player.update({ currentGameId: null, currentRoomId: null });
        }
      });

      if (winner) {
        if (winner.type === 'user') {
          winner.connection.send(
            this.parserService.createOutgoingMessage(WebSocketActionTypes.Finish, {
              winPlayer: winner.id,
            }),
          );
        }

        this.games.delete(game.id);

        return { winner: winner.name };
      }
    }

    return null;
  }
}
