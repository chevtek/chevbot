import { Message } from "discord.js";
import discordClient from "../../discord-client";
import { tables, gameLoop, renderTable } from "../../utilities/holdem";
import fs from "fs";
import util from "util";

const readDir = util.promisify(fs.readdir);

export const command = ["deal", "d", "start", "begin"];

export const description = "Deal the cards!";

export async function handler ({ discord }) {
  const message = discord.message as Message;
  if (message.channel.type === "dm") {
    message.reply("This command can only be run from a channel on a server.");
    return;
  }

  let table = tables[message.channel.id];
  if (!table) {
    message.reply("There is no active Hold'em game in this channel.");
    return;
  }
  if (![table.creatorId, table.dealer?.id].includes(message.author.id)){
    message.reply("Only the current dealer or table creator can deal the cards.")
    return;
  }

  try {
    table.dealCards();
    if (table.voiceConnection) {
      (async () => {
        const dealSoundFiles = await readDir("./sounds/holdem/deal");
        for (let index = 0; index < table.players.length * 2; index++) {
          const randomSound = dealSoundFiles[Math.floor(Math.random() * dealSoundFiles.length)];
          await new Promise((resolve, reject) => {
            table.voiceConnection!.play(`./sounds/holdem/deal/${randomSound}`).on("finish", resolve).on("error", reject);
          });
        }
      })();
    }
    if (!table.debug) {
      // Whisper each player their cards.
      message.channel.send("Dealing cards!");
      for (let index = 0; index < table.players.length; index++) {
        const player = table.players[index];
        player.showCards = true;
        const discordUser = discordClient.users.cache.get(player.id);
        const tableEmbed = await renderTable(table, message);
        tableEmbed
          .setTitle("Here's your cards!")
          .setDescription(`This message is related to your Hold'em table in the **#${message.channel.name}** channel in **${message.guild!.name}**.`);
        await discordUser!.send(tableEmbed);
        player.showCards = false;
      }
    }
    gameLoop(message);
  } catch (err) {
    await message.reply(err.message);
  }
}
