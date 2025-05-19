import { WebSocketActionTypes } from '../enums/WebSocketActionTypes';
import { Winner } from '../types/Outgoingmessages';
import { User } from '../types/User';

import WebSocket from 'ws';
import ParserService from './Parser.service';
export default class WinnersService {
  private readonly winners: Map<User['name'], number>;

  constructor(
    private readonly connections: Map<WebSocket, string>,
    private readonly parserService: ParserService,
  ) {
    this.winners = new Map();
  }

  update(userName: string) {
    const updatedWins = (this.winners.get(userName) || 0) + 1;

    this.winners.set(userName, updatedWins);
  }

  sendWinners(connection?: WebSocket) {
    const winnersToSend: Winner[] = Array.from(this.winners.entries()).map(([name, wins]) => ({
      name,
      wins,
    }));

    const messageToSend = this.parserService.createOutgoingMessage(
      WebSocketActionTypes.UpdateWinners,
      winnersToSend,
    );

    if (connection) {
      connection.send(messageToSend);

      return;
    }

    [...this.connections.keys()].forEach((connection) => connection.send(messageToSend));
    return;
  }
}
