const tcp = require('../src');

const server = new tcp.Server();

server.on('get', (data) => {
  return data.id * 100;
});

module.exports = server.listen(process.env.TCP_PORT);
