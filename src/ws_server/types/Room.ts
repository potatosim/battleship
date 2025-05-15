export type Room = {
  roomId: string;
  roomUsers: Array<{
    name: string;
    index: number | string;
  }>;
};
