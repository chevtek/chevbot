import dotenv from "dotenv";
dotenv.config();

import http from "http";
import fs from "fs";
import util from "util";
import { MessageAttachment, TextChannel } from "discord.js";
import { createCanvas, registerFont, loadImage } from "canvas";
import moment from "moment";
import parse from "./parse";
import discordClient from "./discord-client";
import config from "./config";
import { initializeDb } from "./db";
import { handler as listChannels } from "./commands/channels";
import sloganChecker from "./utilities/slogan-checker";

const readDir = util.promisify(fs.readdir);

const {
  COMMAND_PREFIX,
  DISCORD_BOT_TAG,
  PORT
} = config;

(async () => {

  await initializeDb();
  console.log("Database initialized.");

  discordClient.on("ready", () => {
    discordClient.user!.setActivity({ name: `for cmds | ${COMMAND_PREFIX}help`, type: "WATCHING" });
    console.log(`Chevbot online [${moment()}]`);
    sloganChecker();
  });

  discordClient.on("guildMemberAdd", async member => {
    try {
      const channel = member.guild.publicUpdatesChannel;
      if (!channel) return;
      registerFont("./fonts/arial.ttf", { family: "sans-serif" });
      const width = 700, height = 250, cornerRadius = 30;
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext('2d');
      ctx.beginPath();
      ctx.moveTo(cornerRadius, 0);
      ctx.lineTo(width - cornerRadius, 0);
      ctx.quadraticCurveTo(width, 0, width, cornerRadius);
      ctx.lineTo(width, height - cornerRadius);
      ctx.quadraticCurveTo(width, height, width - cornerRadius, height);
      ctx.lineTo(cornerRadius, height);
      ctx.quadraticCurveTo(0, height, 0, height - cornerRadius);
      ctx.lineTo(0, cornerRadius);
      ctx.quadraticCurveTo(0, 0, cornerRadius, 0);
      ctx.closePath();
      ctx.clip();
      const bannerDir = "./images/welcome-banners";
      const bannerBackgrounds = await readDir(bannerDir);
      const randomBackground = bannerBackgrounds[Math.floor(Math.random() * bannerBackgrounds.length)];
      const background = await loadImage(`${bannerDir}/${randomBackground}`);
      ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.fillRect(0, 0, width, height);
      ctx.font = "28px Arial";
      ctx.fillStyle = "#ffffff";
      ctx.fillText("Welcome to the server,", canvas.width / 2.5, canvas.height / 2.5);
      let fontSize = 70;
      let text = `${member.displayName}!`;
      let textFits = false;
      while (!textFits && fontSize > 40) {
        ctx.font = `${fontSize -= 10}px Arial`;
        textFits = ctx.measureText(text).width < canvas.width - 300;
      }
      if (fontSize === 40 && !textFits) {
        while (!textFits) {
          text = text.substr(0, text.length - 1);
          textFits = ctx.measureText(text).width < canvas.width - 300;
        }
      }
      ctx.fillStyle = "#00ff00";
      ctx.fillText(text, canvas.width / 2.5, canvas.height / 1.45);
      ctx.beginPath();
      ctx.arc(125, 125, 100, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.clip();
      const avatar = await loadImage(member.user!.displayAvatarURL({ format: "png" }));
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
    } catch (err) {
      console.error(err);
    }
  });


  discordClient.on("message", message => {
    const { content, author } = message;
    // If the author of the message is the bot itself then ignore.
    if (author.tag === DISCORD_BOT_TAG) return;
    // Check if message is a bot command.
    if (content.substr(0, COMMAND_PREFIX!.length) !== COMMAND_PREFIX) return;
    // Parse command.
    parse(content.substr(COMMAND_PREFIX.length), { discord: { message } });
  });

  http.createServer((req, res) => {
    res.writeHead(200);
    res.write("Chevbot is running.\n\n");
    res.write(`COMMAND_PREFIX: ${COMMAND_PREFIX}\n`);
    res.write(`DISCORD_BOT_TAG: ${DISCORD_BOT_TAG}\n`);
    res.end();
  }).listen(PORT || 3000);

})().catch(console.log);