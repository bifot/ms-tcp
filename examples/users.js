const Koa = require('koa');
const { Client } = require('../src');

const app = new Koa();
const client = new Client({
  services: {
    balances: process.env.TCP_ADDRESS.split(','),
  },
});

app.use(client.middleware());

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
