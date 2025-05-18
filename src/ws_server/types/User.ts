import WebSocket from 'ws';

export type User = {
  name: string;
  password: string;
  id: string;
  connection: WebSocket;
  currentRoomId: string | null;
  currentGameId: string | null;
  update: (userDto: Partial<Omit<User, 'update'>>) => User;
};
