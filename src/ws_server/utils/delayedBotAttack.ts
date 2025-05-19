import GameService, { BOT_ID } from '../services/Game.service';

export const delayedBotAttack = async (gameService: GameService, gameId: string) => {
  let botAttackResult = null;

  while (botAttackResult?.status !== 'miss') {
    await new Promise((res) => {
      setTimeout(() => {
        res(null);
      }, 1000);
    });

    botAttackResult = gameService.randomAttack(gameId as string, BOT_ID);
  }
};
