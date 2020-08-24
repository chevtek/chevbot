import dotenv from "dotenv";
dotenv.config();

import http from "http";
import { MessageAttachment } from "discord.js";
import { createCanvas, registerFont, loadImage } from "canvas";
import moment from "moment";
import parse from "./parse";
import discordClient from "./discord-client";
import { handler as listChannels } from "./commands/channels";

const {
  COMMAND_PREFIX,
  DISCORD_BOT_TAG,
  PORT
} = process.env;

if (!COMMAND_PREFIX) throw new Error("No bot command prefix found. Please set the COMMAND_PREFIX environment variable.");
if (!DISCORD_BOT_TAG) throw new Error("No Discord bot tag found. Please set the DISCORD_BOT_TAG environment variable to the full Discord username of the bot.");

discordClient.on("ready", () => {
  discordClient.user?.setActivity({ name: `for cmds | ${COMMAND_PREFIX}help`, type: "WATCHING" });
  console.log(`Chevbot online [${moment()}]`);
});

discordClient.on("guildMemberAdd", async member => {
  const channel = member.guild.channels.cache.find(ch => ch.name === "general") as TextChannel;
	if (!channel) return;
	registerFont("./fonts/arial.ttf", { family: "sans-serif" });
	const canvas = createCanvas(700, 250);
  const ctx = canvas.getContext('2d');
	const background = await loadImage("./wallpaper.jpg");
  ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
  ctx.font = "28px Arial";
	ctx.fillStyle = "#ffffff";
  ctx.fillText("Welcome to the server,", canvas.width / 2.5, canvas.height / 3.5);
  let fontSize = 70;
  const text = `${member.displayName}!`;
	do {
		ctx.font = `${fontSize -= 10}px Arial`;
	} while (ctx.measureText(text).width > canvas.width - 300);
	ctx.fillStyle = "#00ff00";
	ctx.fillText(member.displayName, canvas.width / 2.5, canvas.height / 1.8);
  ctx.beginPath();
  ctx.arc(125, 125, 100, 0, Math.PI * 2, true);
  ctx.strokeStyle = "#00ff00";
  ctx.lineWidth = 3;
  ctx.stroke();
	ctx.closePath();
	ctx.clip();
  const avatar = await loadImage(member.user!.displayAvatarURL({ format: 'jpg' }));
  ctx.drawImage(avatar, 25, 25, 200, 200);
	const attachment = new MessageAttachment(canvas.toBuffer(), "welcome-image.png");
	await channel.send(attachment);
	listChannels({
		discord: {
			message: {
				channel,
				author: member
			}
		}
	});
});

discordClient.on("message", message => {
  const { content, author } = message;
  // If the author of the message is the bot itself then ignore.
  if (author.tag === DISCORD_BOT_TAG) return;
  // Check if message is a bot command.
  if (content.substr(0, COMMAND_PREFIX.length) !== COMMAND_PREFIX) return;
  // Parse command.
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
