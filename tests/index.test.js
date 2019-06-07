const chai = require('chai');
const chaiHttp = require('chai-http');
const app = require('../examples/users');
const service = require('../examples/balances');

chai.use(chaiHttp);

const { expect, request } = chai;

it('should get response', async () => {
  const { status, body } = await request(app)
    .get('/')
    .query({ id : 1 });

  expect(status).to.be.equal(200);
  expect(body).to.be.deep.equal({
    name: 'Mikhail Semin',
    balance: 100,
  });
});
