import config from "config";
import parse from "./parse";
import discordClient from "./discord-client";
import http from "http";

const { commandPrefix, botTag } = config as any;

discordClient.on("message", message => {
  const { content, author } = message;

  // If the author of the message is the bot itself then ignore.
  if (author.tag === botTag) return;

  // Check if message is a bot command.
  if (content.substr(0, commandPrefix.length) !== commandPrefix) return;

  parse(content.substr(commandPrefix.length), { discord: { message } });
});

const port = process.env.PORT || 3000;
const host = process.env.WEBSITE_HOSTNAME || "localhost";

http.createServer((req, res) => {
  res.writeHead(200);
  res.write("Chevbot is running.\n");
  res.end();
}).listen(port, () => console.log(`Chevbot running. Check status at http://${host}:${port}`));
