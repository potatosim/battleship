export enum WebSocketActionTypes {
  Reg = 'reg',
  UpdateRoom = 'update_room',
  CreateRoom = 'create_room',
  AddUserToRoom = 'add_user_to_room',
  CreateGame = 'create_game',
  AddShips = 'add_ships',
  StartGame = 'start_game',
  Turn = 'turn',
}

export type IncomingMessageTypes =
  | WebSocketActionTypes.Reg
  | WebSocketActionTypes.CreateRoom
  | WebSocketActionTypes.AddUserToRoom
  | WebSocketActionTypes.AddShips;
export type OutgoingMessageTypes =
  | WebSocketActionTypes.UpdateRoom
  | WebSocketActionTypes.Reg
  | WebSocketActionTypes.CreateGame
  | WebSocketActionTypes.StartGame
  | WebSocketActionTypes.Turn;
