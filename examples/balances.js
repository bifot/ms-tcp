const tcp = require('../src');

const server = new tcp.Server();

server.on('get', (data) => {
  return data.id * 100;
});

server.listen(process.env.PORT);
