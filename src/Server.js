const net = require('net');
const JsonSocket = require('json-socket');

class Server {
  constructor() {
    this.actions = new Map();
    this.sockets = new Map();
  }

  on(action, callback) {
    this.actions.set(action, callback);

    return this;
  }

  listen(port, host, callback) {
    const server = net.createServer((socket) => {
      socket = new JsonSocket(socket);

      socket.on('message', async ({ data, meta }) => {
        const action = this.actions.get(data.action);

        if (!action) {
          return;
        }

        let socket = this.sockets.get(`${meta.host}:${meta.port}`);

        if (!socket) {
          await new Promise((resolve) => {
            socket = new JsonSocket(new net.Socket());

            socket.connect(meta.port, meta.host, () => {
              this.sockets.set(`${meta.host}:${meta.port}`, socket);
              resolve();
            });
          });
        }

        socket.sendMessage({
          id: meta.id,
          response: await action(data.payload),
        });
      });
    });

    return server.listen(port, host, callback);
  }
}

module.exports = Server;
