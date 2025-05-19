import { WebSocketActionTypes } from '../enums/WebSocketActionTypes';
import { createOutgoingMessage, Winner } from '../types/Outgoingmessages';
import { User } from '../types/User';

import WebSocket from 'ws';
export default class WinnersService {
  private readonly winners: Map<User['name'], number>;

  constructor(private readonly connections: Map<WebSocket, string>) {
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

    if (connection) {
      connection.send(createOutgoingMessage(WebSocketActionTypes.UpdateWinners, winnersToSend));

      return;
    }

    [...this.connections.keys()].forEach((connection) =>
      connection.send(createOutgoingMessage(WebSocketActionTypes.UpdateWinners, winnersToSend)),
    );
    return;
  }
}
