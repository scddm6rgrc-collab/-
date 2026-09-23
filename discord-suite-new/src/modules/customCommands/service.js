function normalizeCommand(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
}

function parseAliases(value) {
  if (Array.isArray(value)) {
    return [
      ...new Set(
        value
          .map(normalizeCommand)
          .filter(Boolean)
      )
    ];
  }

  return [
    ...new Set(
      String(value || "")
        .split(/[,\n]/)
        .map(normalizeCommand)
        .filter(Boolean)
    )
  ];
}

function findCommand(commands, name) {
  const wanted =
    normalizeCommand(name);

  return commands.find(command => {
    if (
      normalizeCommand(
        command.name
      ) === wanted
    ) {
      return true;
    }

    return (
      command.aliases || []
    )
      .map(normalizeCommand)
      .includes(wanted);
  });
}

function renderResponse(
  template,
  message,
  args
) {
  return String(template || "")
    .replaceAll(
      "{user}",
      `<@${message.author.id}>`
    )
    .replaceAll(
      "{username}",
      message.author.username
    )
    .replaceAll(
      "{server}",
      message.guild?.name || ""
    )
    .replaceAll(
      "{channel}",
      `<#${message.channelId}>`
    )
    .replaceAll(
      "{args}",
      args || ""
    );
}

module.exports = {
  normalizeCommand,
  parseAliases,
  findCommand,
  renderResponse
};
