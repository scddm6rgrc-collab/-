function createBettingService(
  context
) {

  const DEFAULTS = {
    enabled: true,

    allowedChannelIds: [],

    minBet: 1,

    maxBet: 25
  };


  function getSettings(
    guildId
  ) {

    const saved =
      context.store
        .getGuild(guildId)
        .betting ||
      {};


    return {
      ...DEFAULTS,
      ...saved,

      allowedChannelIds:
        Array.isArray(
          saved.allowedChannelIds
        )
          ? saved.allowedChannelIds
          : []
    };
  }


  function checkChannel(
    guildId,
    channelId
  ) {

    const settings =
      getSettings(
        guildId
      );


    if (!settings.enabled) {

      return {
        ok: false,
        message:
          "❌ نظام Credits والـBet متوقف حاليًا."
      };
    }


    if (
      !settings
        .allowedChannelIds
        .length
    ) {

      return {
        ok: false,
        message:
          "❌ لم يتم تحديد روم Credits من الداشبورد."
      };
    }


    if (
      !settings
        .allowedChannelIds
        .includes(
          channelId
        )
    ) {

      const rooms =
        settings
          .allowedChannelIds
          .map(
            id =>
              `<#${id}>`
          )
          .join(" ");

      return {
        ok: false,

        message:
          `❌ استخدم أوامر Credits والألعاب في: ${rooms}`
      };
    }


    return {
      ok: true,
      settings
    };
  }


  function validateBet(
    guildId,
    userId,
    amount
  ) {

    const settings =
      getSettings(
        guildId
      );


    const bet =
      Math.max(
        0,
        Math.floor(
          Number(amount || 0)
        )
      );


    // 0 = لعبة بدون Bet
    if (bet === 0) {

      return {
        ok: true,
        bet: 0,

        balance:
          context.services
            .credits
            .getBalance(
              guildId,
              userId
            )
      };
    }


    if (
      bet <
      Number(
        settings.minBet
      )
    ) {

      return {
        ok: false,

        message:
          `❌ أقل Bet هو **${settings.minBet} Credit**.`
      };
    }


    if (
      bet >
      Number(
        settings.maxBet
      )
    ) {

      return {
        ok: false,

        message:
          `❌ أكبر Bet هو **${settings.maxBet} Credits**.`
      };
    }


    const balance =
      context.services
        .credits
        .getBalance(
          guildId,
          userId
        );


    if (
      balance < bet
    ) {

      return {
        ok: false,

        message:
          `❌ رصيدك غير كافي. عندك **${balance} Credits**.`
      };
    }


    return {
      ok: true,
      bet,
      balance
    };
  }


  // ================================
  // SOLO BET
  // ================================

  function takeBet(
    guildId,
    userId,
    amount,
    username = ""
  ) {

    const validation =
      validateBet(
        guildId,
        userId,
        amount
      );


    if (!validation.ok) {

      return validation;
    }


    const bet =
      validation.bet;


    if (bet > 0) {

      context.services
        .credits
        .adjust(
          guildId,
          userId,
          -bet,
          username
        );
    }


    return {
      ok: true,

      bet,

      balance:
        context.services
          .credits
          .getBalance(
            guildId,
            userId
          )
    };
  }


  // إذا multiplier = 2
  // Bet 5:
  // يسحب 5 بالبداية
  // عند الفوز يرجع 10
  // الربح الصافي +5
  function winBet(
    guildId,
    userId,
    bet,
    multiplier = 2,
    username = ""
  ) {

    bet =
      Math.max(
        0,
        Number(bet || 0)
      );


    multiplier =
      Math.max(
        1,
        Number(
          multiplier || 1
        )
      );


    const payout =
      Math.floor(
        bet *
        multiplier
      );


    if (payout > 0) {

      context.services
        .credits
        .adjust(
          guildId,
          userId,
          payout,
          username
        );
    }


    return {
      payout,

      profit:
        payout - bet,

      balance:
        context.services
          .credits
          .getBalance(
            guildId,
            userId
          )
    };
  }


  // Bet انخصم مسبقًا
  // الخسارة = لا نرجع شيء
  function loseBet(
    guildId,
    userId
  ) {

    return {
      balance:
        context.services
          .credits
          .getBalance(
            guildId,
            userId
          )
    };
  }


  // تعادل / إلغاء
  function refundBet(
    guildId,
    userId,
    bet,
    username = ""
  ) {

    bet =
      Math.max(
        0,
        Number(bet || 0)
      );


    if (bet > 0) {

      context.services
        .credits
        .adjust(
          guildId,
          userId,
          bet,
          username
        );
    }


    return {
      refunded: bet,

      balance:
        context.services
          .credits
          .getBalance(
            guildId,
            userId
          )
    };
  }


  // ================================
  // PVP
  // ================================

  function takePvPBet({
    guildId,
    firstUser,
    secondUser,
    bet
  }) {

    const first =
      validateBet(
        guildId,
        firstUser.id,
        bet
      );


    if (!first.ok) {

      return {
        ok: false,

        message:
          `❌ <@${firstUser.id}>: ${first.message}`
      };
    }


    const second =
      validateBet(
        guildId,
        secondUser.id,
        bet
      );


    if (!second.ok) {

      return {
        ok: false,

        message:
          `❌ <@${secondUser.id}>: ${second.message}`
      };
    }


    if (bet > 0) {

      context.services
        .credits
        .adjust(
          guildId,
          firstUser.id,
          -bet,
          firstUser.username
        );


      context.services
        .credits
        .adjust(
          guildId,
          secondUser.id,
          -bet,
          secondUser.username
        );
    }


    return {
      ok: true,

      bet,

      pot:
        bet * 2
    };
  }


  function settlePvP({
    guildId,
    winnerId,
    winnerUsername,
    bet
  }) {

    const pot =
      Number(bet || 0) *
      2;


    if (pot > 0) {

      context.services
        .credits
        .adjust(
          guildId,
          winnerId,
          pot,
          winnerUsername
        );
    }


    return {
      pot,

      balance:
        context.services
          .credits
          .getBalance(
            guildId,
            winnerId
          )
    };
  }


  function refundPvP({
    guildId,
    firstUser,
    secondUser,
    bet
  }) {

    bet =
      Math.max(
        0,
        Number(bet || 0)
      );


    if (bet > 0) {

      context.services
        .credits
        .adjust(
          guildId,
          firstUser.id,
          bet,
          firstUser.username
        );


      context.services
        .credits
        .adjust(
          guildId,
          secondUser.id,
          bet,
          secondUser.username
        );
    }


    return {
      refunded: bet
    };
  }


  return {
    getSettings,

    checkChannel,

    validateBet,

    takeBet,
    winBet,
    loseBet,
    refundBet,

    takePvPBet,
    settlePvP,
    refundPvP
  };
}


module.exports = {
  createBettingService
};
