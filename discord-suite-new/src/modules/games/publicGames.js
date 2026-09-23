const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder
} = require("discord.js");

const {
  drawRandomQuestion,
  buildChoices
} = require("./questions");

function randomInt(
  min,
  max
) {
  return Math.floor(
    Math.random() *
    (max - min + 1)
  ) + min;
}

function randomFrom(items) {
  return items[
    Math.floor(
      Math.random() *
      items.length
    )
  ];
}

function createPublicGames(
  engine
) {

  // ======================================================
  // DIRECT CHALLENGE: XO / RPS
  // ======================================================

  async function startChallenge(
    interaction,
    gameKey
  ) {
    const pre =
      await engine.preflight(
        interaction,
        gameKey
      );

    if (!pre.ok) {
      await engine.privateReply(
        interaction,
        pre.message
      );

      return;
    }

    const target =
      interaction.options
        .getUser(
          "user",
          true
        );

    if (
      target.bot ||
      target.id ===
        interaction.user.id
    ) {
      return engine.privateReply(
        interaction,
        "❌ اختر عضوًا آخر حقيقيًا."
      );
    }

    if (
      pre.mode ===
      "public"
    ) {
      const check =
        engine.context.services
          .betting
          .validateBet(
            interaction.guildId,
            target.id,
            pre.bet
          );

      if (!check.ok) {
        return engine.privateReply(
          interaction,
          `❌ الشخص الذي تحديته لا يملك Credits كافية لهذا الـBet.`
        );
      }
    }

    const session =
      engine.createSession({
        interaction,
        gameKey,
        mode: pre.mode,
        bet: pre.bet,
        players: [
          interaction.user,
          target
        ]
      });

    session.phase =
      "challenge";

    session.challengerId =
      interaction.user.id;

    session.targetId =
      target.id;

    session.minPlayers = 2;

    await interaction.reply({
      content:
        `🎮 <@${target.id}> تم تحديك من <@${interaction.user.id}> في **${gameKey === "xo" ? "XO" : "حجرة ورقة مقص"}**.\n` +
        (
          pre.mode === "public"
            ? `💳 Bet: **${pre.bet} Credits** لكل لاعب.\n`
            : "🛡️ لعبة مشرفين: الفائز يحصل على مكافأة 10 Credits.\n"
        ) +
        `⏳ لديك **60 ثانية** للقبول.`,

      components: [
        new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId(
                `challenge_accept:${session.id}`
              )
              .setLabel("قبول")
              .setStyle(
                ButtonStyle.Success
              ),

            new ButtonBuilder()
              .setCustomId(
                `challenge_decline:${session.id}`
              )
              .setLabel("رفض")
              .setStyle(
                ButtonStyle.Danger
              )
          )
      ]
    });

    session.message =
      await interaction
        .fetchReply();

    engine.timer(
      session,
      "challenge",
      60_000,
      () =>
        engine.cancel(
          session,
          "⌛ انتهت مهلة التحدي وتم إلغاؤه."
        )
    );
  }

  async function acceptChallenge(
    interaction,
    session
  ) {
    if (
      interaction.user.id !==
      session.targetId
    ) {
      return engine.privateReply(
        interaction,
        "❌ هذا التحدي ليس لك."
      );
    }

    engine.clearTimer(
      session,
      "challenge"
    );

    if (
      session.mode ===
      "public"
    ) {
      const pot =
        await engine.collectPot(
          session,
          {
            prune: false
          }
        );

      if (!pot.ok) {
        await interaction.deferUpdate();

        return engine.cancel(
          session,
          pot.message
        );
      }
    }

    await interaction.deferUpdate();

    if (
      session.gameKey ===
      "xo"
    ) {
      return startXO(
        session
      );
    }

    return startRPS(
      session
    );
  }

  // ======================================================
  // XO
  // ======================================================

  function xoRows(
    session
  ) {
    const rows = [];

    for (
      let r = 0;
      r < 3;
      r++
    ) {
      const row =
        new ActionRowBuilder();

      for (
        let c = 0;
        c < 3;
        c++
      ) {
        const i =
          r * 3 + c;

        const value =
          session.board[i];

        row.addComponents(
          new ButtonBuilder()
            .setCustomId(
              `xocell:${session.id}:${i}`
            )
            .setLabel(
              value || "•"
            )
            .setStyle(
              value === "X"
                ? ButtonStyle.Danger
                : value === "O"
                  ? ButtonStyle.Primary
                  : ButtonStyle.Secondary
            )
            .setDisabled(
              Boolean(value)
            )
        );
      }

      rows.push(row);
    }

    return rows;
  }

  async function startXO(
    session
  ) {
    session.phase = "xo";
    session.board =
      Array(9).fill(null);

    session.symbols = {
      [session.challengerId]:
        "X",

      [session.targetId]:
        "O"
    };

    session.current =
      Math.random() < 0.5
        ? session.challengerId
        : session.targetId;

    await renderXO(
      session
    );
  }

  async function renderXO(
    session
  ) {
    await session.message
      .edit({
        content:
          `❌⭕ **XO**\n\n` +
          `<@${session.challengerId}> = ❌ X\n` +
          `<@${session.targetId}> = ⭕ O\n\n` +
          `الدور على: <@${session.current}>`,

        components:
          xoRows(session)
      });

    engine.timer(
      session,
      "xo-turn",
      30_000,
      async () => {
        const winner =
          session.current ===
          session.challengerId
            ? session.targetId
            : session.challengerId;

        await engine.finish(
          session,
          {
            winnerIds: [
              winner
            ],

            text:
              `⌛ <@${session.current}> لم يلعب خلال 30 ثانية.\n🏆 <@${winner}> فاز.`
          }
        );
      }
    );
  }

  function xoWinner(board) {
    const lines = [
      [0,1,2],
      [3,4,5],
      [6,7,8],
      [0,3,6],
      [1,4,7],
      [2,5,8],
      [0,4,8],
      [2,4,6]
    ];

    for (
      const [a,b,c]
      of lines
    ) {
      if (
        board[a] &&
        board[a] ===
          board[b] &&
        board[a] ===
          board[c]
      ) {
        return board[a];
      }
    }

    return null;
  }

  async function handleXO(
    interaction
  ) {
    if (
      !interaction.isButton() ||
      !interaction.customId
        .startsWith(
          "xocell:"
        )
    ) {
      return false;
    }

    const [
      ,
      sessionId,
      rawIndex
    ] =
      interaction.customId
        .split(":");

    const session =
      engine.getSession(
        sessionId
      );

    if (
      !session ||
      session.phase !== "xo"
    ) {
      await engine.privateReply(
        interaction,
        "❌ اللعبة انتهت."
      );

      return true;
    }

    if (
      interaction.user.id !==
      session.current
    ) {
      await engine.privateReply(
        interaction,
        "❌ ليس دورك."
      );

      return true;
    }

    const index =
      Number(rawIndex);

    if (
      session.board[index]
    ) {
      await engine.privateReply(
        interaction,
        "❌ هذه الخانة مستخدمة."
      );

      return true;
    }

    engine.clearTimer(
      session,
      "xo-turn"
    );

    session.board[index] =
      session.symbols[
        interaction.user.id
      ];

    const symbolWinner =
      xoWinner(
        session.board
      );

    if (symbolWinner) {
      const winnerId =
        Object.entries(
          session.symbols
        ).find(
          ([, symbol]) =>
            symbol ===
            symbolWinner
        )[0];

      await interaction.deferUpdate();

      return engine.finish(
        session,
        {
          winnerIds: [
            winnerId
          ],

          text:
            `❌⭕ انتهت XO!\n🏆 الفائز: <@${winnerId}>`
        }
      );
    }

    if (
      session.board.every(Boolean)
    ) {
      await interaction.deferUpdate();

      return engine.finish(
        session,
        {
          draw: true,

          text:
            "🤝 انتهت XO بالتعادل."
        }
      );
    }

    session.current =
      session.current ===
      session.challengerId
        ? session.targetId
        : session.challengerId;

    await interaction.deferUpdate();

    await renderXO(
      session
    );

    return true;
  }


  // ======================================================
  // ROCK PAPER SCISSORS
  // ======================================================

  async function startRPS(
    session
  ) {
    session.phase = "rps";
    session.choices =
      new Map();

    await session.message
      .edit({
        content:
          `✊📄✂️ **حجرة ورقة مقص**\n\n` +
          `كل لاعب يختار بشكل سري.\nلديكم 30 ثانية.`,

        components: [
          new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setCustomId(
                  `rpspick:${session.id}:rock`
                )
                .setLabel("حجرة")
                .setEmoji("✊")
                .setStyle(
                  ButtonStyle.Secondary
                ),

              new ButtonBuilder()
                .setCustomId(
                  `rpspick:${session.id}:paper`
                )
                .setLabel("ورقة")
                .setEmoji("📄")
                .setStyle(
                  ButtonStyle.Primary
                ),

              new ButtonBuilder()
                .setCustomId(
                  `rpspick:${session.id}:scissors`
                )
                .setLabel("مقص")
                .setEmoji("✂️")
                .setStyle(
                  ButtonStyle.Danger
                )
            )
        ]
      });

    engine.timer(
      session,
      "rps",
      30_000,
      async () => {
        const chosen =
          [...session.choices.keys()];

        if (
          chosen.length === 1
        ) {
          return engine.finish(
            session,
            {
              winnerIds: chosen,

              text:
                `⌛ اللاعب الآخر لم يختر.\n🏆 <@${chosen[0]}> فاز.`
            }
          );
        }

        return engine.finish(
          session,
          {
            draw: true,
            text:
              "⌛ انتهى الوقت بدون نتيجة."
          }
        );
      }
    );
  }

  async function handleRPS(
    interaction
  ) {
    if (
      !interaction.isButton() ||
      !interaction.customId
        .startsWith(
          "rpspick:"
        )
    ) {
      return false;
    }

    const [
      ,
      sessionId,
      choice
    ] =
      interaction.customId
        .split(":");

    const session =
      engine.getSession(
        sessionId
      );

    if (
      !session ||
      session.phase !==
        "rps"
    ) {
      await engine.privateReply(
        interaction,
        "❌ اللعبة انتهت."
      );

      return true;
    }

    if (
      !session.players.has(
        interaction.user.id
      )
    ) {
      await engine.privateReply(
        interaction,
        "❌ أنت لست مشاركًا."
      );

      return true;
    }

    if (
      session.choices.has(
        interaction.user.id
      )
    ) {
      await engine.privateReply(
        interaction,
        "❌ اخترت مسبقًا."
      );

      return true;
    }

    session.choices.set(
      interaction.user.id,
      choice
    );

    await engine.privateReply(
      interaction,
      "✅ تم تسجيل اختيارك سرًا."
    );

    if (
      session.choices.size < 2
    ) {
      return true;
    }

    engine.clearTimer(
      session,
      "rps"
    );

    const ids =
      [...session.players.keys()];

    const a = ids[0];
    const b = ids[1];

    const ca =
      session.choices.get(a);

    const cb =
      session.choices.get(b);

    const emoji = {
      rock: "✊",
      paper: "📄",
      scissors: "✂️"
    };

    if (ca === cb) {
      return engine.finish(
        session,
        {
          draw: true,

          text:
            `🤝 تعادل!\n<@${a}> ${emoji[ca]} — <@${b}> ${emoji[cb]}`
        }
      );
    }

    const aWins =
      (
        ca === "rock" &&
        cb === "scissors"
      ) ||
      (
        ca === "paper" &&
        cb === "rock"
      ) ||
      (
        ca === "scissors" &&
        cb === "paper"
      );

    const winner =
      aWins ? a : b;

    return engine.finish(
      session,
      {
        winnerIds: [
          winner
        ],

        text:
          `<@${a}> ${emoji[ca]}\n` +
          `<@${b}> ${emoji[cb]}\n\n` +
          `🏆 الفائز: <@${winner}>`
      }
    );
  }


  // ======================================================
  // MULTIPLAYER LOBBY COMMANDS
  // ======================================================

  async function coinout(
    interaction
  ) {
    return engine.startLobby(
      interaction,
      "coinout",
      startCoinout
    );
  }

  async function startCoinout(
    session
  ) {
    session.survivors =
      new Set(
        session.players.keys()
      );

    session.round = 0;

    await coinRound(
      session
    );
  }

  async function coinRound(
    session
  ) {
    if (
      session.survivors.size ===
      1
    ) {
      const winner =
        [...session.survivors][0];

      return engine.finish(
        session,
        {
          winnerIds: [
            winner
          ],

          text:
            `🏆 انتهت إقصاء العملة!\nالفائز: <@${winner}>`
        }
      );
    }

    session.round += 1;

    const results = [];

    const sharks = [];

    for (
      const userId
      of session.survivors
    ) {
      const shark =
        Math.random() < 0.5;

      results.push(
        `${shark ? "🦈" : "🐟"} <@${userId}> — ${shark ? "Shark" : "Tuna Safe"}`
      );

      if (shark)
        sharks.push(userId);
    }

    if (
      sharks.length ===
      session.survivors.size
    ) {
      await session.message.edit({
        content:
          `🪙 **إقصاء العملة — Round ${session.round}**\n\n` +
          results.join("\n") +
          "\n\n⚠️ الجميع طلع Shark، الجولة ملغية ونعيد."
      });

      return engine.timer(
        session,
        "coin",
        3500,
        () =>
          coinRound(
            session
          )
      );
    }

    for (
      const id
      of sharks
    ) {
      session.survivors.delete(
        id
      );
    }

    await session.message.edit({
      content:
        `🪙 **إقصاء العملة — Round ${session.round}**\n\n` +
        results.join("\n") +
        `\n\n👥 الباقون: ${[...session.survivors].map(id => `<@${id}>`).join(" ")}`
    });

    engine.timer(
      session,
      "coin",
      3500,
      () =>
        coinRound(
          session
        )
    );
  }


  // ======================================================
  // GUESS NUMBER
  // ======================================================

  async function guessnumber(
    interaction
  ) {
    return engine.startLobby(
      interaction,
      "guessnumber",
      startGuess
    );
  }

  async function startGuess(
    session
  ) {
    session.phase =
      "guess-pick";

    session.picks =
      new Map();

    await session.message.edit({
      content:
        "🔢 **تخمين الرقم**\n\nكل لاعب يختار رقمًا سريًا من 1 إلى 100.\nلديكم 30 ثانية.",

      components: [
        new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId(
                `guessopen:${session.id}`
              )
              .setLabel(
                "اختار رقمي"
              )
              .setStyle(
                ButtonStyle.Primary
              )
          )
      ]
    });

    engine.timer(
      session,
      "guess",
      30_000,
      () =>
        resolveGuess(
          session
        )
    );
  }

  async function openGuess(
    interaction,
    session,
    type
  ) {
    if (
      !session.players.has(
        interaction.user.id
      )
    ) {
      return engine.privateReply(
        interaction,
        "❌ أنت لست مشاركًا."
      );
    }

    const modal =
      new ModalBuilder()
        .setCustomId(
          `${type}modal:${session.id}`
        )
        .setTitle(
          type === "guess"
            ? "اختار رقم 1-100"
            : "اختار رقم 1-10"
        );

    const input =
      new TextInputBuilder()
        .setCustomId("number")
        .setLabel(
          type === "guess"
            ? "رقمك من 1 إلى 100"
            : "رقمك من 1 إلى 10"
        )
        .setStyle(
          TextInputStyle.Short
        )
        .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder()
        .addComponents(input)
    );

    await interaction.showModal(
      modal
    );
  }

  async function resolveGuess(
    session
  ) {
    if (
      !engine.getSession(
        session.id
      )
    )
      return;

    if (
      !session.picks.size
    ) {
      return engine.finish(
        session,
        {
          draw: true,
          text:
            "❌ لم يختر أحد رقمًا."
        }
      );
    }

    const target =
      randomInt(1, 100);

    let closest =
      Infinity;

    let winners = [];

    for (
      const [userId, number]
      of session.picks
    ) {
      const distance =
        Math.abs(
          target - number
        );

      if (
        distance < closest
      ) {
        closest = distance;
        winners = [userId];
      } else if (
        distance === closest
      ) {
        winners.push(
          userId
        );
      }
    }

    const lines =
      [...session.picks]
        .map(
          ([id, n]) =>
            `<@${id}> → **${n}**`
        )
        .join("\n");

    return engine.finish(
      session,
      {
        winnerIds:
          winners,

        text:
          `🔢 الرقم العشوائي: **${target}**\n\n${lines}\n\n` +
          `🏆 الأقرب: ${winners.map(id => `<@${id}>`).join(" ")}`
      }
    );
  }


  // ======================================================
  // HIGH DICE
  // ======================================================

  async function highdice(
    interaction
  ) {
    return engine.startLobby(
      interaction,
      "highdice",
      startHighDice
    );
  }

  async function startHighDice(
    session
  ) {
    let contenders =
      [...session.players.keys()];

    const logs = [];

    let round = 0;

    while (
      contenders.length > 1 &&
      round < 15
    ) {
      round += 1;

      const rolls =
        contenders.map(
          id => ({
            id,
            roll:
              randomInt(
                1,
                6
              )
          })
        );

      const highest =
        Math.max(
          ...rolls.map(
            item =>
              item.roll
          )
        );

      contenders =
        rolls
          .filter(
            item =>
              item.roll ===
              highest
          )
          .map(
            item =>
              item.id
          );

      logs.push(
        `**Round ${round}**\n` +
        rolls
          .map(
            item =>
              `🎲 <@${item.id}> = ${item.roll}`
          )
          .join("\n")
      );
    }

    const winner =
      contenders.length === 1
        ? contenders[0]
        : randomFrom(
            contenders
          );

    return engine.finish(
      session,
      {
        winnerIds: [
          winner
        ],

        text:
          `🎲 **أعلى نرد**\n\n` +
          logs.join("\n\n") +
          `\n\n🏆 الفائز: <@${winner}>`
      }
    );
  }


  // ======================================================
  // FASTEST BUTTON
  // ======================================================

  async function fastest(
    interaction
  ) {
    return engine.startLobby(
      interaction,
      "fastest",
      startFastest
    );
  }

  async function startFastest(
    session
  ) {
    session.phase =
      "fast-wait";

    await session.message.edit({
      content:
        "⚡ **أسرع زر**\n\nانتظر... لا يوجد زر جاهز بعد.",

      components: [
        new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId(
                `fastclick:${session.id}`
              )
              .setLabel("انتظر...")
              .setDisabled(true)
              .setStyle(
                ButtonStyle.Secondary
              )
          )
      ]
    });

    engine.timer(
      session,
      "fast-ready",
      randomInt(
        3000,
        8000
      ),
      async () => {
        session.phase =
          "fast-click";

        await session.message.edit({
          content:
            "⚡ **اضغط الآن!**",

          components: [
            new ActionRowBuilder()
              .addComponents(
                new ButtonBuilder()
                  .setCustomId(
                    `fastclick:${session.id}`
                  )
                  .setLabel(
                    "اضغط!"
                  )
                  .setEmoji("⚡")
                  .setStyle(
                    ButtonStyle.Success
                  )
              )
          ]
        });

        engine.timer(
          session,
          "fast-timeout",
          15_000,
          () =>
            engine.finish(
              session,
              {
                draw: true,
                text:
                  "⌛ لم يضغط أحد."
              }
            )
        );
      }
    );
  }

  async function handleFast(
    interaction
  ) {
    if (
      !interaction.isButton() ||
      !interaction.customId
        .startsWith(
          "fastclick:"
        )
    ) {
      return false;
    }

    const session =
      engine.getSession(
        interaction.customId
          .split(":")[1]
      );

    if (!session) {
      await engine.privateReply(
        interaction,
        "❌ انتهت اللعبة."
      );

      return true;
    }

    if (
      !session.players.has(
        interaction.user.id
      )
    ) {
      await engine.privateReply(
        interaction,
        "❌ أنت لست مشاركًا."
      );

      return true;
    }

    if (
      session.phase !==
      "fast-click"
    ) {
      await engine.privateReply(
        interaction,
        "⏳ ليس الآن."
      );

      return true;
    }

    await interaction.deferUpdate();

    return engine.finish(
      session,
      {
        winnerIds: [
          interaction.user.id
        ],

        text:
          `⚡ <@${interaction.user.id}> كان الأسرع!`
      }
    );
  }


  // ======================================================
  // QUICK QUIZ
  // ======================================================

  async function quickquiz(
    interaction
  ) {
    return engine.startLobby(
      interaction,
      "quickquiz",
      startQuiz
    );
  }

  async function startQuiz(
    session
  ) {
    session.phase =
      "quiz";

    const drawn =
      drawRandomQuestion();

    const choices =
      buildChoices(
        drawn.number
      );

    session.question = {
      id: drawn.number,
      q: drawn.question,
      answer: drawn.answer,
      answers: choices.answers,
      correct: choices.correct
    };

    session.answered =
      new Set();

    const row =
      new ActionRowBuilder();

    session.question.answers
      .forEach(
        (answer, index) => {
          row.addComponents(
            new ButtonBuilder()
              .setCustomId(
                `quizanswer:${session.id}:${index}`
              )
              .setLabel(
                answer
              )
              .setStyle(
                ButtonStyle.Secondary
              )
          );
        }
      );

    await session.message.edit({
      content:
        `🧠 **سؤال سريع**\n\n🔢 السؤال رقم **#${session.question.id}**\n\n${session.question.q}\n\nأول إجابة صحيحة تفوز.`,

      components: [row]
    });

    engine.timer(
      session,
      "quiz",
      20_000,
      () =>
        engine.finish(
          session,
          {
            draw: true,
            text:
              "⌛ انتهى الوقت بدون إجابة صحيحة."
          }
        )
    );
  }

  async function handleQuiz(
    interaction
  ) {
    if (
      !interaction.isButton() ||
      !interaction.customId
        .startsWith(
          "quizanswer:"
        )
    ) {
      return false;
    }

    const [
      ,
      sessionId,
      rawAnswer
    ] =
      interaction.customId
        .split(":");

    const session =
      engine.getSession(
        sessionId
      );

    if (
      !session ||
      session.phase !==
        "quiz"
    ) {
      await engine.privateReply(
        interaction,
        "❌ انتهى السؤال."
      );

      return true;
    }

    if (
      !session.players.has(
        interaction.user.id
      )
    ) {
      await engine.privateReply(
        interaction,
        "❌ أنت لست مشاركًا."
      );

      return true;
    }

    if (
      session.answered.has(
        interaction.user.id
      )
    ) {
      await engine.privateReply(
        interaction,
        "❌ أجبت مسبقًا."
      );

      return true;
    }

    session.answered.add(
      interaction.user.id
    );

    const answer =
      Number(rawAnswer);

    if (
      answer ===
      session.question.correct
    ) {
      await interaction.deferUpdate();

      return engine.finish(
        session,
        {
          winnerIds: [
            interaction.user.id
          ],

          text:
            `🧠 ${session.question.q}\n\n✅ <@${interaction.user.id}> أجاب أولًا بشكل صحيح!\n` +
            `الإجابة: **${session.question.answers[session.question.correct]}**`
        }
      );
    }

    await engine.privateReply(
      interaction,
      "❌ إجابة خاطئة."
    );

    if (
      session.answered.size >=
      session.players.size
    ) {
      return engine.finish(
        session,
        {
          draw: true,

          text:
            `❌ الجميع أجاب خطأ.\nالإجابة الصحيحة: **${session.question.answers[session.question.correct]}**`
        }
      );
    }

    return true;
  }


  // ======================================================
  // BANNED NUMBER
  // ======================================================

  async function bannednumber(
    interaction
  ) {
    return engine.startLobby(
      interaction,
      "bannednumber",
      startBanned
    );
  }

  async function startBanned(
    session
  ) {
    session.survivors =
      new Set(
        session.players.keys()
      );

    session.banRound = 0;

    await beginBannedRound(
      session
    );
  }

  async function beginBannedRound(
    session
  ) {
    if (
      session.survivors.size ===
      1
    ) {
      const winner =
        [...session.survivors][0];

      return engine.finish(
        session,
        {
          winnerIds: [
            winner
          ],

          text:
            `🎯 انتهت لعبة الرقم الممنوع!\n🏆 <@${winner}> فاز.`
        }
      );
    }

    session.banRound += 1;
    session.banPicks =
      new Map();

    session.phase =
      "banned-pick";

    await session.message.edit({
      content:
        `🎯 **الرقم الممنوع — Round ${session.banRound}**\n\n` +
        `كل لاعب باقٍ يختار سرًا رقمًا من 1 إلى 10.\n` +
        `البوت سيختار رقمًا ممنوعًا بعد اختياراتكم.\n\n` +
        `👥 ${[...session.survivors].map(id => `<@${id}>`).join(" ")}`,

      components: [
        new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId(
                `banopen:${session.id}`
              )
              .setLabel(
                "اختار رقمي"
              )
              .setStyle(
                ButtonStyle.Primary
              )
          )
      ]
    });

    engine.timer(
      session,
      "banned",
      30_000,
      () =>
        resolveBanned(
          session,
          true
        )
    );
  }

  async function resolveBanned(
    session,
    timeout = false
  ) {
    if (
      !engine.getSession(
        session.id
      )
    )
      return;

    if (timeout) {
      for (
        const id
        of [...session.survivors]
      ) {
        if (
          !session.banPicks.has(
            id
          )
        ) {
          session.survivors.delete(
            id
          );
        }
      }

      if (
        session.survivors.size ===
        0
      ) {
        return engine.finish(
          session,
          {
            draw: true,
            text:
              "⌛ لم يختَر أحد في الوقت المحدد."
          }
        );
      }
    }

    const forbidden =
      randomInt(
        1,
        10
      );

    const before =
      new Set(
        session.survivors
      );

    const eliminated = [];

    for (
      const [userId, number]
      of session.banPicks
    ) {
      if (
        number ===
        forbidden &&
        session.survivors.has(
          userId
        )
      ) {
        session.survivors.delete(
          userId
        );

        eliminated.push(
          userId
        );
      }
    }

    if (
      session.survivors.size ===
      0 &&
      before.size > 0
    ) {
      session.survivors =
        before;

      await session.message.edit({
        content:
          `🎯 الرقم الممنوع كان **${forbidden}**.\nالجميع انقصى، لذلك الجولة ملغية ونعيد.`
      });

      return engine.timer(
        session,
        "ban-next",
        2500,
        () =>
          beginBannedRound(
            session
          )
      );
    }

    await session.message.edit({
      content:
        `🎯 الرقم الممنوع: **${forbidden}**\n\n` +
        (
          eliminated.length
            ? `💀 انقصى: ${eliminated.map(id => `<@${id}>`).join(" ")}`
            : "✅ لم يتم إقصاء أحد."
        )
    });

    engine.timer(
      session,
      "ban-next",
      2500,
      () =>
        beginBannedRound(
          session
        )
    );
  }


  // ======================================================
  // SAFE BOX
  // ======================================================

  async function safebox(
    interaction
  ) {
    return engine.startLobby(
      interaction,
      "safebox",
      startSafeBox
    );
  }

  async function startSafeBox(
    session
  ) {
    session.survivors =
      new Set(
        session.players.keys()
      );

    session.boxRound = 0;

    await beginBoxRound(
      session
    );
  }

  async function beginBoxRound(
    session
  ) {
    if (
      session.survivors.size ===
      1
    ) {
      const winner =
        [...session.survivors][0];

      return engine.finish(
        session,
        {
          winnerIds: [
            winner
          ],

          text:
            `📦 انتهت لعبة الصندوق الآمن!\n🏆 <@${winner}> فاز.`
        }
      );
    }

    session.boxRound += 1;

    session.boxPicks =
      new Map();

    session.phase =
      "box-pick";

    const menu =
      new StringSelectMenuBuilder()
        .setCustomId(
          `boxpick:${session.id}`
        )
        .setPlaceholder(
          "اختر صندوقًا"
        )
        .addOptions(
          [1,2,3,4,5,6]
            .map(
              number => ({
                label:
                  `صندوق ${number}`,
                value:
                  String(number),
                emoji: "📦"
              })
            )
        );

    await session.message.edit({
      content:
        `💣 **الصندوق الآمن — Round ${session.boxRound}**\n\n` +
        `كل لاعب يختار صندوقًا سرًا.\nواحد من الصناديق فيه 💣.\n\n` +
        `👥 ${[...session.survivors].map(id => `<@${id}>`).join(" ")}`,

      components: [
        new ActionRowBuilder()
          .addComponents(
            menu
          )
      ]
    });

    engine.timer(
      session,
      "box",
      30_000,
      () =>
        resolveBox(
          session,
          true
        )
    );
  }

  async function resolveBox(
    session,
    timeout = false
  ) {
    if (
      !engine.getSession(
        session.id
      )
    )
      return;

    if (timeout) {
      for (
        const id
        of [...session.survivors]
      ) {
        if (
          !session.boxPicks.has(
            id
          )
        ) {
          session.survivors.delete(
            id
          );
        }
      }

      if (
        session.survivors.size ===
        0
      ) {
        return engine.finish(
          session,
          {
            draw: true,
            text:
              "⌛ لم يختَر أحد صندوقًا."
          }
        );
      }
    }

    const bomb =
      randomInt(
        1,
        6
      );

    const before =
      new Set(
        session.survivors
      );

    const eliminated = [];

    for (
      const [userId, box]
      of session.boxPicks
    ) {
      if (
        Number(box) ===
        bomb &&
        session.survivors.has(
          userId
        )
      ) {
        session.survivors.delete(
          userId
        );

        eliminated.push(
          userId
        );
      }
    }

    if (
      session.survivors.size ===
      0
    ) {
      session.survivors =
        before;

      await session.message.edit({
        content:
          `💣 القنبلة كانت في صندوق **${bomb}**.\nالجميع اختار الصندوق الخاسر، نعيد الجولة.`
      });

      return engine.timer(
        session,
        "box-next",
        2500,
        () =>
          beginBoxRound(
            session
          )
      );
    }

    await session.message.edit({
      content:
        `💣 الصندوق الخاسر: **${bomb}**\n\n` +
        (
          eliminated.length
            ? `💀 خرج: ${eliminated.map(id => `<@${id}>`).join(" ")}`
            : "✅ الجميع آمن هذه الجولة."
        )
    });

    engine.timer(
      session,
      "box-next",
      2500,
      () =>
        beginBoxRound(
          session
        )
    );
  }


  // ======================================================
  // INTERACTIONS
  // ======================================================

  async function handleChallenge(
    interaction
  ) {
    const accept =
      interaction.isButton() &&
      interaction.customId
        .startsWith(
          "challenge_accept:"
        );

    const decline =
      interaction.isButton() &&
      interaction.customId
        .startsWith(
          "challenge_decline:"
        );

    if (
      !accept &&
      !decline
    ) {
      return false;
    }

    const session =
      engine.getSession(
        interaction.customId
          .split(":")[1]
      );

    if (!session) {
      await engine.privateReply(
        interaction,
        "❌ انتهى التحدي."
      );

      return true;
    }

    if (
      interaction.user.id !==
      session.targetId
    ) {
      await engine.privateReply(
        interaction,
        "❌ هذا التحدي ليس لك."
      );

      return true;
    }

    if (decline) {
      await interaction.deferUpdate();

      await engine.cancel(
        session,
        `❌ <@${session.targetId}> رفض التحدي.`
      );

      return true;
    }

    await acceptChallenge(
      interaction,
      session
    );

    return true;
  }

  async function handleGuessButton(
    interaction
  ) {
    if (
      interaction.isButton() &&
      interaction.customId
        .startsWith(
          "guessopen:"
        )
    ) {
      const session =
        engine.getSession(
          interaction.customId
            .split(":")[1]
        );

      if (
        !session ||
        session.phase !==
          "guess-pick"
      ) {
        await engine.privateReply(
          interaction,
          "❌ انتهى وقت الاختيار."
        );

        return true;
      }

      await openGuess(
        interaction,
        session,
        "guess"
      );

      return true;
    }

    if (
      interaction.isButton() &&
      interaction.customId
        .startsWith(
          "banopen:"
        )
    ) {
      const session =
        engine.getSession(
          interaction.customId
            .split(":")[1]
        );

      if (
        !session ||
        !session.survivors
          ?.has(
            interaction.user.id
          )
      ) {
        await engine.privateReply(
          interaction,
          "❌ أنت خارج اللعبة."
        );

        return true;
      }

      await openGuess(
        interaction,
        session,
        "ban"
      );

      return true;
    }

    return false;
  }

  async function handleModal(
    interaction
  ) {
    if (
      !interaction
        .isModalSubmit()
    ) {
      return false;
    }

    if (
      interaction.customId
        .startsWith(
          "guessmodal:"
        )
    ) {
      const session =
        engine.getSession(
          interaction.customId
            .split(":")[1]
        );

      if (!session) {
        await engine.privateReply(
          interaction,
          "❌ انتهت اللعبة."
        );

        return true;
      }

      const number =
        Number(
          interaction.fields
            .getTextInputValue(
              "number"
            )
        );

      if (
        !Number.isInteger(
          number
        ) ||
        number < 1 ||
        number > 100
      ) {
        await engine.privateReply(
          interaction,
          "❌ اختر رقمًا من 1 إلى 100."
        );

        return true;
      }

      session.picks.set(
        interaction.user.id,
        number
      );

      await engine.privateReply(
        interaction,
        `✅ اخترت **${number}** سرًا.`
      );

      if (
        session.picks.size >=
        session.players.size
      ) {
        engine.clearTimer(
          session,
          "guess"
        );

        await resolveGuess(
          session
        );
      }

      return true;
    }

    if (
      interaction.customId
        .startsWith(
          "banmodal:"
        )
    ) {
      const session =
        engine.getSession(
          interaction.customId
            .split(":")[1]
        );

      if (
        !session ||
        !session.survivors
          ?.has(
            interaction.user.id
          )
      ) {
        await engine.privateReply(
          interaction,
          "❌ انتهت الجولة."
        );

        return true;
      }

      const number =
        Number(
          interaction.fields
            .getTextInputValue(
              "number"
            )
        );

      if (
        !Number.isInteger(
          number
        ) ||
        number < 1 ||
        number > 10
      ) {
        await engine.privateReply(
          interaction,
          "❌ اختر رقمًا من 1 إلى 10."
        );

        return true;
      }

      session.banPicks.set(
        interaction.user.id,
        number
      );

      await engine.privateReply(
        interaction,
        `✅ تم تسجيل رقمك **${number}** سرًا.`
      );

      const allPicked =
        [...session.survivors]
          .every(
            id =>
              session.banPicks
                .has(id)
          );

      if (allPicked) {
        engine.clearTimer(
          session,
          "banned"
        );

        await resolveBanned(
          session
        );
      }

      return true;
    }

    return false;
  }

  async function handleBox(
    interaction
  ) {
    if (
      !interaction
        .isStringSelectMenu() ||
      !interaction.customId
        .startsWith(
          "boxpick:"
        )
    ) {
      return false;
    }

    const session =
      engine.getSession(
        interaction.customId
          .split(":")[1]
      );

    if (
      !session ||
      !session.survivors
        ?.has(
          interaction.user.id
        )
    ) {
      await engine.privateReply(
        interaction,
        "❌ أنت خارج اللعبة."
      );

      return true;
    }

    if (
      session.boxPicks.has(
        interaction.user.id
      )
    ) {
      await engine.privateReply(
        interaction,
        "❌ اخترت صندوقك مسبقًا."
      );

      return true;
    }

    session.boxPicks.set(
      interaction.user.id,
      Number(
        interaction.values[0]
      )
    );

    await engine.privateReply(
      interaction,
      `✅ اخترت صندوق **${interaction.values[0]}** سرًا.`
    );

    const allPicked =
      [...session.survivors]
        .every(
          id =>
            session.boxPicks
              .has(id)
        );

    if (allPicked) {
      engine.clearTimer(
        session,
        "box"
      );

      await resolveBox(
        session
      );
    }

    return true;
  }

  async function handle(
    interaction
  ) {
    if (
      await handleChallenge(
        interaction
      )
    )
      return true;

    if (
      await handleXO(
        interaction
      )
    )
      return true;

    if (
      await handleRPS(
        interaction
      )
    )
      return true;

    if (
      await handleFast(
        interaction
      )
    )
      return true;

    if (
      await handleQuiz(
        interaction
      )
    )
      return true;

    if (
      await handleGuessButton(
        interaction
      )
    )
      return true;

    if (
      await handleModal(
        interaction
      )
    )
      return true;

    if (
      await handleBox(
        interaction
      )
    )
      return true;

    return false;
  }

  return {
    xo:
      interaction =>
        startChallenge(
          interaction,
          "xo"
        ),

    rps:
      interaction =>
        startChallenge(
          interaction,
          "rps"
        ),

    coinout,
    guessnumber,
    highdice,
    fastest,
    quickquiz,
    bannednumber,
    safebox,

    handle
  };
}

module.exports = {
  createPublicGames
};
