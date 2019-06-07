# ms-udp

Solution for communication between services using UDP protocol with built-in auto-retry & round-robin balancing. 🔬

## Install

```sh
$ npm i ms-udp -S
```

## Tests

```sh
$ npm test
```

## Examples

[There are some simple examples](examples).

## API

### UDP

#### .constuctor(options)

* `options` <?[Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)>
  * `services` <[?Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)> Available services to send request
    * `[key]` - <[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#String_type)> Service name
    * `[value]` - <[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#String_type) / [Array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array)> Service's address(es)
  * `timeout` <[?number](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Number_type)> Timeout for outgoing request in ms *(default: 5000)*

This method creates instance of UDP class.

```js
const udp = new UDP({
  services: {
    balances: '127.0.0.1:4000',
    orders: ['127.0.0.1:4001', '127.0.0.1:4002'],
  },
  timeout: 5000,
});
```

#### .on(event, callback)

* `event` <[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#String_type)> Event name
* `callback` <[function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function)> Event callback

This method creates action.

```js
const { Users } = require('./api/mongodb');

udp.on('check_user_level', async (data) => {
  const { level } = await Users.findOne({
    userId: data.id,
  });
  
  return level;
});

udp.on('delete', async ({ ask }, { id: userId }) => {
  await Promise.all([
    ask('balances.clear', { userId }),
    Users.remove({ userId }),
  ]);

  return 'ok';
});
```

#### .emit(event[, data])

* `event` <[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#String_type)> Event name
* `data` <[?Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)> Event data

This method emits local event.

```js
...


udp.on('ping', () => 'pong');

app.get('/ping', (req, res) => {
  res.end(req.udp.emit('ping')); // 'pong'
});

...
```

#### .middleware()

This method returns middleware for Koa or Express.

```js
const express = require('express');
const UDP = require('ms-udp');

const app = express();
const udp = new UDP({ ... });

app.use(udp.middleware());

app.get('/', async (req, res) => {
  // req.udp.ask
  // req.udp.emit
  // ...
});

app.listen(3000);
```

#### .ask(event[, data, options])

* `event` <[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#String_type)> Event name in format `<service_name>.<action>`
* `data` <[?Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)> Event data
* `options` <[?Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)> Request options
  * `attempts` <[number](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Number_type)> Maximum number of attempts *(default: 5)*

This method asks other service for something.

```js
...

app.get('/', async (req, res) => {
  const response = await req.udp.ask('balances.get', {
    id: req.query.id,
  });
  
  if (!response) {
    res.status(404);
    res.end('Not Found.');
    
    return;
  }
  
  res.json({
    name: 'Mikhail Semin',
    balance: response.amount,
  });
});

...
```

#### .createSockets()

This method creates sockets for available services.

#### .listen(port[, host])

* `port` <[number](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Number_type)>
* `host` <[?string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#String_type)>

This method starts listening.
