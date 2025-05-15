export enum WebSocketActionTypes {
  Reg = 'reg',
  UpdateRoom = 'update_room',
  CreateRoom = 'create_room',
  AddUserToRoom = 'add_user_to_room',
  CreateGame = 'create_game',
}

export type IncomingMessageTypes =
  | WebSocketActionTypes.Reg
  | WebSocketActionTypes.CreateRoom
  | WebSocketActionTypes.AddUserToRoom;
export type OutgoingMessageTypes =
  | WebSocketActionTypes.UpdateRoom
  | WebSocketActionTypes.Reg
  | WebSocketActionTypes.CreateGame;
