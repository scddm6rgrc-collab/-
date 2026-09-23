const GAMES = [
  {
    key: "elimination",
    defaultAlias: "!اقصاء",
    command: "elimination",
    name: "الإقصاء",
    emoji: "☠️",
    defaultMode: "staff",
    minPlayers: 4,
    maxPlayers: 12
  },
  {
    key: "spy",
    defaultAlias: "!جاسوس",
    command: "spy",
    name: "الجاسوس",
    emoji: "🕵️",
    defaultMode: "staff",
    minPlayers: 4,
    maxPlayers: 10
  },
  {
    key: "xo",
    defaultAlias: "!xo",
    command: "xo",
    name: "XO",
    emoji: "❌",
    defaultMode: "public",
    minPlayers: 2,
    maxPlayers: 2,
    directChallenge: true
  },
  {
    key: "rps",
    defaultAlias: "!حجرة",
    command: "rps",
    name: "حجرة ورقة مقص",
    emoji: "✊",
    defaultMode: "public",
    minPlayers: 2,
    maxPlayers: 2,
    directChallenge: true
  },
  {
    key: "coinout",
    defaultAlias: "!عملة",
    command: "coinout",
    name: "إقصاء العملة",
    emoji: "🪙",
    defaultMode: "public",
    minPlayers: 2,
    maxPlayers: 6
  },
  {
    key: "guessnumber",
    defaultAlias: "!رقم",
    command: "guessnumber",
    name: "تخمين الرقم",
    emoji: "🔢",
    defaultMode: "public",
    minPlayers: 2,
    maxPlayers: 4
  },
  {
    key: "highdice",
    defaultAlias: "!نرد",
    command: "highdice",
    name: "أعلى نرد",
    emoji: "🎲",
    defaultMode: "public",
    minPlayers: 2,
    maxPlayers: 4
  },
  {
    key: "fastest",
    defaultAlias: "!سرعة",
    command: "fastest",
    name: "أسرع زر",
    emoji: "⚡",
    defaultMode: "public",
    minPlayers: 2,
    maxPlayers: 6
  },
  {
    key: "quickquiz",
    defaultAlias: "!سؤال",
    command: "quickquiz",
    name: "سؤال سريع",
    emoji: "🧠",
    defaultMode: "public",
    minPlayers: 2,
    maxPlayers: 4
  },
  {
    key: "bannednumber",
    defaultAlias: "!ممنوع",
    command: "bannednumber",
    name: "الرقم الممنوع",
    emoji: "🎯",
    defaultMode: "public",
    minPlayers: 2,
    maxPlayers: 4
  },
  {
    key: "safebox",
    defaultAlias: "!صندوق",
    command: "safebox",
    name: "الصندوق الآمن",
    emoji: "💣",
    defaultMode: "public",
    minPlayers: 2,
    maxPlayers: 4
  }
];

function getGame(key) {
  return GAMES.find(
    game =>
      game.key === key ||
      game.command === key
  );
}

module.exports = {
  GAMES,
  getGame
};
