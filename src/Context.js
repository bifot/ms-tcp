class Context {
  constructor(app, message) {
    this.app = app;
    this.data = message.data;
    this.meta = message.meta;
    this.payload = message.data.payload;
  }

  reply(response) {
    this.response = response;
  }
}

module.exports = Context;
