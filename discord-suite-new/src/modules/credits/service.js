const fs = require("fs");
const path = require("path");

const MILESTONES = [
  { level: 10, reward: 1 },
  { level: 20, reward: 1 },
  { level: 30, reward: 1 },
  { level: 40, reward: 1 },
  { level: 50, reward: 1 },

  { level: 75, reward: 1 },
  { level: 100, reward: 1 },

  { level: 200, reward: 2 },
  { level: 300, reward: 2 },
  { level: 400, reward: 2 },
  { level: 500, reward: 2 }
];

const LEVEL_REWARD_CAP = 100;

function createCreditsService(file) {
  fs.mkdirSync(
    path.dirname(file),
    { recursive: true }
  );

  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, "{}");
  }

  function read() {
    try {
      return JSON.parse(
        fs.readFileSync(file, "utf8")
      );
    } catch {
      return {};
    }
  }

  function write(data) {
    const temp = `${file}.tmp`;

    fs.writeFileSync(
      temp,
      JSON.stringify(data, null, 2)
    );

    fs.renameSync(
      temp,
      file
    );
  }

  function ensureGuild(data, guildId) {
    if (!data[guildId]) {
      data[guildId] = {
        users: {}
      };
    }

    return data[guildId];
  }

  function ensureUser(
    guild,
    userId,
    username = ""
  ) {
    if (!guild.users[userId]) {
      guild.users[userId] = {
        balance: 0,
        username,
        lastLevel: null,
        claimedMilestones: []
      };
    }

    const user =
      guild.users[userId];

    user.balance =
      Math.max(
        0,
        Number(user.balance || 0)
      );

    if (
      !Array.isArray(
        user.claimedMilestones
      )
    ) {
      user.claimedMilestones = [];
    }

    if (username) {
      user.username = username;
    }

    return user;
  }

  function getUser(
    guildId,
    userId
  ) {
    const data = read();

    return (
      data[guildId]
        ?.users?.[userId] ||
      {
        balance: 0,
        username: "",
        lastLevel: null,
        claimedMilestones: []
      }
    );
  }

  function getBalance(
    guildId,
    userId
  ) {
    return Number(
      getUser(
        guildId,
        userId
      ).balance || 0
    );
  }

  function adjust(
    guildId,
    userId,
    amount,
    username = ""
  ) {
    const data = read();

    const guild =
      ensureGuild(
        data,
        guildId
      );

    const user =
      ensureUser(
        guild,
        userId,
        username
      );

    user.balance =
      Math.max(
        0,
        user.balance +
          Number(amount || 0)
      );

    write(data);

    return user.balance;
  }

  function setBalance(
    guildId,
    userId,
    amount,
    username = ""
  ) {
    const data = read();

    const guild =
      ensureGuild(
        data,
        guildId
      );

    const user =
      ensureUser(
        guild,
        userId,
        username
      );

    user.balance =
      Math.max(
        0,
        Number(amount || 0)
      );

    write(data);

    return user.balance;
  }

  function syncLevelRewards(
    guildId,
    userId,
    currentLevel,
    username = ""
  ) {
    const data = read();

    const guild =
      ensureGuild(
        data,
        guildId
      );

    const user =
      ensureUser(
        guild,
        userId,
        username
      );

    currentLevel =
      Math.max(
        0,
        Number(currentLevel || 0)
      );

    // أول مرة:
    // العضو يبدأ بـ 0 ولا يأخذ Rewards قديمة.
    if (
      user.lastLevel === null ||
      user.lastLevel === undefined
    ) {
      user.lastLevel =
        currentLevel;

      user.claimedMilestones =
        MILESTONES
          .filter(
            item =>
              item.level <=
              currentLevel
          )
          .map(
            item =>
              item.level
          );

      write(data);

      return {
        awarded: 0,
        balance:
          user.balance,
        initialized: true
      };
    }

    let awarded = 0;

    for (
      const milestone
      of MILESTONES
    ) {
      if (
        milestone.level >
        currentLevel
      ) {
        continue;
      }

      if (
        user.claimedMilestones
          .includes(
            milestone.level
          )
      ) {
        continue;
      }

      // نسجل Milestone حتى لو كان فوق 100 Credit
      user.claimedMilestones
        .push(
          milestone.level
        );

      if (
        user.balance >=
        LEVEL_REWARD_CAP
      ) {
        continue;
      }

      const amount =
        Math.min(
          milestone.reward,
          LEVEL_REWARD_CAP -
            user.balance
        );

      user.balance += amount;
      awarded += amount;
    }

    user.lastLevel =
      Math.max(
        Number(
          user.lastLevel || 0
        ),
        currentLevel
      );

    write(data);

    return {
      awarded,
      balance:
        user.balance,
      initialized: false
    };
  }

  function nextMilestone(
    guildId,
    userId,
    currentLevel
  ) {
    const user =
      getUser(
        guildId,
        userId
      );

    return (
      MILESTONES.find(
        item =>
          item.level >
            currentLevel &&
          !user.claimedMilestones
            .includes(
              item.level
            )
      ) || null
    );
  }

  function getTop(
    guildId,
    limit = 10
  ) {
    const data = read();

    const users =
      data[guildId]
        ?.users || {};

    return Object.entries(users)
      .map(
        ([userId, info]) => ({
          userId,
          ...info
        })
      )
      .sort(
        (a, b) =>
          Number(
            b.balance || 0
          ) -
          Number(
            a.balance || 0
          )
      )
      .slice(0, limit);
  }

  return {
    MILESTONES,
    LEVEL_REWARD_CAP,

    getUser,
    getBalance,

    adjust,
    setBalance,

    syncLevelRewards,
    nextMilestone,

    getTop
  };
}

module.exports = {
  createCreditsService
};
