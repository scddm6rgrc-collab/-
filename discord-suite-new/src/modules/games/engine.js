const crypto = require("crypto");

const {
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags
} = require("discord.js");

const {
  GAMES,
  getGame
} = require("./config");

function createGameEngine(
  client,
  context,
  rewards
) {
  const sessions = new Map();
  const active = new Map();

  function id() {
    return crypto
      .randomBytes(7)
      .toString("hex");
  }

  function userData(user) {
    return {
      id: user.id,
      username: user.username
    };
  }

  function getSettings(guildId) {
    const saved =
      context.store
        .getGuild(guildId)
        .games || {};

    const modes = {};
    const aliases = {};
    const rooms = {};

    for (const game of GAMES) {
      modes[game.key] =
        saved.modes?.[game.key] ||
        game.defaultMode;

      aliases[game.key] =
        saved.aliases?.[game.key] ||
        game.defaultAlias ||
        `!${game.command}`;

      rooms[game.key] =
        saved.rooms?.[game.key] ||
        "";
    }

    return {
      modes,
      aliases,
      rooms,

      multiplayerStartFee:
        Number(
          saved.multiplayerStartFee ??
          5
        ),

      staffWinReward:
        Number(
          saved.staffWinReward ??
          10
        ),

      staffMaxRewardStreak:
        Number(
          saved.staffMaxRewardStreak ??
          3
        ),

      staffLossesToUnlock:
        Number(
          saved.staffLossesToUnlock ??
          3
        ),

      staffRoleIds:
        Array.isArray(
          saved.staffRoleIds
        )
          ? saved.staffRoleIds
          : []
    };
  }

  function modeFor(
    guildId,
    gameKey
  ) {
    return (
      getSettings(guildId)
        .modes[gameKey] ||
      getGame(gameKey)
        ?.defaultMode ||
      "public"
    );
  }

  async function isStaff(
    interaction
  ) {
    const member =
      await interaction.guild.members
        .fetch(
          interaction.user.id
        )
        .catch(() => null);

    if (!member)
      return false;

    if (
      member.permissions.has(
        PermissionFlagsBits.Administrator
      ) ||
      member.permissions.has(
        PermissionFlagsBits.ManageGuild
      ) ||
      member.permissions.has(
        PermissionFlagsBits.ModerateMembers
      ) ||
      member.permissions.has(
        PermissionFlagsBits.ManageMessages
      )
    ) {
      return true;
    }

    const staffRoleIds =
      getSettings(
        interaction.guildId
      ).staffRoleIds;

    return staffRoleIds.some(
      roleId =>
        member.roles.cache.has(
          roleId
        )
    );
  }

  async function privateReply(
    interaction,
    content
  ) {
    const payload = {
      content,
      flags:
        MessageFlags.Ephemeral
    };

    if (
      interaction.replied ||
      interaction.deferred
    ) {
      return interaction
        .followUp(payload)
        .catch(() => null);
    }

    return interaction
      .reply(payload)
      .catch(() => null);
  }

  function activeKey(
    guildId,
    gameKey
  ) {
    return `${guildId}:${gameKey}`;
  }

  function isActive(
    guildId,
    gameKey
  ) {
    return active.has(
      activeKey(
        guildId,
        gameKey
      )
    );
  }

  async function preflight(
    interaction,
    gameKey
  ) {
    if (!interaction.guild) {
      return {
        ok: false,
        message:
          "❌ هذا الأمر يعمل داخل السيرفر فقط."
      };
    }

    const betting =
      context.services.betting;

    if (!betting) {
      return {
        ok: false,
        message:
          "❌ Bet System غير جاهز."
      };
    }

    const gameRoomId =
      getSettings(
        interaction.guildId
      )
        .rooms?.[gameKey];

    if (!gameRoomId) {
      return {
        ok: false,
        message:
          "❌ لم يتم تحديد روم لهذه اللعبة من الداشبورد."
      };
    }

    if (
      interaction.channelId !==
      gameRoomId
    ) {
      return {
        ok: false,
        message:
          `❌ هذه اللعبة تعمل فقط في <#${gameRoomId}>.`
      };
    }

    if (
      isActive(
        interaction.guildId,
        gameKey
      )
    ) {
      return {
        ok: false,
        message:
          "❌ هذه اللعبة شغالة حاليًا. انتظر حتى تنتهي."
      };
    }

    const mode =
      modeFor(
        interaction.guildId,
        gameKey
      );

    if (
      mode === "staff" &&
      !(await isStaff(interaction))
    ) {
      return {
        ok: false,
        message:
          "❌ هذه اللعبة لا يستطيع تشغيلها إلا المشرف."
      };
    }

    let bet =
      Number(
        interaction.options
          ?.getInteger?.(
            "bet"
          ) || 0
      );

    const game =
      getGame(gameKey);

    const multiplayerPublic =
      mode === "public" &&
      Number(game?.maxPlayers || 0) > 2;

    let startFee = 0;

    if (mode === "public") {

      // ألعاب أكثر من لاعبين:
      // صاحب الأمر يدفع 5 Credits،
      // والـBet اختياري.
      if (multiplayerPublic) {
        startFee =
          Math.max(
            0,
            Number(
              getSettings(
                interaction.guildId
              )
                .multiplayerStartFee ??
              5
            )
          );

        if (bet < 0) {
          bet = 0;
        }

        if (bet > 0) {
          const validation =
            betting.validateBet(
              interaction.guildId,
              interaction.user.id,
              bet
            );

          if (!validation.ok) {
            return validation;
          }

          bet =
            validation.bet;
        }

        const balance =
          context.services.credits
            .getBalance(
              interaction.guildId,
              interaction.user.id
            );

        const needed =
          startFee + bet;

        if (balance < needed) {
          return {
            ok: false,
            message:
              `❌ تحتاج **${needed} Credits** على الأقل لفتح هذه اللعبة` +
              (bet > 0
                ? ` (${startFee} رسوم تشغيل + ${bet} Bet).`
                : ` (${startFee} رسوم تشغيل).`)
          };
        }

      } else {

        // ألعاب الشخصين العامة
        // تبقى تحتاج Bet
        if (bet <= 0) {
          return {
            ok: false,
            message:
              "❌ هذه اللعبة تحتاج Bet للبدء."
          };
        }

        const validation =
          betting.validateBet(
            interaction.guildId,
            interaction.user.id,
            bet
          );

        if (!validation.ok) {
          return validation;
        }

        bet =
          validation.bet;
      }

    } else {
      bet = 0;
      startFee = 0;
    }

    return {
      ok: true,
      mode,
      bet,
      startFee,
      multiplayerPublic
    };
  }

  function createSession({
    interaction,
    gameKey,
    mode,
    bet,
    startFee = 0,
    players = []
  }) {
    const session = {
      id: id(),

      gameKey,

      guildId:
        interaction.guildId,

      channelId:
        interaction.channelId,

      mode,
      bet,

      startFee:
        Number(startFee || 0),

      startFeePaid: false,
      startFeeRefundable: false,

      phase: "created",

      players:
        new Map(
          players.map(
            user => [
              user.id,
              userData(user)
            ]
          )
        ),

      namedTimers:
        new Map(),

      pot: 0,

      potCollected: false,

      createdAt: Date.now(),

      message: null
    };

    sessions.set(
      session.id,
      session
    );

    active.set(
      activeKey(
        session.guildId,
        gameKey
      ),
      session.id
    );

    return session;
  }

  function getSession(
    sessionId
  ) {
    return sessions.get(
      sessionId
    );
  }

  function clearTimer(
    session,
    name
  ) {
    const timer =
      session.namedTimers.get(
        name
      );

    if (timer) {
      clearTimeout(timer);
      session.namedTimers.delete(
        name
      );
    }
  }

  function timer(
    session,
    name,
    ms,
    fn
  ) {
    clearTimer(
      session,
      name
    );

    const timeout =
      setTimeout(
        async () => {
          session.namedTimers.delete(
            name
          );

          if (
            !sessions.has(
              session.id
            )
          ) {
            return;
          }

          try {
            await fn();
          } catch (error) {
            console.error(
              `Game timer ${session.gameKey}:`,
              error
            );
          }
        },
        ms
      );

    session.namedTimers.set(
      name,
      timeout
    );

    return timeout;
  }

  function release(
    session
  ) {
    for (
      const timeout
      of session.namedTimers.values()
    ) {
      clearTimeout(timeout);
    }

    session.namedTimers.clear();

    sessions.delete(
      session.id
    );

    active.delete(
      activeKey(
        session.guildId,
        session.gameKey
      )
    );
  }

  async function updateLobby(
    session
  ) {
    if (!session.message)
      return;

    const game =
      getGame(
        session.gameKey
      );

    const members =
      [...session.players.keys()]
        .map(id => `<@${id}>`)
        .join("\n");

    let betText;

    if (session.mode === "staff") {
      betText =
        "🛡️ لعبة مشرفين — الفائز يحصل على 10 Credits حسب نظام المكافآت.";
    } else {
      const parts = [];

      if (session.startFee > 0) {
        parts.push(
          `🎟️ رسوم فتح اللعبة: **${session.startFee} Credits** — دفعها صاحب الأمر فقط`
        );
      }

      if (session.bet > 0) {
        parts.push(
          `💳 Bet: **${session.bet} Credits** لكل لاعب`
        );
      } else {
        parts.push(
          "💳 Bet: بدون Bet"
        );
      }

      betText =
        parts.join("\n");
    }

    await session.message
      .edit({
        content:
          `${game.emoji} **${game.name}**\n\n` +
          `${betText}\n\n` +
          `👥 المشاركون (${session.players.size}/${session.maxPlayers}):\n` +
          `${members || "لا أحد"}\n\n` +
          `⏳ تبدأ بعد دقيقة أو عند اكتمال العدد.`,

        components: [
          new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setCustomId(
                  `gjoin:${session.id}`
                )
                .setLabel(
                  `أشارك (${session.players.size}/${session.maxPlayers})`
                )
                .setStyle(
                  ButtonStyle.Success
                )
            )
        ]
      })
      .catch(() => {});
  }

  async function collectPot(
    session,
    {
      prune = true
    } = {}
  ) {
    if (
      session.mode !==
      "public"
    ) {
      return {
        ok: true
      };
    }

    if (
      Number(session.bet || 0) <= 0
    ) {
      session.pot = 0;
      session.potCollected = false;

      return {
        ok: true,
        pot: 0
      };
    }

    const credits =
      context.services.credits;

    const broke = [];

    for (
      const [userId]
      of session.players
    ) {
      if (
        credits.getBalance(
          session.guildId,
          userId
        ) < session.bet
      ) {
        broke.push(
          userId
        );
      }
    }

    if (
      broke.length &&
      !prune
    ) {
      return {
        ok: false,
        message:
          "❌ أحد اللاعبين لم يعد يملك Credits كافية."
      };
    }

    if (prune) {
      for (
        const userId
        of broke
      ) {
        session.players.delete(
          userId
        );
      }
    }

    if (
      session.players.size <
      session.minPlayers
    ) {
      return {
        ok: false,
        message:
          "❌ لم يبق عدد كافٍ من اللاعبين الذين لديهم Credits."
      };
    }

    for (
      const [userId, player]
      of session.players
    ) {
      credits.adjust(
        session.guildId,
        userId,
        -session.bet,
        player.username
      );
    }

    session.pot =
      session.players.size *
      session.bet;

    session.potCollected = true;

    return {
      ok: true,
      pot: session.pot
    };
  }

  function refundPot(
    session
  ) {
    if (
      !session.potCollected ||
      session.mode !==
      "public"
    ) {
      return;
    }

    for (
      const [userId, player]
      of session.players
    ) {
      context.services.credits
        .adjust(
          session.guildId,
          userId,
          session.bet,
          player.username
        );
    }

    session.potCollected = false;
    session.pot = 0;
  }

  function payPublicPot(
    session,
    winnerIds
  ) {
    if (
      !session.potCollected ||
      !winnerIds.length
    ) {
      return "";
    }

    const shuffled =
      [...winnerIds]
        .sort(
          () =>
            Math.random() - 0.5
        );

    const each =
      Math.floor(
        session.pot /
        shuffled.length
      );

    let remainder =
      session.pot %
      shuffled.length;

    const payouts = [];

    for (
      const userId
      of shuffled
    ) {
      const player =
        session.players.get(
          userId
        );

      if (!player)
        continue;

      const amount =
        each +
        (remainder > 0 ? 1 : 0);

      if (remainder > 0)
        remainder -= 1;

      context.services.credits
        .adjust(
          session.guildId,
          userId,
          amount,
          player.username
        );

      payouts.push(
        `<@${userId}> +${amount}`
      );
    }

    session.potCollected = false;

    return (
      `\n💳 **Pot: ${session.pot} Credits**\n` +
      payouts.join("\n")
    );
  }

  function staffResults(
    session,
    winnerIds
  ) {
    const winnerSet =
      new Set(winnerIds);

    const lines = [];

    for (
      const [userId, player]
      of session.players
    ) {
      if (
        winnerSet.has(
          userId
        )
      ) {
        const result =
          rewards.win(
            session.guildId,
            userId,
            player.username
          );

        if (result.rewarded) {
          lines.push(
            `💳 <@${userId}> +${result.amount} Credits`
          );

          if (result.locked) {
            lines.push(
              `🔒 <@${userId}> وصل الحد المسموح من الانتصارات المتتالية. لازم يكمل عدد الخسارات المحدد من الداشبورد قبل مكافأة جديدة.`
            );
          }
        } else {
          lines.push(
            `🔒 <@${userId}> فاز لكن مكافأة الفوز مقفلة حاليًا.`
          );
        }
      } else {
        rewards.lose(
          session.guildId,
          userId
        );
      }
    }

    return lines.length
      ? "\n" + lines.join("\n")
      : "";
  }

  async function finish(
    session,
    {
      winnerIds = [],
      text = "",
      draw = false
    } = {}
  ) {
    let rewardText = "";

    if (draw) {
      if (
        session.mode ===
        "public"
      ) {
        refundPot(
          session
        );

        rewardText =
          "\n💳 تم إرجاع الـBet للجميع.";
      }
    } else if (
      session.mode ===
      "public"
    ) {
      rewardText =
        payPublicPot(
          session,
          winnerIds
        );
    } else {
      rewardText =
        staffResults(
          session,
          winnerIds
        );
    }

    if (session.message) {
      await session.message
        .edit({
          content:
            text +
            rewardText,
          components: []
        })
        .catch(() => {});
    }

    release(
      session
    );
  }

  async function cancel(
    session,
    text
  ) {
    if (
      session.potCollected
    ) {
      refundPot(
        session
      );
    }

    let feeText = "";

    if (
      session.startFeePaid &&
      session.startFeeRefundable &&
      session.startFee > 0
    ) {
      const owner =
        session.players.get(
          session.ownerId
        );

      context.services.credits.adjust(
        session.guildId,
        session.ownerId,
        session.startFee,
        owner?.username || ""
      );

      session.startFeePaid = false;
      session.startFeeRefundable = false;

      feeText =
        `\n💳 تم إرجاع ${session.startFee} Credits لصاحب اللعبة.`;
    }

    if (session.message) {
      await session.message
        .edit({
          content:
            text + feeText,
          components: []
        })
        .catch(() => {});
    }

    release(
      session
    );
  }

  async function startLobby(
    interaction,
    gameKey,
    onReady
  ) {
    const game =
      getGame(
        gameKey
      );

    const pre =
      await preflight(
        interaction,
        gameKey
      );

    if (!pre.ok) {
      await privateReply(
        interaction,
        pre.message
      );

      return null;
    }

    const session =
      createSession({
        interaction,
        gameKey,
        mode: pre.mode,
        bet: pre.bet,
        startFee:
          pre.startFee || 0,
        players: [
          interaction.user
        ]
      });

    session.ownerId =
      interaction.user.id;

    // فقط صاحب أمر اللعبة يدفع رسوم الـ5.
    if (
      session.mode === "public" &&
      session.startFee > 0
    ) {
      context.services.credits.adjust(
        interaction.guildId,
        interaction.user.id,
        -session.startFee,
        interaction.user.username
      );

      session.startFeePaid = true;

      // ترجع فقط إذا اللعبة لم تبدأ.
      session.startFeeRefundable = true;
    }

    session.phase = "lobby";
    session.minPlayers =
      game.minPlayers;
    session.maxPlayers =
      game.maxPlayers;
    session.onReady =
      onReady;

    await interaction.reply({
      content:
        "جاري فتح التسجيل..."
    });

    session.message =
      await interaction
        .fetchReply();

    await updateLobby(
      session
    );

    async function start() {
      if (
        !sessions.has(
          session.id
        ) ||
        session.phase !==
        "lobby"
      ) {
        return;
      }

      clearTimer(
        session,
        "lobby"
      );

      if (
        session.players.size <
        session.minPlayers
      ) {
        return cancel(
          session,
          `❌ تم إلغاء **${game.name}** لأن عدد المشاركين أقل من ${session.minPlayers}.`
        );
      }

      const pot =
        await collectPot(
          session
        );

      if (!pot.ok) {
        return cancel(
          session,
          pot.message
        );
      }

      session.phase =
        "playing";

      session.startFeeRefundable =
        false;

      await onReady(
        session
      );
    }

    session.startLobbyGame =
      start;

    timer(
      session,
      "lobby",
      60_000,
      start
    );

    return session;
  }

  async function handleJoin(
    interaction
  ) {
    if (
      !interaction.isButton() ||
      !interaction.customId
        .startsWith(
          "gjoin:"
        )
    ) {
      return false;
    }

    const sessionId =
      interaction.customId
        .split(":")[1];

    const session =
      getSession(
        sessionId
      );

    if (
      !session ||
      session.phase !==
      "lobby"
    ) {
      await privateReply(
        interaction,
        "❌ انتهى التسجيل."
      );

      return true;
    }

    if (
      session.players.has(
        interaction.user.id
      )
    ) {
      await privateReply(
        interaction,
        "أنت مشارك بالفعل."
      );

      return true;
    }

    if (
      session.players.size >=
      session.maxPlayers
    ) {
      await privateReply(
        interaction,
        "❌ اكتمل العدد."
      );

      return true;
    }

    if (
      session.mode ===
      "public"
    ) {
      const validation =
        context.services.betting
          .validateBet(
            session.guildId,
            interaction.user.id,
            session.bet
          );

      if (!validation.ok) {
        await privateReply(
          interaction,
          validation.message
        );

        return true;
      }
    }

    session.players.set(
      interaction.user.id,
      userData(
        interaction.user
      )
    );

    await privateReply(
      interaction,
      `✅ شاركت في اللعبة${session.mode === "public" ? ` بـBet ${session.bet}` : ""}.`
    );

    await updateLobby(
      session
    );

    if (
      session.players.size >=
      session.maxPlayers
    ) {
      await session
        .startLobbyGame();
    }

    return true;
  }

  return {
    client,
    context,
    rewards,

    sessions,

    getSettings,
    modeFor,
    isStaff,

    privateReply,

    preflight,

    createSession,
    getSession,

    timer,
    clearTimer,
    release,

    collectPot,
    refundPot,

    finish,
    cancel,

    startLobby,
    handleJoin
  };
}

module.exports = {
  createGameEngine
};
