import { WebSocketActionTypes } from './../enums/WebSocketActionTypes';
export class LoggerService {
  private readonly red: '\x1b[31m';
  private readonly green: '\x1b[32m';
  private readonly blue: '\x1b[34m';
  private readonly reset: '\x1b[0m';

  constructor() {
    this.red = '\x1b[31m';
    this.green = '\x1b[32m';
    this.blue = '\x1b[34m';
    this.reset = '\x1b[0m';
  }
  log(message: string) {
    console.log(this.green + `${message}` + this.reset);
  }

  error(message: string) {
    console.error(this.red + `${message}` + this.reset);
  }

  info(message: string) {
    console.info(this.blue + `${message}` + this.reset);
  }

  logIncoming(type: WebSocketActionTypes, message: string, kind: 'info' | 'error' | 'log') {
    this[kind](`<== [Incoming message]:[${type}] ${message}`);
  }

  logOutgoing(type: WebSocketActionTypes, message: string, kind: 'info' | 'error' | 'log') {
    this[kind](`==> [Outgoing message]:[${type}] ${message}`);
  }
}
