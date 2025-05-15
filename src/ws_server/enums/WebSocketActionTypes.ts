export enum WebSocketActionTypes {
  Reg = 'reg',
  UpdateRoom = 'update_room',
  CreateRoom = 'create_room',
}

export type IncomingMessageTypes = WebSocketActionTypes.Reg | WebSocketActionTypes.CreateRoom;
export type OutgoingMessageTypes = WebSocketActionTypes.UpdateRoom | WebSocketActionTypes.Reg;
