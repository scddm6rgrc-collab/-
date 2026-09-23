const service =
  require("./service");

module.exports = {
  name: "helpCenter",

  async setup(client, context) {
    context.services.helpCenter =
      service;
  }
};
