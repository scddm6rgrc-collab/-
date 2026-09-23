const fs = require("fs");
const path = require("path");


function createRewardService(
  file,
  credits,
  getRules = () => ({})
) {

  fs.mkdirSync(
    path.dirname(file),
    {
      recursive: true
    }
  );


  if (!fs.existsSync(file)) {
    fs.writeFileSync(
      file,
      "{}"
    );
  }


  function read() {

    try {

      return JSON.parse(
        fs.readFileSync(
          file,
          "utf8"
        )
      );

    } catch {

      return {};

    }

  }


  function write(data) {

    const temp =
      `${file}.tmp`;


    fs.writeFileSync(
      temp,
      JSON.stringify(
        data,
        null,
        2
      )
    );


    fs.renameSync(
      temp,
      file
    );

  }


  function rules() {

    const source =
      getRules() || {};


    return {

      reward:
        Math.max(
          0,
          Number(
            source.staffWinReward ??
            10
          )
        ),


      maxWins:
        Math.max(
          1,
          Number(
            source.staffMaxRewardStreak ??
            3
          )
        ),


      lossesToUnlock:
        Math.max(
          1,
          Number(
            source.staffLossesToUnlock ??
            3
          )
        )

    };

  }


  function ensure(
    data,
    guildId,
    userId
  ) {

    data[guildId] ||= {};


    data[guildId][userId] ||= {

      winStreak: 0,

      rewardLocked: false,

      lossesWhileLocked: 0,

      totalRewardWins: 0

    };


    return data[guildId][userId];

  }


  function get(
    guildId,
    userId
  ) {

    const data =
      read();


    return (
      data[guildId]
        ?.[userId] ||
      {
        winStreak: 0,

        rewardLocked: false,

        lossesWhileLocked: 0,

        totalRewardWins: 0
      }
    );

  }


  function win(
    guildId,
    userId,
    username = ""
  ) {

    const config =
      rules();


    const data =
      read();


    const state =
      ensure(
        data,
        guildId,
        userId
      );


    if (
      state.rewardLocked
    ) {

      write(data);


      return {

        rewarded: false,

        amount: 0,

        locked: true,

        lossesNeeded:
          Math.max(
            0,

            config.lossesToUnlock -
            state.lossesWhileLocked
          )

      };

    }


    credits.adjust(
      guildId,
      userId,
      config.reward,
      username
    );


    state.winStreak += 1;

    state.totalRewardWins += 1;


    if (
      state.winStreak >=
      config.maxWins
    ) {

      state.rewardLocked = true;

      state.lossesWhileLocked = 0;

    }


    write(data);


    return {

      rewarded: true,

      amount:
        config.reward,

      locked:
        state.rewardLocked,

      winStreak:
        state.winStreak

    };

  }


  function lose(
    guildId,
    userId
  ) {

    const config =
      rules();


    const data =
      read();


    const state =
      ensure(
        data,
        guildId,
        userId
      );


    if (
      state.rewardLocked
    ) {

      state.lossesWhileLocked += 1;


      if (
        state.lossesWhileLocked >=
        config.lossesToUnlock
      ) {

        state.rewardLocked = false;

        state.lossesWhileLocked = 0;

        state.winStreak = 0;

      }

    } else {

      state.winStreak = 0;

    }


    write(data);


    return state;

  }


  return {

    get,

    win,

    lose,

    getRules:
      rules

  };

}


module.exports = {
  createRewardService
};
