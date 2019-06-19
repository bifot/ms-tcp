class Context {
  constructor(app, message) {
    this.app = app;
    this.request = message;
    this.payload = message.payload;
  }

  reply(response) {
    this.response = response;
  }
}

module.exports = Context;
