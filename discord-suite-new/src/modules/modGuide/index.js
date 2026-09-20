const service = require("./service");
module.exports = {
  name: "modGuide",
  async setup(client, context) {
    context.services.modGuide = service;
  }
};
