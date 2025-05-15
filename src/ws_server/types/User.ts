import WebSocket from 'ws';

export type User = {
  name: string;
  password: string;
  id: string | number;
  connection: WebSocket;
};
