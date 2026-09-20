const service = require("./service");
module.exports = {
  name: "roles",
  async setup(client, context) {
    context.services.roles = service;
  }
};
