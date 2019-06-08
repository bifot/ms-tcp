const Koa = require('koa');
const tcp = require('../src');

const app = new Koa();
const rpc = new tcp.Client({
  services: {
    balances: process.env.TCP_ADDRESS,
  },
  host: process.env.APP_HOST,
});

app.use(rpc.middleware());

app.use(async (ctx) => {
  const balance = await ctx.tcp.ask('balances.get', {
    id: +ctx.query.id,
  });

  ctx.body = {
    name: 'Mikhail Semin',
    balance,
  };
});

module.exports = app.listen(process.env.APP_PORT);
