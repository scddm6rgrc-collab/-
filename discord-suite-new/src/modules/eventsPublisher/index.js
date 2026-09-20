const service = require("./service");
module.exports = {
  name: "eventsPublisher",
  async setup(client, context) {
    context.services.eventsPublisher = service;
  }
};
