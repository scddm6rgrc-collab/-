function normalize(value, caseSensitive = false) {
  const text = String(value || "").trim();
  return caseSensitive ? text : text.toLowerCase();
}

function matches(rule, content) {
  const text = normalize(content, rule.caseSensitive);
  const trigger = normalize(rule.trigger, rule.caseSensitive);

  if (!trigger) return false;

  switch (rule.matchType) {
    case "exact":
      return text === trigger;

    case "startsWith":
      return text.startsWith(trigger);

    case "endsWith":
      return text.endsWith(trigger);

    case "includes":
    default:
      return text.includes(trigger);
  }
}

function renderText(template, message) {
  return String(template || "")
    .replaceAll("{user}", `<@${message.author.id}>`)
    .replaceAll("{username}", message.author.username)
    .replaceAll("{server}", message.guild?.name || "")
    .replaceAll("{channel}", `<#${message.channelId}>`);
}

module.exports = {
  matches,
  renderText
};
