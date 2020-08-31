import { Message } from "discord.js";
import discordClient from "../../discord-client";
import { tables, gameLoop } from "../../utilities/holdem";

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

  try {
    table.startHand();
    if (!table.debug) {
      // Whisper each player their cards.
      message.channel.send("Dealing cards!");
      for (let index = 0; index < table.players.length; index++) {
        const tablePlayer = table.players[index];
        tablePlayer.showCards = true;
        const discordUser = discordClient.users.cache.get(tablePlayer.player.id);
        const tableEmbed = await table.render();
        tableEmbed
          .setTitle("Here's your cards!")
          .setDescription(`This message is related to your Hold'em table in the **#${message.channel.name}** channel in **${message.guild!.name}**.`);
        await discordUser!.send(tableEmbed);
        tablePlayer.showCards = false;
      }
    }
    gameLoop(message);
  } catch (err) {
    await message.reply(err.message);
  }
}
