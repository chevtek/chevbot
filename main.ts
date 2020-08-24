import dotenv from "dotenv";
dotenv.config();

import parse from "./parse";
import discordClient from "./discord-client";
import http from "http";

const {
  COMMAND_PREFIX,
  DISCORD_BOT_TAG,
  PORT
} = process.env;

if (!COMMAND_PREFIX) throw new Error("No bot command prefix found. Please set the COMMAND_PREFIX environment variable.");
if (!DISCORD_BOT_TAG) throw new Error("No Discord bot tag found. Please set the DISCORD_BOT_TAG environment variable to the full Discord username of the bot.");

discordClient.on("message", message => {

  const { content, author } = message;

  // If the author of the message is the bot itself then ignore.
  if (author.tag === DISCORD_BOT_TAG) return;

  // Check if message is a bot command.
  if (content.substr(0, COMMAND_PREFIX.length) !== COMMAND_PREFIX) return;

  parse(content.substr(COMMAND_PREFIX.length), { discord: { message } });

});

const port = PORT || 3000;

http.createServer((req, res) => {
  res.writeHead(200);
  res.write("Chevbot is running.\n\n");
  res.write(`COMMAND_PREFIX: ${COMMAND_PREFIX}\n`);
  res.write(`DISCORD_BOT_TAG: ${DISCORD_BOT_TAG}\n`);
  res.end();
}).listen(port);
