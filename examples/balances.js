const tcp = require('../src');

const server = new tcp.Server();

const validate = async (ctx, next) => {
  if (ctx.payload.id < 20) {
    return;
  }

  await next();
};

server.on('get', validate, (ctx) => {
  ctx.reply(ctx.payload.id * 100);
});

module.exports = server.listen(process.env.TCP_PORT);
