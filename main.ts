import config from "config";
import parse from "./parse";
import discordClient from "./discord-client";

const { commandPrefix, botTag } = config as any;

discordClient.on("message", message => {
  const { content, author } = message;

  // If the author of the message is the bot itself then ignore.
  if (author.tag === botTag) return;

  // Check if message is a bot command.
  if (content.substr(0, commandPrefix.length) !== commandPrefix) return;

  parse(content.substr(commandPrefix.length), { message });
});
