const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder
} = require("discord.js");

const WORDS = [
  "بيتزا",
  "مطار",
  "مدرسة",
  "مستشفى",
  "قطار",
  "مطعم",
  "شاطئ",
  "مكتبة",
  "سينما",
  "ملعب",
  "فندق",
  "سوبرماركت",
  "حديقة",
  "جامعة",
  "مقهى",
  "متحف",
  "سفينة",
  "قمر",
  "ثلج",
  "صحراء",
  "تلفزيون",
  "كمبيوتر",
  "سيارة",
  "هاتف",
  "دجاجة",
  "تنين",
  "Minecraft",
  "Discord",
  "قهوة",
  "شوكولاتة"
];

function randomFrom(items) {
  return items[
    Math.floor(
      Math.random() *
      items.length
    )
  ];
}

function createStaffGames(
  engine
) {
  async function elimination(
    interaction
  ) {
    return engine.startLobby(
      interaction,
      "elimination",
      startElimination
    );
  }

  async function startElimination(
    session
  ) {
    session.alive =
      new Set(
        session.players.keys()
      );

    await nextEliminationRound(
      session
    );
  }

  async function nextEliminationRound(
    session,
    extra = ""
  ) {
    if (
      session.alive.size <= 1
    ) {
      const winnerId =
        [...session.alive][0];

      return engine.finish(
        session,
        {
          winnerIds:
            winnerId
              ? [winnerId]
              : [],

          text:
            winnerId
              ? `🏆 انتهت لعبة الإقصاء!\nالفائز: <@${winnerId}>`
              : "❌ انتهت اللعبة بدون فائز.",

          draw:
            !winnerId
        }
      );
    }

    const alive =
      [...session.alive];

    const actor =
      randomFrom(alive);

    session.currentActor =
      actor;

    const targets =
      alive.filter(
        id =>
          id !== actor
      );

    const select =
      new StringSelectMenuBuilder()
        .setCustomId(
          `elimtarget:${session.id}`
        )
        .setPlaceholder(
          "اختر شخصًا لإقصائه"
        )
        .addOptions(
          targets.map(
            id => ({
              label:
                session.players
                  .get(id)
                  ?.username ||
                id,

              value: id
            })
          )
        );

    const randomButton =
      new ButtonBuilder()
        .setCustomId(
          `elimrandom:${session.id}`
        )
        .setLabel(
          "اختيار عشوائي"
        )
        .setEmoji("🎲")
        .setStyle(
          ButtonStyle.Secondary
        );

    await session.message
      .edit({
        content:
          `☠️ **الإقصاء**\n\n` +
          `${extra ? `${extra}\n\n` : ""}` +
          `🎯 الدور على <@${actor}>\n` +
          `لديه **15 ثانية** ليختار شخصًا يقصيه أو يختار العشوائي.\n\n` +
          `👥 الباقون: ${alive.map(id => `<@${id}>`).join(" ")}`,

        components: [
          new ActionRowBuilder()
            .addComponents(
              select
            ),

          new ActionRowBuilder()
            .addComponents(
              randomButton
            )
        ]
      });

    engine.timer(
      session,
      "turn",
      15_000,
      async () => {
        session.alive.delete(
          actor
        );

        await nextEliminationRound(
          session,
          `💀 <@${actor}> تم إقصاؤه لعدم امتلاك العزيمة.`
        );
      }
    );
  }

  async function handleElimination(
    interaction
  ) {
    const isTarget =
      interaction
        .isStringSelectMenu() &&
      interaction.customId
        .startsWith(
          "elimtarget:"
        );

    const isRandom =
      interaction
        .isButton() &&
      interaction.customId
        .startsWith(
          "elimrandom:"
        );

    if (
      !isTarget &&
      !isRandom
    ) {
      return false;
    }

    const sessionId =
      interaction.customId
        .split(":")[1];

    const session =
      engine.getSession(
        sessionId
      );

    if (
      !session ||
      session.gameKey !==
        "elimination"
    ) {
      await engine.privateReply(
        interaction,
        "❌ انتهت هذه الجولة."
      );

      return true;
    }

    if (
      interaction.user.id !==
      session.currentActor
    ) {
      await engine.privateReply(
        interaction,
        "❌ هذا ليس دورك."
      );

      return true;
    }

    engine.clearTimer(
      session,
      "turn"
    );

    if (isTarget) {
      const target =
        interaction.values[0];

      if (
        !session.alive.has(
          target
        ) ||
        target ===
          interaction.user.id
      ) {
        await engine.privateReply(
          interaction,
          "❌ اختيار غير صالح."
        );

        return true;
      }

      session.alive.delete(
        target
      );

      await interaction.deferUpdate();

      await nextEliminationRound(
        session,
        `☠️ <@${interaction.user.id}> أقصى <@${target}>.`
      );

      return true;
    }

    await interaction.deferUpdate();

    const roll =
      Math.random();

    if (roll < 0.03) {
      session.alive.delete(
        interaction.user.id
      );

      await nextEliminationRound(
        session,
        `💀 العشوائي انقلب عليه! <@${interaction.user.id}> أقصى نفسه. **3%**`
      );

      return true;
    }

    if (roll < 0.04) {
      await nextEliminationRound(
        session,
        `⏭️ <@${interaction.user.id}> حصل على Skip! **1%**`
      );

      return true;
    }

    const targets =
      [...session.alive]
        .filter(
          id =>
            id !==
            interaction.user.id
        );

    const target =
      randomFrom(targets);

    session.alive.delete(
      target
    );

    await nextEliminationRound(
      session,
      `🎲 العشوائي اختار <@${target}> وتم إقصاؤه.`
    );

    return true;
  }


  // ======================================================
  // SPY
  // ======================================================

  async function spy(
    interaction
  ) {
    return engine.startLobby(
      interaction,
      "spy",
      startSpy
    );
  }

  async function startSpy(
    session
  ) {
    const playerIds =
      [...session.players.keys()];

    session.spyId =
      randomFrom(
        playerIds
      );

    session.secret =
      randomFrom(
        WORDS
      );

    let dmFailed = false;

    for (
      const [userId]
      of session.players
    ) {
      const member =
        await engine.client.users
          .fetch(userId)
          .catch(() => null);

      if (!member) {
        dmFailed = true;
        continue;
      }

      try {
        if (
          userId ===
          session.spyId
        ) {
          await member.send(
            "🕵️ **أنت الجاسوس.**\nلا تعرف أي معلومة. حاول معرفة الكلمة من كلام اللاعبين."
          );
        } else {
          await member.send(
            `👤 أنت لاعب عادي.\nالكلمة السرية هي: **${session.secret}**\nلا تقلها بشكل مباشر.`
          );
        }
      } catch {
        dmFailed = true;
      }
    }

    if (dmFailed) {
      return engine.finish(
        session,
        {
          draw: true,

          text:
            "❌ تم إلغاء لعبة الجاسوس لأن أحد المشاركين لا يستطيع استقبال الرسائل الخاصة من البوت.\nافتحوا DMs وحاولوا مرة ثانية."
        }
      );
    }

    session.phase =
      "spy-discussion";

    await session.message
      .edit({
        content:
          `🕵️ **الجاسوس**\n\n` +
          `تم إرسال الأدوار والكلمة في الخاص.\n` +
          `الجاسوس لا يعرف أي شيء.\n\n` +
          `💬 لديكم **دقيقتان** للنقاش، وبعدها يبدأ التصويت.`,

        components: []
      });

    engine.timer(
      session,
      "discussion",
      120_000,
      () =>
        beginSpyVote(
          session
        )
    );
  }

  async function beginSpyVote(
    session
  ) {
    session.phase =
      "spy-vote";

    session.votes =
      new Map();

    const select =
      new StringSelectMenuBuilder()
        .setCustomId(
          `spyvote:${session.id}`
        )
        .setPlaceholder(
          "من هو الجاسوس؟"
        )
        .addOptions(
          [...session.players]
            .map(
              ([id, player]) => ({
                label:
                  player.username,
                value: id
              })
            )
        );

    await session.message
      .edit({
        content:
          "🗳️ **وقت التصويت!**\nكل لاعب يصوت مرة واحدة.\nلديكم 60 ثانية.",

        components: [
          new ActionRowBuilder()
            .addComponents(
              select
            )
        ]
      });

    engine.timer(
      session,
      "vote",
      60_000,
      () =>
        resolveSpy(
          session
        )
    );
  }

  async function handleSpyVote(
    interaction
  ) {
    if (
      !interaction
        .isStringSelectMenu() ||
      !interaction.customId
        .startsWith(
          "spyvote:"
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
      session.phase !==
        "spy-vote"
    ) {
      await engine.privateReply(
        interaction,
        "❌ انتهى التصويت."
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
      session.votes.has(
        interaction.user.id
      )
    ) {
      await engine.privateReply(
        interaction,
        "❌ صوتت مسبقًا."
      );

      return true;
    }

    const target =
      interaction.values[0];

    if (
      target ===
      interaction.user.id
    ) {
      await engine.privateReply(
        interaction,
        "❌ لا يمكنك التصويت لنفسك."
      );

      return true;
    }

    session.votes.set(
      interaction.user.id,
      target
    );

    await engine.privateReply(
      interaction,
      `✅ صوتك لـ <@${target}> تم تسجيله.`
    );

    if (
      session.votes.size >=
      session.players.size
    ) {
      engine.clearTimer(
        session,
        "vote"
      );

      await resolveSpy(
        session
      );
    }

    return true;
  }

  async function resolveSpy(
    session
  ) {
    if (
      !engine.getSession(
        session.id
      )
    ) {
      return;
    }

    const totals =
      new Map();

    for (
      const target
      of session.votes.values()
    ) {
      totals.set(
        target,
        (
          totals.get(target) ||
          0
        ) + 1
      );
    }

    let highest = 0;
    let top = [];

    for (
      const [userId, count]
      of totals
    ) {
      if (
        count > highest
      ) {
        highest = count;
        top = [userId];
      } else if (
        count === highest
      ) {
        top.push(userId);
      }
    }

    const spyCaught =
      top.length === 1 &&
      top[0] ===
        session.spyId;

    const winnerIds =
      spyCaught
        ? [...session.players.keys()]
            .filter(
              id =>
                id !==
                session.spyId
            )
        : [session.spyId];

    const voted =
      top.length
        ? top
            .map(
              id =>
                `<@${id}>`
            )
            .join(", ")
        : "لا أحد";

    return engine.finish(
      session,
      {
        winnerIds,

        text:
          `🕵️ انتهت لعبة الجاسوس!\n\n` +
          `الجاسوس كان: <@${session.spyId}>\n` +
          `الكلمة كانت: **${session.secret}**\n` +
          `أعلى تصويت: ${voted}\n\n` +
          (
            spyCaught
              ? "✅ اللاعبون كشفوا الجاسوس!"
              : "🏆 الجاسوس نجا وفاز!"
          )
      }
    );
  }

  async function handle(
    interaction
  ) {
    if (
      await handleElimination(
        interaction
      )
    ) {
      return true;
    }

    if (
      await handleSpyVote(
        interaction
      )
    ) {
      return true;
    }

    return false;
  }

  return {
    elimination,
    spy,
    handle
  };
}

module.exports = {
  createStaffGames
};
