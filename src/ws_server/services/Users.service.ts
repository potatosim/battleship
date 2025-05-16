import { User } from '../types/User';
import WebSocket from 'ws';

export default class UsersService {
  private readonly users: Map<User['name'], User>; // username: User

  constructor(private readonly connections: Map<WebSocket, User['name']>) {
    this.users = new Map();
  }

  createUser({
    name,
    password,
    connection,
  }: {
    name: string;
    password: string;
    connection: WebSocket;
  }): User {
    const userId = crypto.randomUUID();

    const user: User = {
      name,
      password,
      id: userId,
      currentRoomId: null,
      connection,
    };

    this.users.set(name, user);

    return user;
  }

  getByUserName(username: string): User | null {
    const user = this.users.get(username);

    if (!user) {
      return null;
    }

    return user;
  }

  getByUserId(userId: string): User | null {
    const user = [...this.users.values()].find((user) => user.id === userId);

    if (!user) {
      return null;
    }

    return user;
  }

  getByConnection(connection: WebSocket): User | null {
    const username = this.connections.get(connection);

    if (!username) {
      return null;
    }

    const user = this.users.get(username);

    if (!user) {
      return null;
    }

    return user;
  }

  updateUserByUserName(username: string, dto: Partial<User>): User | null {
    const user = this.users.get(username);

    if (!user) {
      return null;
    }

    const updatedUser: User = {
      ...user,
      ...dto,
    };

    this.users.set(username, updatedUser);

    return updatedUser;
  }

  updateUserByUserId(userId: string, dto: Partial<User>): User | null {
    const user = this.getByUserId(userId);

    if (!user) {
      return null;
    }

    return this.updateUserByUserName(user.name, dto);
  }
}
