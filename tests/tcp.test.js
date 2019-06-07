const chai = require('chai');
const chaiHttp = require('chai-http');
const users = require('../examples/users');
const balances = require('../examples/balances');

chai.use(chaiHttp);

const { expect, request } = chai;

describe('tcp', () => {
  let services;

  const test = async () => {
    const { status, body } = await request(users.app).get('/');

    expect(status).to.be.equal(200);
    expect(body).to.be.deep.equal({
      id: 1,
      name: 'Mikhail Semin',
      hobbies: ['Node.js', 'Football'],
      balance: 1000,
    });
  };

  before(async () => {
    users.tcp.services = {
      balances: [
        'localhost:5000',
        'localhost:5001',
        'localhost:5002',
      ],
    };

    services = await Promise.all([
      balances.listen(5000),
      balances.listen(5001),
      balances.listen(5002),
    ]);
  });

  it('should get response simply', test);

  it('should get response when 2 services are dead', async () => {
    services[1].close();
    services[2].close();

    await test();
  });

  it('should get response when all services are dead', async () => {
    services[0].close();

    const { status, body } = await request(users.app).get('/');

    expect(status).to.be.equal(200);
    expect(body.balance).to.be.equal(undefined);
  });
});
