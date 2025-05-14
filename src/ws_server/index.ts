import { WebSocketServer } from 'ws';
import { parseIncomingMessage } from './utils/parseIncomingMessage';

const players = new Map<string, { name: string; password: string }>();

export const createWSS = () => {
  const wss = new WebSocketServer({
    port: 3000,
  });

  wss.on('connection', (ws) => {
    console.log('Connected');

    ws.on('message', (message) => {
      try {
        const { type, data, id } = parseIncomingMessage(message);

        console.log(`Incoming: [${type}:${id}]: ${JSON.stringify(data, null, 2)}`);

        switch (type) {
          case 'reg': {
            const existedUser = players.get(data.name);

            if (!existedUser) {
              players.set(data.name, data);

              return ws.send(
                JSON.stringify({
                  type: 'reg',
                  data: JSON.stringify({
                    name: data.name,
                    index: data.name,
                    error: false,
                  }),
                  id: 0,
                }),
              );
            }

            if (existedUser.password === data.password) {
              return ws.send(
                JSON.stringify({
                  type: 'reg',
                  data: JSON.stringify({
                    name: data.name,
                    index: data.name,
                    error: false,
                  }),
                  id: 0,
                }),
              );
            }

            return ws.send(
              JSON.stringify({
                type: 'reg',
                data: JSON.stringify({
                  name: data.name,
                  index: data.name,
                  error: true,
                  errorText: 'Invalid password',
                }),
                id: 0,
              }),
            );
          }
          default:
            return null as never;
        }
      } catch (e) {
        console.error('Ошибка при разборе JSON:', e);
      }
    });
  });
};
