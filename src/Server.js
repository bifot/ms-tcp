const net = require('net');
const JsonSocket = require('json-socket');
const Context = require('./Context');

class Server {
  constructor() {
    this.middlewares = [];
    this.sockets = new Map();
  }

  on(action, ...middlewares) {
    this.use(action, ...middlewares);

    return this;
  }

  use(...middlewares) {
    let action;

    if (typeof middlewares[0] === 'string') {
      action = middlewares.shift();
    }

    middlewares.forEach((fn) => {
      const index = this.middlewares.length;

      this.middlewares.push({
        action,
        fn: (ctx) => fn(ctx, () => this.next(ctx, index + 1)),
      })
    });

    return this;
  }

  next(ctx, index = 0) {
    const middleware = this.middlewares[index];

    if (!middleware) {
      return;
    }

    const { fn, action } = middleware;

    if (!action || action === ctx.data.action) {
      return fn(ctx);
    }

    return this.next(ctx, index + 1);
  }

  listen(port, host, callback) {
    const server = net.createServer((socket) => {
      socket = new JsonSocket(socket);

      socket.on('message', async ({ data, meta }) => {
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

        const context = new Context(this, { data, meta });

        await this.next(context);

        socket.sendMessage({
          id: meta.id,
          response: context.response,
        });
      });
    });

    return server.listen(port, host, callback);
  }
}

module.exports = Server;
