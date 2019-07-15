const { Socket } = require('fast-tcp');
const roundround = require('roundround');
const toArray = require('./helpers/toArray');

class Client {
  constructor({ services }) {
    this.sockets = new Map();

    Object.entries(services).forEach(([name, addresses]) => {
      toArray(addresses).forEach((address) => {
        let host;
        let port;

        if (typeof address === 'string') {
          [host, port] = address.split(':');
        } else {
          host = address.host;
          port = address.port;
        }

        const socket = new Socket({ port, host });
        const sockets = this.sockets.get(name);

        socket.on('error', (err) => {
          console.error(`Service ${name} dropped an error (${host}:${port})`, err);
        });

        socket.emitPromise = (event, message, options) => new Promise((resolve, reject) => {
          const timer = setTimeout(() => {
            reject(`Request timeout for ${name} (${host}:${port})`);
          }, options.timeout);

          socket.emit(event, message, (response) => {
            clearTimeout(timer);
            resolve(response);
          });
        });

        const clients = [
          ...(sockets ? sockets.clients : []),
          socket,
        ];

        this.sockets.set(name, {
          clients,
          get: roundround(clients),
        });
      });
    });
  }

  async ask(name, payload, options = { timeout: 1500, attempts: 5 }) {
    const [service, action] = name.split('.');
    const request = { action, payload };
    const sockets = this.sockets.get(service);
    const mock = this.responses && this.responses[service] && this.responses[service][action];

    if (mock) {
      return typeof mock === 'function' ? mock(payload) : mock;
    }

    if (!sockets) {
      throw new Error(`No sockets for ${service} service`);
    }

    const emit = (index = 0) => {
      if (options.attempts === index) {
        return;
      }

      const socket = sockets.get();

      if (!socket) {
        throw new Error(`Socket is not found for ${service} service`);
      }

      return socket.emitPromise('message', request, options)
        .catch(err => console.error(err) || emit(index + 1));
    };

    return emit();
  }

  mock(responses) {
    this.responses = responses;

    return this;
  }

  middleware() {
    return (...args) => {
      if (args.length === 3) {
        args[0].tcp = this;
        args[1].tcp = this;

        return args[2]();
      }

      args[0].tcp = this;

      return args[1]();
    };
  }
}

module.exports = Client;
