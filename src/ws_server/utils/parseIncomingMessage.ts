import { RawData } from 'ws';
import { WebSocketAction } from '../WebSocketActions';

export const parseIncomingMessage = (message: RawData): WebSocketAction => {
  const { type, data, id } = JSON.parse(message.toString()) as WebSocketAction & { data: string };

  const parsedData = JSON.parse(data) as WebSocketAction['data'];

  return {
    type,
    data: parsedData,
    id,
  } as WebSocketAction;
};
