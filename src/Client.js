const net = require('net');
const JsonSocket = require('json-socket');
const createID = require('./helpers/createID');

class Client {
  constructor({ services, host }) {
    this.services = Object.entries(services).reduce((object, [name, address]) => {
      const [host, port] = address.split(':');

      return {
        ...object,
        [name]: {
          host,
          port,
          ready: false,
        },
      };
    }, {});

    this.host = host;
    this.sockets = new Map();
    this.requests = new Map();

    this.init();
  }

  async createSockets() {
    try {
      await Promise.all(
        Object.entries(this.services).map(async ([service, { host, port, ready }]) => {
          if (ready) {
            return;
          }

          await new Promise((resolve, reject) => {
            const socket = new JsonSocket(new net.Socket());
            const timer = setTimeout(reject, 1000);

            socket.connect(port, host, () => {
              this.services[service].ready = true;
              this.sockets.set(service, socket);
              clearTimeout(timer);
              resolve();
            });

            ['error', 'close'].forEach((event) => {
              socket.on(event, () => {
                setTimeout(() => {
                  this.services[service].ready = false;
                  this.createSockets();
                }, 1000);
              });
            });
          });
        }),
      );

      this.socketsCreated = true;
    } catch (err) {
      return this.createSockets();
    }
  }

  async ask(name, payload, options = { timeout: 5000, attempts: 5 }) {
    if (!this.socketsCreated) {
      await this.createSockets();
    }

    const [service, action] = name.split('.');
    const request = { action, payload };

    const send = (index = 0) => {
      if (options.attempts === index) {
        return;
      }

      return this.send(service, request, options)
        .catch(() => send(index + 1));
    };

    return send();
  }

  send(service, request, options) {
    let resolve;
    let reject;

    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });

    const requestId = createID();
    const socket = this.sockets.get(service);

    this.requests.set(requestId, {
      resolve,
      timer: setTimeout(() => {
        this.requests.delete(requestId);
        reject();
      }, options.timeout),
    });

    socket.sendMessage({
      data: request,
      meta: {
        id: requestId,
        host: this.host,
        port: this.port,
      },
    }, (err) => {
      if (err) {
        console.error('Cannot send message', err);
      }
    });

    return promise;
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

  init() {
    const server = new net.createServer((socket) => {
      socket = new JsonSocket(socket);

      socket.on('message', ({ id, response }) => {
        const request = this.requests.get(id);

        if (!request) {
          return;
        }

        request.resolve(response);
        this.requests.delete(id);
      });
    });

    server.listen(() => {
      const { address, port } = server.address();

      if (!this.host) {
        this.host = address === '::' ? '127.0.0.1' : address;
      }

      this.port = port;
    });

    return server;
  }
}

module.exports = Client;
