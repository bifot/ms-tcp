const net = require('net');
const JsonSocket = require('json-socket');
const Queue = require('./managers/Queue');
const createID = require('./helpers/createID');

const queue = new Queue();

queue.run();

class Client {
  constructor({ services }) {
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

    this.sockets = new Map();
    this.requests = new Map();

    this.init();
  }

  async createSockets() {
    await queue.addTask(async () => {
      if (this.socketsCreated) {
        return;
      }

      await Promise.all(
        Object.entries(this.services).map(async ([service, { host, port, ready }]) => {
          if (ready) {
            return;
          }

          await new Promise((resolve) => {
            const socket = new JsonSocket(new net.Socket());

            socket.connect(port, host, () => {
              console.log('connected');

              this.services[service].ready = true;
              this.sockets.set(service, socket);
              resolve();
            });

            ['error', 'close'].forEach((event) => {
              socket.on(event, () => {
                setTimeout(() => {
                  this.services[service].ready = false;
                  this.socketsCreated = false;
                  this.createSockets();
                }, 1000);
              });
            });
          });
        }),
      );

      this.socketsCreated = true;
    });
  }

  async ask(name, payload, options = { timeout: 5000, attempts: 5 }) {
    if (!this.socketsCreated) {
      await this.createSockets();
    }

    const [service, action] = name.split('.');
    const socket = this.sockets.get(service);

    const send = (socket, index = 0) => {
      if (options.attempts === index) {
        return;
      }

      return this.send(socket, action, payload, options)
        .catch(() => send(this.sockets.get(service), index + 1));
    };

    return send(socket);
  }

  send(socket, action, payload, options) {
    let resolve;
    let reject;

    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });

    const requestId = createID();

    this.requests.set(requestId, {
      resolve,
      timer: setTimeout(() => {
        this.requests.delete(requestId);
        reject();
      }, options.timeout),
    });

    socket.sendMessage({
      data: {
        action,
        payload,
      },
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

      this.host = address === '::' ? '127.0.0.1' : address;
      this.port = port;
    });

    return server;
  }
}

module.exports = Client;
