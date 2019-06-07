const Koa = require('koa');
const tcp = require('../src');

const app = new Koa();
const rpc = new tcp.Client({
  services: {
    balances: '127.0.0.1:3000',
  },
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

app.listen(process.env.PORT);
