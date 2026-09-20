const service = require("./service");
module.exports = {
  name: "messages",
  async setup(client, context) {
    context.services.messages = service;
  }
};
