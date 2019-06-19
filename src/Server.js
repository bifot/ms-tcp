const tcp = require('fast-tcp');
const Context = require('./Context');

class Server {
  constructor() {
    this.middlewares = [];
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

    if (!action || action === ctx.request.action) {
      return fn(ctx);
    }

    return this.next(ctx, index + 1);
  }

  listen(port, host, callback) {
    const server = new tcp.Server();

    server.on('connection', (connection) => {
      connection.on('message', async (message, callback) => {
        if (!callback || typeof callback !== 'function') {
          return;
        }

        const context = new Context(this, message);

        await this.next(context);

        callback(context.response);
      });
    });

    server.listen(port, host, callback);

    return this;
  }
}

module.exports = Server;
