const net = require('net');
const roundround = require('roundround');
const JsonSocket = require('json-socket');
const createID = require('./helpers/createID');
const toArray = require('./helpers/toArray');

class Client {
  constructor({ services, host, port }) {
    this.host = host;
    this.port = port;
    this.sockets = new Map();
    this.requests = new Map();

    this.init();

    Object.entries(services).forEach(([name, addresses]) => {
      toArray(addresses).forEach((address) => {
        const [host, port] = address.split(':');

        this.createSocket({
          name,
          host,
          port,
        });
      });
    });
  }

  async createSocket(service) {
    const { name, host, port } = service;

    await new Promise((resolve) => {
      const socket = new JsonSocket(new net.Socket());

      socket.connect(port, host, () => {
        const sockets = this.sockets.get(name);

        const clients = [
          ...(sockets ? sockets.clients : []),
          {
            socket,
            host,
            port,
          },
        ];

        this.sockets.set(name, {
          clients,
          get: roundround(clients),
        });

        resolve();
      });

      socket.on('error', () => {
        socket._socket.destroy();
      });

      socket.on('close', () => {
        const sockets = this.sockets.get(name);

        if (sockets) {
          const clients = sockets.clients.filter(item => !(item.port === port && item.host === host));

          this.sockets.set(name, {
            clients,
            get: roundround(clients),
          });
        }

        this.createSocket(service);
      });
    });
  }

  async ask(name, payload, options = { timeout: 5000, attempts: 5 }) {
    const [service, action] = name.split('.');
    const request = { action, payload };

    const send = (index = 0) => {
      if (options.attempts === index) {
        return;
      }

      return this.send(service, request, options)
        .catch(err => console.error(err) || send(index + 1));
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
    const sockets = this.sockets.get(service);

    if (!sockets) {
      setTimeout(() => reject('No sockets for given service'), options.timeout);

      return promise;
    }

    const { socket } = sockets.get() || {};

    if (!socket) {
      setTimeout(() => reject('Socket is not found'), options.timeout);

      return promise;
    }

    this.requests.set(requestId, {
      resolve,
      timer: setTimeout(() => {
        this.requests.delete(requestId);
        reject('Timed out');
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

    if (this.port) {
      server.listen(this.port, this.host);
    } else {
      server.listen(() => {
        const { address, port } = server.address();

        if (!this.host) {
          this.host = address === '::' ? '127.0.0.1' : address;
        }

        this.port = port;
      });
    }

    return server;
  }
}

module.exports = Client;
