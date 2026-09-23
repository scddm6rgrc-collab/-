const {
  createBettingService
} = require("./service");

module.exports = {
  name: "betting",

  async setup(
    client,
    context
  ) {

    context.services.betting =
      createBettingService(
        context
      );

  }
};
